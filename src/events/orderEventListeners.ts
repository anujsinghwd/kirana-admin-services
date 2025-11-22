import { orderEventEmitter, OrderDeliveredPayload } from "./orderEvents";
import {
  updateProductQuantityOnDelivery,
  restoreProductQuantityOnCancellation,
} from "@services/inventory.service";

interface InventoryUpdateResult {
  productId: string;
  variantId?: string;
  success: boolean;
  error?: string;
  quantityDeducted?: number;
}

/**
 * Event listener for order delivered events
 * Automatically updates product inventory when an order is delivered
 */
orderEventEmitter.onDelivered(async (payload: OrderDeliveredPayload) => {
  try {
    console.log(`🎯 [Event] Order delivered event received: ${payload.orderId}`);

    const results = await updateProductQuantityOnDelivery(
      payload.orderId,
      payload.order.items
    );

    const failedUpdates = results.filter((r: InventoryUpdateResult) => !r.success);
    if (failedUpdates.length > 0) {
      console.error(
        `⚠️ [Event] Some inventory updates failed for order ${payload.orderId}:`,
        failedUpdates
      );
    } else {
      console.log(`✅ [Event] All inventory updates successful for order ${payload.orderId}`);
    }
  } catch (error: any) {
    console.error(
      `❌ [Event] Error handling delivered event for order ${payload.orderId}:`,
      error
    );
  }
});

/**
 * Event listener for order cancelled events
 * Restores product inventory when an order is cancelled
 */
orderEventEmitter.onCancelled(async (payload: OrderDeliveredPayload) => {
  try {
    console.log(`🎯 [Event] Order cancelled event received: ${payload.orderId}`);

    const results = await restoreProductQuantityOnCancellation(
      payload.orderId,
      payload.order.items
    );

    const failedUpdates = results.filter((r: InventoryUpdateResult) => !r.success);
    if (failedUpdates.length > 0) {
      console.error(
        `⚠️ [Event] Some inventory restorations failed for order ${payload.orderId}:`,
        failedUpdates
      );
    } else {
      console.log(`✅ [Event] All inventory restorations successful for order ${payload.orderId}`);
    }
  } catch (error: any) {
    console.error(
      `❌ [Event] Error handling cancelled event for order ${payload.orderId}:`,
      error
    );
  }
});

/**
 * Event listener for order rejected events
 * Restores product inventory when an order is rejected
 */
orderEventEmitter.onRejected(async (payload: OrderDeliveredPayload) => {
  try {
    console.log(`🎯 [Event] Order rejected event received: ${payload.orderId}`);

    const results = await restoreProductQuantityOnCancellation(
      payload.orderId,
      payload.order.items
    );

    const failedUpdates = results.filter((r: InventoryUpdateResult) => !r.success);
    if (failedUpdates.length > 0) {
      console.error(
        `⚠️ [Event] Some inventory restorations failed for order ${payload.orderId}:`,
        failedUpdates
      );
    } else {
      console.log(`✅ [Event] All inventory restorations successful for order ${payload.orderId}`);
    }
  } catch (error: any) {
    console.error(
      `❌ [Event] Error handling rejected event for order ${payload.orderId}:`,
      error
    );
  }
});

console.log("✅ [Events] Order event listeners initialized");
