"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignPersonnelController = exports.updateOrderStatusController = exports.getOrderByIdController = exports.getOrderDetailsController = void 0;
const Order_1 = __importDefault(require("../models/Order"));
/**
 * Allowed statuses - must match OrderModel enums
 */
const ALLOWED_STATUSES = [
    "Pending",
    "Processing",
    "Packed",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Completed",
    "Takeout Ready",
];
/* ---------------------------------------------
 * 🧾 Get All Orders for User
 * --------------------------------------------- */
const getOrderDetailsController = async (req, res) => {
    try {
        // Read filters from query (not params)
        const { status, orderType, q, from, to, page: pageStr = "1", limit: limitStr = "20", } = req.query;
        const page = Math.max(1, parseInt(pageStr || "1", 10));
        const limit = Math.max(1, parseInt(limitStr || "20", 10));
        const skip = (page - 1) * limit;
        // Build base match conditions
        const match = {};
        if (status) {
            match.order_status = status;
        }
        if (orderType) {
            match.orderType = orderType;
        }
        // Date range filter (inclusive)
        if (from || to) {
            match.createdAt = {};
            if (from) {
                const fromDate = new Date(from);
                fromDate.setHours(0, 0, 0, 0);
                match.createdAt.$gte = fromDate;
            }
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                match.createdAt.$lte = toDate;
            }
        }
        // Build aggregation pipeline
        const pipeline = [];
        // initial match (if any filters)
        if (Object.keys(match).length > 0) {
            pipeline.push({ $match: match });
        }
        // Lookup user so we can search by user name / mobile
        pipeline.push({
            $lookup: {
                from: "users", // collection name
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        });
        // unwind user (preserve nulls)
        pipeline.push({
            $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
        });
        // If search query provided, add $match with $or across fields
        if (q && q.trim().length > 0) {
            const regex = new RegExp(q.trim(), "i");
            pipeline.push({
                $match: {
                    $or: [
                        { orderId: { $regex: regex } },
                        { "user.name": { $regex: regex } },
                        { "user.mobile": { $regex: regex } },
                        { "items.product_details.name": { $regex: regex } },
                    ],
                },
            });
        }
        // Count total matching documents (run a count pipeline)
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await Order_1.default.aggregate(countPipeline).exec();
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);
        // Add sort, skip, limit for data fetch
        pipeline.push({ $sort: { createdAt: -1 } });
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });
        // Project only fields needed by frontend (and flatten user fields)
        pipeline.push({
            $project: {
                _id: 1,
                orderId: 1,
                orderType: 1,
                order_status: 1,
                payment_status: 1,
                subTotalAmt: 1,
                totalDiscount: 1,
                totalAmt: 1,
                createdAt: 1,
                tracking: 1,
                delivery_address: 1,
                "user._id": 1,
                "user.name": 1,
                "user.mobile": 1,
                items: 1,
            },
        });
        const orders = await Order_1.default.aggregate(pipeline).exec();
        if (!orders || orders.length === 0) {
            return res.json({
                message: "No orders found",
                success: true,
                data: [],
                pagination: { page, limit, total, totalPages },
                error: false,
            });
        }
        // Format items & orders for the frontend
        const formattedOrders = orders.map((order) => ({
            _id: order._id,
            orderId: order.orderId,
            orderType: order.orderType,
            order_status: order.order_status,
            payment_status: order.payment_status,
            subTotalAmt: order.subTotalAmt,
            totalDiscount: order.totalDiscount,
            totalAmt: order.totalAmt,
            createdAt: order.createdAt,
            tracking: order.tracking,
            delivery_address: order.delivery_address,
            user: order.user ? { _id: order.user._id, name: order.user.name, mobile: order.user.mobile } : null,
            items: (order.items || []).map((item) => ({
                productId: item.productId,
                name: item.product_details?.name,
                image: item.product_details?.images?.[0] ?? null,
                quantity: item.quantity,
                price: item.price,
                subTotal: item.subTotal,
                unit: item.unit,
                isLooseItem: item.isLooseItem,
                variantId: item.variantId ?? null,
            })),
        }));
        return res.status(200).json({
            message: "Orders fetched successfully",
            success: true,
            error: false,
            data: formattedOrders,
            pagination: { page, limit, total, totalPages },
        });
    }
    catch (error) {
        console.error("❌ Error fetching orders:", error);
        return res.status(500).json({
            message: error.message || "Error fetching orders",
            success: false,
            error: true,
        });
    }
};
exports.getOrderDetailsController = getOrderDetailsController;
/* ---------------------------------------------
 * 📦 Get Order by Order ID
 * --------------------------------------------- */
