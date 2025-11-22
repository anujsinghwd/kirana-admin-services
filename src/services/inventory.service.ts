import ProductModel from "@models/Product";
import { IOrderItem } from "@models/Order";
import mongoose from "mongoose";

/**
 * Result interface for inventory update operations
 */
interface InventoryUpdateResult {
  productId: string;
  variantId?: string;
  success: boolean;
  error?: string;
  quantityDeducted?: number;
}

/**
 * Update product quantities when an order is delivered
 * Handles both variant-based products and loose items
 * 
 * @param orderId - The order ID for logging purposes
 * @param items - Array of order items to process
 * @returns Array of results for each item update
 */
export async function updateProductQuantityOnDelivery(
  orderId: string,
  items: IOrderItem[]
): Promise<InventoryUpdateResult[]> {
  const results: InventoryUpdateResult[] = [];

  console.log(`📦 [Inventory] Processing ${items.length} items for order ${orderId}`);

  for (const item of items) {
    try {
      const productId = item.productId.toString();
      const quantity = item.quantity;

      if (item.isLooseItem) {
        // Handle loose items - update looseConfig.availableQty
        const result = await updateLooseItemQuantity(productId, quantity);
        results.push({
          productId,
          success: result.success,
          error: result.error,
          quantityDeducted: quantity,
        });
      } else {
        // Handle variant-based products - update specific variant stock
        if (!item.variantId) {
          console.warn(`⚠️ [Inventory] Item ${productId} is not loose but has no variantId`);
          results.push({
            productId,
            success: false,
            error: "Missing variantId for variant-based product",
          });
          continue;
        }

        const variantId = item.variantId.toString();
        const result = await updateVariantStock(productId, variantId, quantity);
        results.push({
          productId,
          variantId,
          success: result.success,
          error: result.error,
          quantityDeducted: quantity,
        });
      }
    } catch (error: any) {
      console.error(`❌ [Inventory] Error processing item ${item.productId}:`, error);
      results.push({
        productId: item.productId.toString(),
        variantId: item.variantId?.toString(),
        success: false,
        error: error.message || "Unknown error",
      });
    }
  }

  // Log summary
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  console.log(
    `✅ [Inventory] Order ${orderId}: ${successCount} successful, ${failureCount} failed`
  );

  return results;
}

/**
 * Update loose item quantity using atomic operation
 */
