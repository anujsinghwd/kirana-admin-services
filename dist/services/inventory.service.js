"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductQuantityOnDelivery = updateProductQuantityOnDelivery;
exports.restoreProductQuantityOnCancellation = restoreProductQuantityOnCancellation;
const Product_1 = __importDefault(require("../models/Product"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Update product quantities when an order is delivered
 * Handles both variant-based products and loose items
 *
 * @param orderId - The order ID for logging purposes
 * @param items - Array of order items to process
 * @returns Array of results for each item update
 */
async function updateProductQuantityOnDelivery(orderId, items) {
    const results = [];
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
            }
            else {
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
        }
        catch (error) {
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
    console.log(`✅ [Inventory] Order ${orderId}: ${successCount} successful, ${failureCount} failed`);
    return results;
}
/**
 * Update loose item quantity using atomic operation
 */
async function updateLooseItemQuantity(productId, quantity) {
    try {
        const product = await Product_1.default.findOneAndUpdate({
            _id: new mongoose_1.default.Types.ObjectId(productId),
            isLoose: true,
            "looseConfig.availableQty": { $gte: quantity }, // Ensure sufficient stock
        }, {
            $inc: { "looseConfig.availableQty": -quantity },
        }, { new: true });
        if (!product) {
            // Check if product exists but has insufficient stock
            const existingProduct = await Product_1.default.findOne({
                _id: new mongoose_1.default.Types.ObjectId(productId),
                isLoose: true,
            });
            if (!existingProduct) {
                console.error(`❌ [Inventory] Loose product ${productId} not found`);
                return { success: false, error: "Product not found" };
            }
            const currentQty = existingProduct.looseConfig?.availableQty || 0;
            console.warn(`⚠️ [Inventory] Insufficient stock for ${productId}. Required: ${quantity}, Available: ${currentQty}`);
            // Still deduct but allow negative stock (log warning)
            await Product_1.default.findByIdAndUpdate(productId, { $inc: { "looseConfig.availableQty": -quantity } });
            return { success: true, error: `Warning: Stock went negative (was ${currentQty})` };
        }
        console.log(`✅ [Inventory] Loose item ${productId}: Deducted ${quantity}, New qty: ${product.looseConfig?.availableQty}`);
        return { success: true };
    }
    catch (error) {
        console.error(`❌ [Inventory] Error updating loose item ${productId}:`, error);
        return { success: false, error: error.message };
    }
}
/**
 * Update variant stock using atomic operation
 * If multiple variants have the same unitType and unitValue,
 * distributes the quantity deduction across them sequentially
 */
async function updateVariantStock(productId, variantId, quantity) {
    try {
        // Find the product and variant
        const product = await Product_1.default.findById(productId);
        if (!product) {
            console.error(`❌ [Inventory] Product ${productId} not found`);
            return { success: false, error: "Product not found" };
        }
        const primaryVariantIndex = product.variants.findIndex((v) => v._id?.toString() === variantId);
        if (primaryVariantIndex === -1) {
            console.error(`❌ [Inventory] Variant ${variantId} not found in product ${productId}`);
            return { success: false, error: "Variant not found" };
        }
        const primaryVariant = product.variants[primaryVariantIndex];
        const { unitType, unitValue } = primaryVariant;
        // Find all variants with the same unitType and unitValue
        const matchingVariants = product.variants
            .map((variant, index) => ({
            variant,
            index,
            id: variant._id?.toString(),
        }))
            .filter((v) => v.variant.unitType === unitType &&
            v.variant.unitValue === unitValue &&
            v.variant.stock > 0 // Only consider variants with available stock
        )
            .sort((a, b) => {
            // Sort: primary variant first, then by stock availability
            if (a.id === variantId)
                return -1;
            if (b.id === variantId)
                return 1;
            return 0;
        });
        if (matchingVariants.length === 0) {
            console.warn(`⚠️ [Inventory] No variants with stock available for ${unitValue}${unitType}`);
            // Still try to deduct from the primary variant (will go negative)
            await Product_1.default.findByIdAndUpdate(productId, { $inc: { [`variants.${primaryVariantIndex}.stock`]: -quantity } });
            return { success: true, error: `Warning: Stock went negative (no stock available)` };
        }
        let remainingQuantity = quantity;
        const deductions = [];
        // Deduct from matching variants sequentially
        for (const { variant, index, id } of matchingVariants) {
            if (remainingQuantity <= 0)
                break;
            const availableStock = variant.stock;
            const toDeduct = Math.min(remainingQuantity, availableStock);
            // Perform atomic deduction
            await Product_1.default.findByIdAndUpdate(productId, { $inc: { [`variants.${index}.stock`]: -toDeduct } });
            deductions.push({
                index,
                id,
                deducted: toDeduct,
                before: availableStock,
                after: availableStock - toDeduct,
            });
            remainingQuantity -= toDeduct;
            console.log(`✅ [Inventory] Variant ${id} (${unitValue}${unitType}): Deducted ${toDeduct}, Stock: ${availableStock} → ${availableStock - toDeduct}`);
        }
        // If there's still remaining quantity, deduct from the primary variant (will go negative)
        if (remainingQuantity > 0) {
            const primaryDeduction = deductions.find(d => d.id === variantId);
            const currentStock = primaryDeduction ? primaryDeduction.after : primaryVariant.stock;
            await Product_1.default.findByIdAndUpdate(productId, { $inc: { [`variants.${primaryVariantIndex}.stock`]: -remainingQuantity } });
            console.warn(`⚠️ [Inventory] Insufficient total stock. Deducted additional ${remainingQuantity} from variant ${variantId} (went negative)`);
            return {
                success: true,
                error: `Warning: Deducted ${quantity} total, but ${remainingQuantity} caused negative stock`
            };
        }
        // Log summary
        const totalDeducted = deductions.reduce((sum, d) => sum + d.deducted, 0);
        console.log(`✅ [Inventory] Successfully distributed ${totalDeducted} units of ${unitValue}${unitType} across ${deductions.length} variant(s)`);
        return { success: true };
    }
    catch (error) {
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
async function restoreProductQuantityOnCancellation(orderId, items) {
    const results = [];
    console.log(`🔄 [Inventory] Restoring ${items.length} items for cancelled order ${orderId}`);
    for (const item of items) {
        try {
            const productId = item.productId.toString();
            const quantity = item.quantity;
            if (item.isLooseItem) {
                // Restore loose item quantity
                const product = await Product_1.default.findByIdAndUpdate(productId, { $inc: { "looseConfig.availableQty": quantity } }, { new: true });
                if (product) {
                    console.log(`✅ [Inventory] Restored loose item ${productId}: +${quantity}, New qty: ${product.looseConfig?.availableQty}`);
                    results.push({ productId, success: true, quantityDeducted: -quantity });
                }
                else {
                    results.push({ productId, success: false, error: "Product not found" });
                }
            }
            else {
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
                const product = await Product_1.default.findById(productId);
                if (!product) {
                    results.push({ productId, variantId, success: false, error: "Product not found" });
                    continue;
                }
                const variantIndex = product.variants.findIndex((v) => v._id?.toString() === variantId);
                if (variantIndex === -1) {
                    results.push({ productId, variantId, success: false, error: "Variant not found" });
                    continue;
                }
                await Product_1.default.findByIdAndUpdate(productId, { $inc: { [`variants.${variantIndex}.stock`]: quantity } });
                console.log(`✅ [Inventory] Restored variant ${variantId}: +${quantity}`);
                results.push({ productId, variantId, success: true, quantityDeducted: -quantity });
            }
        }
        catch (error) {
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
