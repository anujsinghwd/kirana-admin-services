"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const catchAsync_1 = require("../utils/catchAsync");
const AppError_1 = require("../utils/AppError");
const inventory_service_1 = require("../services/inventory.service");
const Inventory_1 = require("../models/Inventory");
/**
 * Inventory Controller
 * Handles inventory management operations
 */
class InventoryController {
}
exports.InventoryController = InventoryController;
_a = InventoryController;
/**
 * Record a new purchase/restocking
 * POST /api/inventory/purchase
 */
InventoryController.recordPurchase = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { products, // Array of products for bulk purchase
    productId, // Single product (legacy/single mode)
    variantIndex, quantity, buyingPrice, supplier, supplierContact, invoiceNumber, expiryDate, notes, } = req.body;
    // Get admin user ID from request (assuming auth middleware sets req.user)
    const performedBy = req.user?._id?.toString();
    // Handle bulk purchase
    if (products && Array.isArray(products) && products.length > 0) {
        const result = await (0, inventory_service_1.recordBulkPurchase)({
            items: products.map((p) => ({
                productId: p.productId,
                variantIndex: p.variantIndex,
                quantity: p.quantity,
                buyingPrice: p.buyingPrice,
                expiryDate: p.expiryDate ? new Date(p.expiryDate) : undefined,
                notes: p.notes,
            })),
            supplier,
            supplierContact,
            invoiceNumber,
            notes, // Pass root level notes
            performedBy,
        });
        if (!result.success) {
            throw new AppError_1.AppError(result.error || "Failed to record purchases", 400);
        }
        return res.status(201).json({
            success: true,
            message: `Successfully recorded ${result.results.filter((r) => r.success).length} purchases`,
            data: result.results,
        });
    }
    // Handle single purchase (legacy mode)
    const result = await (0, inventory_service_1.recordPurchase)({
        productId,
        variantIndex,
        quantity,
        buyingPrice,
        supplier,
        supplierContact,
        invoiceNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        notes,
        performedBy,
    });
    if (!result.success) {
        throw new AppError_1.AppError(result.error || "Failed to record purchase", 400);
    }
    res.status(201).json({
        success: true,
        message: "Purchase recorded successfully",
        data: result.purchaseRecord,
    });
});
/**
 * Get purchase history for a product
 * GET /api/inventory/purchases/:productId
 */
InventoryController.getPurchaseHistory = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { productId } = req.params;
    const { variantIndex, limit = 50 } = req.query;
    const query = { productId };
    if (variantIndex !== undefined) {
        query.variantIndex = parseInt(variantIndex);
    }
    const purchases = await Inventory_1.PurchaseRecordModel.find(query)
        .sort({ purchaseDate: -1 })
        .limit(parseInt(limit))
        .lean();
    res.status(200).json({
        success: true,
        data: purchases,
        count: purchases.length,
    });
});
/**
 * Mark items as damaged
 * POST /api/inventory/damage
 */
InventoryController.markAsDamaged = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { productId, variantIndex, quantity, reason } = req.body;
    const performedBy = req.user?._id?.toString();
    const result = await (0, inventory_service_1.markAsDamaged)({
        productId,
        variantIndex,
        quantity,
        reason,
        performedBy,
    });
    if (!result.success) {
        throw new AppError_1.AppError(result.error || "Failed to mark as damaged", 400);
    }
    res.status(200).json({
        success: true,
        message: `Marked ${quantity} units as damaged`,
    });
});
/**
 * Process a product return
 * POST /api/inventory/return
 */
InventoryController.processReturn = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { productId, variantIndex, quantity, orderId, reason, restockable } = req.body;
    const performedBy = req.user?._id?.toString();
    const result = await (0, inventory_service_1.processReturn)({
        productId,
        variantIndex,
        quantity,
        orderId,
        reason,
        performedBy,
        restockable: restockable !== false, // Default true
    });
    if (!result.success) {
        throw new AppError_1.AppError(result.error || "Failed to process return", 400);
    }
    res.status(200).json({
        success: true,
        message: `Processed return of ${quantity} units`,
    });
});
/**
 * Get inventory status for a product
 * GET /api/inventory/status/:productId
 */
InventoryController.getInventoryStatus = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { productId } = req.params;
    const { variantIndex } = req.query;
    const status = await (0, inventory_service_1.getInventoryStatus)(productId, variantIndex ? parseInt(variantIndex) : undefined);
    res.status(200).json({
        success: true,
        data: status,
    });
});
/**
 * Get transaction history
 * GET /api/inventory/transactions
 */
InventoryController.getTransactionHistory = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { productId, transactionType, startDate, endDate, limit } = req.query;
    const filters = {};
    if (productId)
        filters.productId = productId;
    if (transactionType)
        filters.transactionType = transactionType;
    if (startDate)
        filters.startDate = new Date(startDate);
    if (endDate)
        filters.endDate = new Date(endDate);
    if (limit)
        filters.limit = parseInt(limit);
    const transactions = await (0, inventory_service_1.getTransactionHistory)(filters);
    res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length,
    });
});
/**
 * Get profit report for a date range
 * GET /api/inventory/profit-report
 */
InventoryController.getProfitReport = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        throw new AppError_1.AppError("Start date and end date are required", 400);
    }
    const report = await (0, inventory_service_1.calculateProfitReport)(new Date(startDate), new Date(endDate));
    if (!report) {
        throw new AppError_1.AppError("Failed to generate profit report", 500);
    }
    res.status(200).json({
        success: true,
        data: report,
    });
});
/**
 * Get all purchases (admin overview)
 * GET /api/inventory/purchases
 */
InventoryController.getAllPurchases = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { limit = 100, page = 1 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const purchases = await Inventory_1.PurchaseRecordModel.find()
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("productId", "name images category")
        .lean();
    const total = await Inventory_1.PurchaseRecordModel.countDocuments();
    res.status(200).json({
        success: true,
        data: purchases,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
    });
});
