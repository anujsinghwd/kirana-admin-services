// controllers/dashboard.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import OrderModel from "@models/Order";
import ProductModel from "@models/Product";
import CategoryModel from "@models/Category";

/**
 * GET /api/admin/dashboard/stats
 * Optional query:
 *  - from (YYYY-MM-DD)  -> start date (inclusive)
 *  - to (YYYY-MM-DD)    -> end date (inclusive)
 *  - period (e.g. 7, 30) -> last N days
 *  - categoryId
 *  - limit (int) -> number of top products / recent orders (default: 5)
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // parse query params
    const {
      from,
      to,
      period,
      categoryId,
      limit: rawLimit = "5",
    } = req.query as Record<string, string>;

    const limit = Math.max(1, Number(rawLimit) || 5);

    // Build date range
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (period && Number(period) > 0) {
      endDate = new Date();
      // set to end of today
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setDate(endDate.getDate() - Number(period) + 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
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
    const orderMatch: Record<string, any> = {};
    if (startDate || endDate) {
      orderMatch.createdAt = {};
      if (startDate) orderMatch.createdAt.$gte = startDate;
      if (endDate) orderMatch.createdAt.$lte = endDate;
    }

    if (categoryId) {
      // We'll filter orders by item.product_details.category or product.category depending on your schema
      orderMatch["items.product_details.category"] = mongoose.Types.ObjectId.isValid(categoryId)
        ? categoryId
        : categoryId;
      // Note: this assumes product_details.category stores category id; adapt if it stores name.
    }

    /* -------------------------
       1) Basic counts
       ------------------------- */
    const [
      totalProducts,
      totalCategories,
      totalOrdersMatchCount,
    ] = await Promise.all([
      ProductModel.countDocuments({}), // optionally add filter (published: true)
      CategoryModel.countDocuments({}),
      // total orders (within range if provided)
      OrderModel.countDocuments(Object.keys(orderMatch).length ? orderMatch : {}),
    ]);

    /* -------------------------
       2) Total revenue and totals by status
       ------------------------- */
    const orderAggMatch = Object.keys(orderMatch).length ? { $match: orderMatch } : { $match: {} };

    const revenueAndStatus = await OrderModel.aggregate([
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
    const ordersByStatus = await OrderModel.aggregate([
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
    const revenueByDayPipeline: any[] = [
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

    const revenueByDay = await OrderModel.aggregate(revenueByDayPipeline);

    /* -------------------------
       4) Top selling products (by quantity & revenue)
       - unwind items
       ------------------------- */
    const topProductsPipeline: any[] = [
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

    const topProducts = await OrderModel.aggregate(topProductsPipeline);

    /* -------------------------
       5) Products by category
       ------------------------- */
    // If your Product model references category id, aggregate ProductModel
    const productsByCategory = await ProductModel.aggregate([
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
    const lowStockProducts = await ProductModel.aggregate([
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
    const recentOrders = await OrderModel.find(orderMatch)
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
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: err.message || "Failed to fetch dashboard stats",
    });
  }
};