async function updateLooseItemQuantity(
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const product = await ProductModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(productId),
        isLoose: true,
        "looseConfig.availableQty": { $gte: quantity }, // Ensure sufficient stock
      },
      {
        $inc: { "looseConfig.availableQty": -quantity },
      },
      { new: true }
    );

    if (!product) {
      // Check if product exists but has insufficient stock
      const existingProduct = await ProductModel.findOne({
        _id: new mongoose.Types.ObjectId(productId),
        isLoose: true,
      });

      if (!existingProduct) {
        console.error(`❌ [Inventory] Loose product ${productId} not found`);
        return { success: false, error: "Product not found" };
      }

      const currentQty = existingProduct.looseConfig?.availableQty || 0;
      console.warn(
        `⚠️ [Inventory] Insufficient stock for ${productId}. Required: ${quantity}, Available: ${currentQty}`
      );
      
      // Still deduct but allow negative stock (log warning)
      await ProductModel.findByIdAndUpdate(
        productId,
        { $inc: { "looseConfig.availableQty": -quantity } }
      );
      
      return { success: true, error: `Warning: Stock went negative (was ${currentQty})` };
    }

    console.log(
      `✅ [Inventory] Loose item ${productId}: Deducted ${quantity}, New qty: ${product.looseConfig?.availableQty}`
    );
    return { success: true };
  } catch (error: any) {
    console.error(`❌ [Inventory] Error updating loose item ${productId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Update variant stock using atomic operation
 * If multiple variants have the same unitType and unitValue, 
 * distributes the quantity deduction across them sequentially
 */
async function updateVariantStock(
  productId: string,
  variantId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the product and variant
    const product = await ProductModel.findById(productId);
    
    if (!product) {
      console.error(`❌ [Inventory] Product ${productId} not found`);
      return { success: false, error: "Product not found" };
    }

    const primaryVariantIndex = product.variants.findIndex(
      (v: any) => v._id?.toString() === variantId
    );

    if (primaryVariantIndex === -1) {
      console.error(`❌ [Inventory] Variant ${variantId} not found in product ${productId}`);
      return { success: false, error: "Variant not found" };
    }

    const primaryVariant = product.variants[primaryVariantIndex];
    const { unitType, unitValue } = primaryVariant;

    // Find all variants with the same unitType and unitValue
    const matchingVariants = product.variants
      .map((variant: any, index: number) => ({
        variant,
        index,
        id: variant._id?.toString(),
      }))
      .filter((v: any) => 
        v.variant.unitType === unitType && 
        v.variant.unitValue === unitValue &&
        v.variant.stock > 0 // Only consider variants with available stock
      )
      .sort((a: any, b: any) => {
        // Sort: primary variant first, then by stock availability
        if (a.id === variantId) return -1;
        if (b.id === variantId) return 1;
        return 0;
      });

    if (matchingVariants.length === 0) {
      console.warn(
        `⚠️ [Inventory] No variants with stock available for ${unitValue}${unitType}`
      );
      // Still try to deduct from the primary variant (will go negative)
      await ProductModel.findByIdAndUpdate(
        productId,
        { $inc: { [`variants.${primaryVariantIndex}.stock`]: -quantity } }
      );
      return { success: true, error: `Warning: Stock went negative (no stock available)` };
    }

    let remainingQuantity = quantity;
    const deductions: Array<{ index: number; id: string; deducted: number; before: number; after: number }> = [];

    // Deduct from matching variants sequentially
    for (const { variant, index, id } of matchingVariants) {
      if (remainingQuantity <= 0) break;

      const availableStock = variant.stock;
      const toDeduct = Math.min(remainingQuantity, availableStock);

      // Perform atomic deduction
      await ProductModel.findByIdAndUpdate(
        productId,
        { $inc: { [`variants.${index}.stock`]: -toDeduct } }
      );

      deductions.push({
        index,
        id,
        deducted: toDeduct,
        before: availableStock,
        after: availableStock - toDeduct,
      });

      remainingQuantity -= toDeduct;

      console.log(
        `✅ [Inventory] Variant ${id} (${unitValue}${unitType}): Deducted ${toDeduct}, Stock: ${availableStock} → ${availableStock - toDeduct}`
      );
    }

    // If there's still remaining quantity, deduct from the primary variant (will go negative)
    if (remainingQuantity > 0) {
      const primaryDeduction = deductions.find(d => d.id === variantId);
      const currentStock = primaryDeduction ? primaryDeduction.after : primaryVariant.stock;
      
      await ProductModel.findByIdAndUpdate(
        productId,
        { $inc: { [`variants.${primaryVariantIndex}.stock`]: -remainingQuantity } }
      );

      console.warn(
        `⚠️ [Inventory] Insufficient total stock. Deducted additional ${remainingQuantity} from variant ${variantId} (went negative)`
      );

      return { 
        success: true, 
        error: `Warning: Deducted ${quantity} total, but ${remainingQuantity} caused negative stock` 
      };
    }

    // Log summary
    const totalDeducted = deductions.reduce((sum, d) => sum + d.deducted, 0);
    console.log(
      `✅ [Inventory] Successfully distributed ${totalDeducted} units of ${unitValue}${unitType} across ${deductions.length} variant(s)`
    );

    return { success: true };
  } catch (error: any) {
    console.error(`❌ [Inventory] Error updating variant ${variantId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore product quantities when an order is cancelled or rejected
 * This is the reverse operation of updateProductQuantityOnDelivery
 * 
 * @param orderId - The order ID for logging purposes
 * @param items - Array of order items to process
 * @returns Array of results for each item update
 */
export async function restoreProductQuantityOnCancellation(
  orderId: string,
  items: IOrderItem[]
): Promise<InventoryUpdateResult[]> {
  const results: InventoryUpdateResult[] = [];

  console.log(`🔄 [Inventory] Restoring ${items.length} items for cancelled order ${orderId}`);

  for (const item of items) {
    try {
      const productId = item.productId.toString();
      const quantity = item.quantity;

      if (item.isLooseItem) {
        // Restore loose item quantity
        const product = await ProductModel.findByIdAndUpdate(
          productId,
          { $inc: { "looseConfig.availableQty": quantity } },
          { new: true }
        );

        if (product) {
          console.log(
            `✅ [Inventory] Restored loose item ${productId}: +${quantity}, New qty: ${product.looseConfig?.availableQty}`
          );
          results.push({ productId, success: true, quantityDeducted: -quantity });
        } else {
          results.push({ productId, success: false, error: "Product not found" });
        }
      } else {
        // Restore variant stock
        if (!item.variantId) {
          results.push({
            productId,
            success: false,
            error: "Missing variantId",
          });
          continue;
        }

        const variantId = item.variantId.toString();
        const product = await ProductModel.findById(productId);
        
        if (!product) {
          results.push({ productId, variantId, success: false, error: "Product not found" });
          continue;
        }

        const variantIndex = product.variants.findIndex(
          (v: any) => v._id?.toString() === variantId
        );

        if (variantIndex === -1) {
          results.push({ productId, variantId, success: false, error: "Variant not found" });
          continue;
        }

        await ProductModel.findByIdAndUpdate(
          productId,
          { $inc: { [`variants.${variantIndex}.stock`]: quantity } }
        );

        console.log(`✅ [Inventory] Restored variant ${variantId}: +${quantity}`);
        results.push({ productId, variantId, success: true, quantityDeducted: -quantity });
      }
    } catch (error: any) {
      console.error(`❌ [Inventory] Error restoring item ${item.productId}:`, error);
      results.push({
        productId: item.productId.toString(),
        variantId: item.variantId?.toString(),
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`✅ [Inventory] Restored ${successCount}/${items.length} items for order ${orderId}`);

  return results;
}

/* =====================================================
 * 🆕 ADVANCED INVENTORY MANAGEMENT FUNCTIONS
 * ===================================================== */

import {
  PurchaseRecordModel,
  InventoryTransactionModel,
  InventoryStatusModel,
  IPurchaseRecord,
  IInventoryTransaction,
} from "@models/Inventory";

/**
 * Record a new purchase/restocking event
 */
export async function recordPurchase(data: {
  productId: string;
  variantIndex?: number; // -1 for loose items
  quantity: number;
  buyingPrice: number;
  supplier?: string;
  supplierContact?: string;
  invoiceNumber?: string;
  expiryDate?: Date;
  notes?: string;
  performedBy?: string; // Admin user ID
}): Promise<{ success: boolean; purchaseRecord?: IPurchaseRecord; error?: string }> {
  try {
    const {
      productId,
      variantIndex = -1,
      quantity,
      buyingPrice,
      supplier,
      supplierContact,
      invoiceNumber,
      expiryDate,
      notes,
      performedBy,
    } = data;

    // Create purchase record
    const purchaseRecord = await PurchaseRecordModel.create({
      productId: new mongoose.Types.ObjectId(productId),
      variantIndex,
      purchaseDate: new Date(),
      buyingPrice,
      quantity,
      supplier,
      supplierContact,
      invoiceNumber,
      expiryDate,
      notes,
    });

    // Update product buying price and last purchase date
    const product = await ProductModel.findById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (variantIndex >= 0 && variantIndex < product.variants.length) {
      // Update variant
      await ProductModel.findByIdAndUpdate(productId, {
        [`variants.${variantIndex}.buyingPrice`]: buyingPrice,
        [`variants.${variantIndex}.lastPurchaseDate`]: new Date(),
        $inc: { [`variants.${variantIndex}.stock`]: quantity },
      });
    } else if (product.isLoose) {
      // Update loose config
      await ProductModel.findByIdAndUpdate(productId, {
        "looseConfig.buyingPricePerUnit": buyingPrice,
        "looseConfig.lastPurchaseDate": new Date(),
        $inc: { "looseConfig.availableQty": quantity },
      });
    }

    // Create inventory transaction
    await createTransaction({
      productId,
      variantIndex,
      transactionType: "purchase",
      quantity,
      buyingPrice,
      performedBy,
      notes: `Purchase: ${supplier || 'Unknown supplier'} - Invoice: ${invoiceNumber || 'N/A'}`,
    });

    // Update inventory status
    await updateInventoryStatus(productId, variantIndex);

    console.log(`✅ [Inventory] Purchase recorded: ${quantity} units @ ${buyingPrice} each`);
    return { success: true, purchaseRecord };
  } catch (error: any) {
    console.error(`❌ [Inventory] Error recording purchase:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Record multiple purchases in a single transaction
 */
export async function recordBulkPurchase(data: {
  items: Array<{
    productId: string;
    variantIndex?: number;
    quantity: number;
    buyingPrice: number;
    expiryDate?: Date;
    notes?: string;
  }>;
  supplier?: string;
  supplierContact?: string;
  invoiceNumber?: string;
  notes?: string; // Root level notes
  performedBy?: string;
}): Promise<{ success: boolean; results: any[]; error?: string }> {
  const { items, supplier, supplierContact, invoiceNumber, notes, performedBy } = data;
  const results = [];
  let successCount = 0;

  console.log(`📦 [Inventory] Processing bulk purchase of ${items.length} items`);

  for (const item of items) {
    // Combine item notes with invoice notes
    const itemNotes = [item.notes, notes].filter(Boolean).join(" | ");

    const result = await recordPurchase({
      ...item,
      notes: itemNotes,
      supplier,
      supplierContact,
      invoiceNumber,
      performedBy,
    });

    if (result.success) {
      successCount++;
    }

    results.push({
      productId: item.productId,
      variantIndex: item.variantIndex,
      success: result.success,
      error: result.error,
      purchaseRecord: result.purchaseRecord,
    });
  }

  console.log(`✅ [Inventory] Bulk purchase completed: ${successCount}/${items.length} successful`);
  
  return {
    success: successCount > 0, // Consider success if at least one item succeeded
    results,
  };
}

/**
 * Create an inventory transaction log
 */
export async function createTransaction(data: {
  productId: string;
  variantIndex?: number;
  transactionType: "purchase" | "sale" | "damage" | "return" | "adjustment";
  quantity: number;
  buyingPrice?: number;
  sellingPrice?: number;
  orderId?: string;
  reason?: string;
  performedBy?: string;
  notes?: string;
}): Promise<{ success: boolean; transaction?: IInventoryTransaction; error?: string }> {
  try {
    const {
      productId,
      variantIndex = -1,
      transactionType,
      quantity,
      buyingPrice,
      sellingPrice,
      orderId,
      reason,
      performedBy,
      notes,
    } = data;

    // Calculate profit if both prices available
    let profitAmount: number | undefined;
    if (buyingPrice && sellingPrice) {
      profitAmount = sellingPrice - buyingPrice;
    }

    const transaction = await InventoryTransactionModel.create({
      productId: new mongoose.Types.ObjectId(productId),
      variantIndex,
      transactionType,
      quantity,
      date: new Date(),
      buyingPrice,
      sellingPrice,
      profitAmount,
      orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
      reason,
      performedBy: performedBy ? new mongoose.Types.ObjectId(performedBy) : undefined,
      notes,
    });

    console.log(`✅ [Inventory] Transaction logged: ${transactionType} - ${quantity} units`);
    return { success: true, transaction };
  } catch (error: any) {
    console.error(`❌ [Inventory] Error creating transaction:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark items as damaged
 */
export async function markAsDamaged(data: {
  productId: string;
  variantIndex?: number;
  quantity: number;
  reason?: string;
  performedBy?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { productId, variantIndex = -1, quantity, reason, performedBy } = data;

    const product = await ProductModel.findById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (variantIndex >= 0 && variantIndex < product.variants.length) {
      // Variant product
      const variant = product.variants[variantIndex];
      
      if (variant.stock < quantity) {
        return { success: false, error: "Insufficient stock to mark as damaged" };
      }

      await ProductModel.findByIdAndUpdate(productId, {
        $inc: {
          [`variants.${variantIndex}.stock`]: -quantity,
          [`variants.${variantIndex}.damagedQty`]: quantity,
        },
      });
    } else if (product.isLoose && product.looseConfig) {
      // Loose product
      if (product.looseConfig.availableQty < quantity) {
        return { success: false, error: "Insufficient stock to mark as damaged" };
      }

      await ProductModel.findByIdAndUpdate(productId, {
        $inc: {
          "looseConfig.availableQty": -quantity,
          "looseConfig.damagedQty": quantity,
        },
      });
    }

    // Create transaction
    await createTransaction({
      productId,
      variantIndex,
      transactionType: "damage",
      quantity: -quantity, // Negative quantity for stock reduction
      reason,
      performedBy,
    });

    // Update inventory status
    await updateInventoryStatus(productId, variantIndex);

    console.log(`✅ [Inventory] Marked ${quantity} units as damaged`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ [Inventory] Error marking as damaged:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Process a product return
 */
export async function processReturn(data: {
  productId: string;
  variantIndex?: number;
  quantity: number;
  orderId?: string;
  reason?: string;
  performedBy?: string;
  restockable?: boolean; // Whether to add back to stock or mark as damaged
}): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      productId,
      variantIndex = -1,
      quantity,
      orderId,
      reason,
      performedBy,
      restockable = true,
    } = data;

    const product = await ProductModel.findById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (variantIndex >= 0 && variantIndex < product.variants.length) {
      // Variant product
      if (restockable) {
        await ProductModel.findByIdAndUpdate(productId, {
          $inc: { [`variants.${variantIndex}.stock`]: quantity },
        });
      } else {
        await ProductModel.findByIdAndUpdate(productId, {
          $inc: { [`variants.${variantIndex}.damagedQty`]: quantity },
        });
      }
    } else if (product.isLoose) {
      // Loose product
      if (restockable) {
        await ProductModel.findByIdAndUpdate(productId, {
          $inc: { "looseConfig.availableQty": quantity },
        });
      } else {
        await ProductModel.findByIdAndUpdate(productId, {
          $inc: { "looseConfig.damagedQty": quantity },
        });
      }
    }

    // Create transaction
    await createTransaction({
      productId,
      variantIndex,
      transactionType: "return",
      quantity,
      orderId,
      reason,
      performedBy,
      notes: restockable ? "Returned and restocked" : "Returned but damaged",
    });

    // Update inventory status
    await updateInventoryStatus(productId, variantIndex);

    console.log(`✅ [Inventory] Processed return: ${quantity} units`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ [Inventory] Error processing return:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Update or create inventory status for a product/variant
 */
async function updateInventoryStatus(
  productId: string,
  variantIndex: number = -1
): Promise<void> {
  try {
    const product = await ProductModel.findById(productId);
    if (!product) return;

    let totalStock = 0;
    let damagedStock = 0;
    let buyingPrice = 0;
    let lastPurchaseDate: Date | undefined;
    let isReturnable = true;

    if (variantIndex >= 0 && variantIndex < product.variants.length) {
      const variant = product.variants[variantIndex];
      totalStock = variant.stock + (variant.damagedQty || 0);
      damagedStock = variant.damagedQty || 0;
      buyingPrice = variant.buyingPrice || 0;
      lastPurchaseDate = variant.lastPurchaseDate;
      isReturnable = variant.isReturnable !== false;
    } else if (product.isLoose && product.looseConfig) {
      totalStock = product.looseConfig.availableQty + (product.looseConfig.damagedQty || 0);
      damagedStock = product.looseConfig.damagedQty || 0;
      buyingPrice = product.looseConfig.buyingPricePerUnit || 0;
      lastPurchaseDate = product.looseConfig.lastPurchaseDate;
      isReturnable = product.looseConfig.isReturnable !== false;
    }

    const availableStock = totalStock - damagedStock;

    // Upsert inventory status
    await InventoryStatusModel.findOneAndUpdate(
      {
        productId: new mongoose.Types.ObjectId(productId),
        variantIndex,
      },
      {
        totalStock,
        availableStock,
        damagedStock,
        reservedStock: 0, // TODO: Implement order reservation
        averageBuyingPrice: buyingPrice,
        lastPurchaseDate,
        lastPurchasePrice: buyingPrice,
        isReturnable,
      },
      { upsert: true, new: true }
    );
  } catch (error: any) {
    console.error(`❌ [Inventory] Error updating inventory status:`, error);
  }
}

/**
 * Get inventory status for a product
 */
export async function getInventoryStatus(
  productId: string,
  variantIndex?: number
): Promise<any> {
  try {
    const query: any = { productId: new mongoose.Types.ObjectId(productId) };
    
    if (variantIndex !== undefined) {
      query.variantIndex = variantIndex;
    }

    const statuses = await InventoryStatusModel.find(query).lean();
    return statuses;
  } catch (error: any) {
    console.error(`❌ [Inventory] Error fetching inventory status:`, error);
    return [];
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(filters: {
  productId?: string;
  transactionType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<any[]> {
  try {
    const query: any = {};

    if (filters.productId) {
      query.productId = new mongoose.Types.ObjectId(filters.productId);
    }
    if (filters.transactionType) {
      query.transactionType = filters.transactionType;
    }
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = filters.startDate;
      if (filters.endDate) query.date.$lte = filters.endDate;
    }

    const transactions = await InventoryTransactionModel.find(query)
      .sort({ date: -1 })
      .limit(filters.limit || 100)
      .populate("productId", "name images")
      .populate("performedBy", "name email")
      .lean();

    return transactions;
  } catch (error: any) {
    console.error(`❌ [Inventory] Error fetching transaction history:`, error);
    return [];
  }
}

/**
 * Calculate profit for a given period
 */
export async function calculateProfitReport(startDate: Date, endDate: Date): Promise<any> {
  try {
    const transactions = await InventoryTransactionModel.find({
      transactionType: "sale",
      date: { $gte: startDate, $lte: endDate },
      profitAmount: { $exists: true, $ne: null },
    }).lean();

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.sellingPrice || 0) * Math.abs(t.quantity), 0);
    const totalCost = transactions.reduce((sum, t) => sum + (t.buyingPrice || 0) * Math.abs(t.quantity), 0);
    const totalProfit = transactions.reduce((sum, t) => sum + (t.profitAmount || 0) * Math.abs(t.quantity), 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      startDate,
      endDate,
      totalRevenue: totalRevenue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      profitMargin: profitMargin.toFixed(2) + "%",
      transactionCount: transactions.length,
    };
  } catch (error: any) {
    console.error(`❌ [Inventory] Error calculating profit report:`, error);
    return null;
  }
}
