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
 */
async function updateVariantStock(productId, variantId, quantity) {
    try {
        // Find the variant index first
        const product = await Product_1.default.findById(productId);
        if (!product) {
            console.error(`❌ [Inventory] Product ${productId} not found`);
            return { success: false, error: "Product not found" };
        }
        const variantIndex = product.variants.findIndex((v) => v._id?.toString() === variantId);
        if (variantIndex === -1) {
            console.error(`❌ [Inventory] Variant ${variantId} not found in product ${productId}`);
            return { success: false, error: "Variant not found" };
        }
        const currentStock = product.variants[variantIndex].stock;
        // Update using atomic operation
        const updatedProduct = await Product_1.default.findOneAndUpdate({
            _id: new mongoose_1.default.Types.ObjectId(productId),
            [`variants.${variantIndex}.stock`]: { $gte: quantity },
        }, {
            $inc: { [`variants.${variantIndex}.stock`]: -quantity },
        }, { new: true });
        if (!updatedProduct) {
            console.warn(`⚠️ [Inventory] Insufficient stock for variant ${variantId}. Required: ${quantity}, Available: ${currentStock}`);
            // Still deduct but allow negative stock (log warning)
            await Product_1.default.findByIdAndUpdate(productId, { $inc: { [`variants.${variantIndex}.stock`]: -quantity } });
            return { success: true, error: `Warning: Stock went negative (was ${currentStock})` };
        }
        const newStock = updatedProduct.variants[variantIndex].stock;
        console.log(`✅ [Inventory] Variant ${variantId}: Deducted ${quantity}, New stock: ${newStock}`);
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