const getOrderByIdController = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({
                message: "Order ID required",
                success: false,
                error: true,
            });
        }
        const order = await Order_1.default.findOne({ orderId })
            // .populate("address")
            .lean();
        if (!order) {
            return res.status(404).json({
                message: "Order not found",
                success: false,
                error: true,
            });
        }
        // ✅ Format for frontend
        const formattedOrder = {
            orderId: order.orderId,
            orderType: order.orderType,
            order_status: order.order_status,
            payment_status: order.payment_status,
            subTotalAmt: order.subTotalAmt,
            totalDiscount: order.totalDiscount,
            totalAmt: order.totalAmt,
            createdAt: order.createdAt,
            tracking: order.tracking,
            delivery_address: order.delivery_address,
            items: order.items.map((item) => ({
                productId: item.productId,
                name: item.product_details.name,
                image: item.product_details.images?.[0],
                quantity: item.quantity,
                price: item.price,
                subTotal: item.subTotal,
                unit: item.unit,
                isLooseItem: item.isLooseItem,
            })),
        };
        return res.status(200).json({
            message: "Order fetched successfully",
            success: true,
            error: false,
            data: formattedOrder,
        });
    }
    catch (error) {
        console.error("❌ Error fetching order:", error);
        return res.status(500).json({
            message: error.message || "Something went wrong while fetching order",
            success: false,
            error: true,
        });
    }
};
exports.getOrderByIdController = getOrderByIdController;
/**
 * Update order status and add tracking entry
 * PUT /api/order/:orderId/status
 * body: { status: OrderStatus, note?: string }
 */
const updateOrderStatusController = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { orderId } = req.params;
        const { status, note } = req.body;
        if (!adminId) {
            return res.status(401).json({ success: false, error: true, message: "Unauthorized" });
        }
        if (!orderId) {
            return res.status(400).json({ success: false, error: true, message: "orderId required" });
        }
        if (!status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: true, message: "Invalid status" });
        }
        // Build tracking entry
        const trackingEntry = {
            status,
            timestamp: new Date(),
            note: note || `${status} by admin`,
            updatedBy: adminId,
        };
        // prepare update
        const update = {
            order_status: status,
            $push: { tracking: trackingEntry },
        };
        if (status === "Delivered" || status === "Completed") {
            update.completedAt = new Date();
        }
        if (status === "Cancelled") {
            update.cancelledAt = new Date();
        }
        const order = await Order_1.default.findOneAndUpdate({ orderId }, update, { new: true }).lean();
        if (!order) {
            return res.status(404).json({ success: false, error: true, message: "Order not found" });
        }
        // Optionally: notify customer (email/push)
        try {
            // await notificationService.notifyOrderStatus(order.userId, order.orderId, status, note);
        }
        catch (notifyErr) {
            // logger.warn("Failed to notify user about status change", notifyErr);
        }
        return res.json({ success: true, error: false, message: "Order status updated", data: order });
    }
    catch (err) {
        // logger.error("updateOrderStatusController error", err);
        return res.status(500).json({ success: false, error: true, message: err.message || "Internal error" });
    }
};
exports.updateOrderStatusController = updateOrderStatusController;
/**
 * Assign (or update) personnel for an order
 * PUT /api/order/:orderId/assign
 * body: { role: "Delivery"|"Picker"|..., userId: string, name: string, contact?: string, replace?: boolean }
 */
const assignPersonnelController = async (req, res) => {
    try {
        const adminId = req.userId;
        const { orderId } = req.params;
        const { role, userId, name, contact, replace } = req.body;
        if (!adminId) {
            return res.status(401).json({ success: false, error: true, message: "Unauthorized" });
        }
        if (!orderId || !role || !userId || !name) {
            return res.status(400).json({ success: false, error: true, message: "role, userId and name are required" });
        }
        // Basic role validation (expand if necessary)
        const allowedRoles = ["Delivery", "Picker", "Manager", "Cashier"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, error: true, message: "Invalid role" });
        }
        const order = await Order_1.default.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, error: true, message: "Order not found" });
        }
        const assigned = {
            role,
            userId: userId,
            name,
            contact: contact || "",
            assignedAt: new Date(),
        };
        // If replace === true, remove existing personnel with same role or userId
        if (replace) {
            order.assigned_personnel = order.assigned_personnel.filter((p) => String(p.userId) !== String(userId) && p.role !== role);
        }
        order.assigned_personnel.push(assigned);
        // also push a tracking entry
        order.tracking.push({
            status: order.order_status,
            timestamp: new Date(),
            note: `Assigned ${role} - ${name} by admin`,
            updatedBy: adminId,
        });
        await order.save();
        // Optional: send notification to assigned user
        try {
            // await notificationService.notifyAssignedPersonnel(userId, order.orderId, role);
        }
        catch (notifyErr) {
            // logger.warn("Failed to notify assigned personnel", notifyErr);
        }
        return res.json({ success: true, error: false, message: "Personnel assigned", data: order });
    }
    catch (err) {
        // logger.error("assignPersonnelController error", err);
        return res.status(500).json({ success: false, error: true, message: err.message || "Internal error" });
    }
};
exports.assignPersonnelController = assignPersonnelController;
