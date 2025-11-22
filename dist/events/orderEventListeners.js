"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orderEvents_1 = require("./orderEvents");
const inventory_service_1 = require("../services/inventory.service");
/**
 * Event listener for order delivered events
 * Automatically updates product inventory when an order is delivered
 */
orderEvents_1.orderEventEmitter.onDelivered(async (payload) => {
    try {
        console.log(`🎯 [Event] Order delivered event received: ${payload.orderId}`);
        const results = await (0, inventory_service_1.updateProductQuantityOnDelivery)(payload.orderId, payload.order.items);
        const failedUpdates = results.filter((r) => !r.success);
        if (failedUpdates.length > 0) {
            console.error(`⚠️ [Event] Some inventory updates failed for order ${payload.orderId}:`, failedUpdates);
        }
        else {
            console.log(`✅ [Event] All inventory updates successful for order ${payload.orderId}`);
        }
    }
    catch (error) {
        console.error(`❌ [Event] Error handling delivered event for order ${payload.orderId}:`, error);
    }
});
/**
 * Event listener for order cancelled events
 * Restores product inventory when an order is cancelled
 */
orderEvents_1.orderEventEmitter.onCancelled(async (payload) => {
    try {
        console.log(`🎯 [Event] Order cancelled event received: ${payload.orderId}`);
        const results = await (0, inventory_service_1.restoreProductQuantityOnCancellation)(payload.orderId, payload.order.items);
        const failedUpdates = results.filter((r) => !r.success);
        if (failedUpdates.length > 0) {
            console.error(`⚠️ [Event] Some inventory restorations failed for order ${payload.orderId}:`, failedUpdates);
        }
        else {
            console.log(`✅ [Event] All inventory restorations successful for order ${payload.orderId}`);
        }
    }
    catch (error) {
        console.error(`❌ [Event] Error handling cancelled event for order ${payload.orderId}:`, error);
    }
});
/**
 * Event listener for order rejected events
 * Restores product inventory when an order is rejected
 */
orderEvents_1.orderEventEmitter.onRejected(async (payload) => {
    try {
        console.log(`🎯 [Event] Order rejected event received: ${payload.orderId}`);
        const results = await (0, inventory_service_1.restoreProductQuantityOnCancellation)(payload.orderId, payload.order.items);
        const failedUpdates = results.filter((r) => !r.success);
        if (failedUpdates.length > 0) {
            console.error(`⚠️ [Event] Some inventory restorations failed for order ${payload.orderId}:`, failedUpdates);
        }
        else {
            console.log(`✅ [Event] All inventory restorations successful for order ${payload.orderId}`);
        }
    }
    catch (error) {
        console.error(`❌ [Event] Error handling rejected event for order ${payload.orderId}:`, error);
    }
});
console.log("✅ [Events] Order event listeners initialized");
