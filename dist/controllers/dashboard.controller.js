"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
/**
 * GET /api/admin/dashboard/stats
 * Optional query:
 *  - from (YYYY-MM-DD)  -> start date (inclusive)
 *  - to (YYYY-MM-DD)    -> end date (inclusive)
 *  - period (e.g. 7, 30) -> last N days
 *  - categoryId
 *  - limit (int) -> number of top products / recent orders (default: 5)
 */
const getDashboardStats = async (req, res) => {
    try {
        // parse query params
        const { from, to, period, categoryId, limit: rawLimit = "5", } = req.query;
        const limit = Math.max(1, Number(rawLimit) || 5);
        // Build date range
        let startDate = null;
        let endDate = null;
        if (period && Number(period) > 0) {
            endDate = new Date();
            // set to end of today
            endDate.setHours(23, 59, 59, 999);
            startDate = new Date();
            startDate.setDate(endDate.getDate() - Number(period) + 1);
            startDate.setHours(0, 0, 0, 0);
        }
        else {
            if (from) {
                startDate = new Date(from);
                startDate.setHours(0, 0, 0, 0);
            }
            if (to) {
                endDate = new Date(to);
                endDate.setHours(23, 59, 59, 999);
            }
        }
        // Build match stage for orders in the date range
        const orderMatch = {};
        if (startDate || endDate) {
            orderMatch.createdAt = {};
            if (startDate)
                orderMatch.createdAt.$gte = startDate;
            if (endDate)
                orderMatch.createdAt.$lte = endDate;
        }
        if (categoryId) {
            // We'll filter orders by item.product_details.category or product.category depending on your schema
            orderMatch["items.product_details.category"] = mongoose_1.default.Types.ObjectId.isValid(categoryId)
                ? categoryId
                : categoryId;
            // Note: this assumes product_details.category stores category id; adapt if it stores name.
        }
        /* -------------------------
           1) Basic counts
           ------------------------- */
        const [totalProducts, totalCategories, totalOrdersMatchCount,] = await Promise.all([
            Product_1.default.countDocuments({}), // optionally add filter (published: true)
            Category_1.default.countDocuments({}),
            // total orders (within range if provided)
            Order_1.default.countDocuments(Object.keys(orderMatch).length ? orderMatch : {}),
        ]);
        /* -------------------------
           2) Total revenue and totals by status
           ------------------------- */
        const orderAggMatch = Object.keys(orderMatch).length ? { $match: orderMatch } : { $match: {} };
        const revenueAndStatus = await Order_1.default.aggregate([
            orderAggMatch,
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $ifNull: ["$totalAmt", 0] } },
                    totalDiscount: { $sum: { $ifNull: ["$totalDiscount", 0] } },
                    totalSubTotal: { $sum: { $ifNull: ["$subTotalAmt", 0] } },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: 1,
                    totalDiscount: 1,
                    totalSubTotal: 1,
                    count: 1,
                },
            },
        ]);
        const revenueSummary = revenueAndStatus[0] || {
            totalRevenue: 0,
            totalDiscount: 0,
            totalSubTotal: 0,
            count: 0,
        };
        // orders by status
        const ordersByStatus = await Order_1.default.aggregate([
            orderAggMatch,
            {
                $group: {
                    _id: "$order_status",
                    count: { $sum: 1 },
                },
            },
            { $project: { status: "$_id", count: 1, _id: 0 } },
        ]);
        /* -------------------------
           3) Time series revenue (group by day)
           ------------------------- */
        const revenueByDayPipeline = [
            orderAggMatch,
            {
                $project: {
                    createdAt: 1,
                    totalAmt: 1,
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    revenue: { $sum: { $ifNull: ["$totalAmt", 0] } },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ];
        const revenueByDay = await Order_1.default.aggregate(revenueByDayPipeline);
        /* -------------------------
           4) Top selling products (by quantity & revenue)
           - unwind items
           ------------------------- */
        const topProductsPipeline = [
            orderAggMatch,
            { $unwind: "$items" },
            // optionally join product details: we assume items.product_details contains name/images
            {
                $group: {
                    _id: "$items.productId",
                    name: { $first: "$items.product_details.name" },
                    image: { $first: { $arrayElemAt: ["$items.product_details.images", 0] } },
                    quantitySold: { $sum: "$items.quantity" },
                    revenue: { $sum: "$items.subTotal" },
                },
            },
            { $sort: { quantitySold: -1 } },
            { $limit: limit },
        ];
        const topProducts = await Order_1.default.aggregate(topProductsPipeline);
        /* -------------------------
           5) Products by category
           ------------------------- */
        // If your Product model references category id, aggregate ProductModel
        const productsByCategory = await Product_1.default.aggregate([
            {
                $group: {
                    _id: "$category", // category id or name depending on your schema
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category",
                },
            },
            {
                $unwind: {
                    path: "$category",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 0,
                    categoryId: "$_id",
                    categoryName: "$category.name",
                    count: 1,
                },
            },
            { $sort: { count: -1 } },
            { $limit: 20 },
        ]);
        /* -------------------------
           6) Low stock products
           ------------------------- */
        // This assumes your Product schema has variants and stock on variant or product.stock
        // We'll search both product-level stock and variant-level stock.
        const lowStockThreshold = 5;
        const lowStockProducts = await Product_1.default.aggregate([
            // Project totalStock from either product.stock or sum(variants.stock)
            {
                $project: {
                    name: 1,
                    images: 1,
                    stock: 1,
                    variants: 1,
                    totalStock: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
                            { $sum: "$variants.stock" },
                            { $ifNull: ["$stock", 0] },
                        ],
                    },
                },
            },
            { $match: { totalStock: { $lte: lowStockThreshold } } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    images: 1,
                    totalStock: 1,
                },
            },
            { $sort: { totalStock: 1 } },
            { $limit: 20 },
        ]);
        /* -------------------------
           7) Recent orders (latest)
           ------------------------- */
        const recentOrders = await Order_1.default.find(orderMatch)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("orderId totalAmt order_status createdAt userId items")
            .lean();
        /* -------------------------
           Final response
           ------------------------- */
        return res.json({
            success: true,
            error: false,
            data: {
                totals: {
                    totalProducts,
                    totalCategories,
                    totalOrders: totalOrdersMatchCount,
                },
                revenueSummary,
                ordersByStatus,
                revenueByDay,
                topProducts,
                productsByCategory,
                lowStockProducts,
                recentOrders,
            },
        });
    }
    catch (err) {
        console.error("Dashboard stats error:", err);
        return res.status(500).json({
            success: false,
            error: true,
            message: err.message || "Failed to fetch dashboard stats",
        });
    }
};
exports.getDashboardStats = getDashboardStats;
