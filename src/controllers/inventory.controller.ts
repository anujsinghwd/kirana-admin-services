import { Request, Response } from "express";
import { catchAsync } from "@utils/catchAsync";
import { AppError } from "@utils/AppError";
import {
  recordPurchase,
  recordBulkPurchase,
  markAsDamaged,
  processReturn,
  getInventoryStatus,
  getTransactionHistory,
  calculateProfitReport,
} from "@services/inventory.service";
import { PurchaseRecordModel } from "@models/Inventory";

/**
 * Inventory Controller
 * Handles inventory management operations
 */
export class InventoryController {
  /**
   * Record a new purchase/restocking
   * POST /api/inventory/purchase
   */
  static recordPurchase = catchAsync(async (req: Request, res: Response) => {
    const {
      products, // Array of products for bulk purchase
      productId, // Single product (legacy/single mode)
      variantIndex,
      quantity,
      buyingPrice,
      supplier,
      supplierContact,
      invoiceNumber,
      expiryDate,
      notes,
    } = req.body;

    // Get admin user ID from request (assuming auth middleware sets req.user)
    const performedBy = (req as any).user?._id?.toString();

    // Handle bulk purchase
    if (products && Array.isArray(products) && products.length > 0) {
      const result = await recordBulkPurchase({
        items: products.map((p: any) => ({
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
        throw new AppError(result.error || "Failed to record purchases", 400);
      }

      return res.status(201).json({
        success: true,
        message: `Successfully recorded ${result.results.filter((r) => r.success).length} purchases`,
        data: result.results,
      });
    }

    // Handle single purchase (legacy mode)
    const result = await recordPurchase({
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
      throw new AppError(result.error || "Failed to record purchase", 400);
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
  static getPurchaseHistory = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { variantIndex, limit = 50 } = req.query;

    const query: any = { productId };
    if (variantIndex !== undefined) {
      query.variantIndex = parseInt(variantIndex as string);
    }

    const purchases = await PurchaseRecordModel.find(query)
      .sort({ purchaseDate: -1 })
      .limit(parseInt(limit as string))
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
  static markAsDamaged = catchAsync(async (req: Request, res: Response) => {
    const { productId, variantIndex, quantity, reason } = req.body;
    const performedBy = (req as any).user?._id?.toString();

    const result = await markAsDamaged({
      productId,
      variantIndex,
      quantity,
      reason,
      performedBy,
    });

    if (!result.success) {
      throw new AppError(result.error || "Failed to mark as damaged", 400);
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
  static processReturn = catchAsync(async (req: Request, res: Response) => {
    const { productId, variantIndex, quantity, orderId, reason, restockable } = req.body;
    const performedBy = (req as any).user?._id?.toString();

    const result = await processReturn({
      productId,
      variantIndex,
      quantity,
      orderId,
      reason,
      performedBy,
      restockable: restockable !== false, // Default true
    });

    if (!result.success) {
      throw new AppError(result.error || "Failed to process return", 400);
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
  static getInventoryStatus = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { variantIndex } = req.query;

    const status = await getInventoryStatus(
      productId,
      variantIndex ? parseInt(variantIndex as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: status,
    });
  });

  /**
   * Get transaction history
   * GET /api/inventory/transactions
   */
  static getTransactionHistory = catchAsync(async (req: Request, res: Response) => {
    const { productId, transactionType, startDate, endDate, limit } = req.query;

    const filters: any = {};
    if (productId) filters.productId = productId as string;
    if (transactionType) filters.transactionType = transactionType as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);

    const transactions = await getTransactionHistory(filters);

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
  static getProfitReport = catchAsync(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError("Start date and end date are required", 400);
    }

    const report = await calculateProfitReport(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    if (!report) {
      throw new AppError("Failed to generate profit report", 500);
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
  static getAllPurchases = catchAsync(async (req: Request, res: Response) => {
    const { limit = 100, page = 1 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const purchases = await PurchaseRecordModel.find()
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("productId", "name images category")
      .lean();

    const total = await PurchaseRecordModel.countDocuments();

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
}
