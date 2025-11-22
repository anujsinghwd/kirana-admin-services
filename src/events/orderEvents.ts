import { EventEmitter } from "node:events";
import { IOrder } from "@models/Order";

/**
 * Event payload interfaces for type safety
 */
export interface OrderStatusChangedPayload {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  order: IOrder;
  timestamp: Date;
}

export interface OrderDeliveredPayload {
  orderId: string;
  order: IOrder;
  timestamp: Date;
}

/**
 * Order Event Types
 */
export enum OrderEventType {
  STATUS_CHANGED = "order:status:changed",
  DELIVERED = "order:delivered",
  CANCELLED = "order:cancelled",
  REJECTED = "order:rejected",
}

/**
 * Typed Event Emitter for Order Events
 */
class OrderEventEmitter extends EventEmitter {
  emitStatusChanged(payload: OrderStatusChangedPayload): boolean {
    return this.emit(OrderEventType.STATUS_CHANGED, payload);
  }

  emitDelivered(payload: OrderDeliveredPayload): boolean {
    return this.emit(OrderEventType.DELIVERED, payload);
  }

  emitCancelled(payload: OrderDeliveredPayload): boolean {
    return this.emit(OrderEventType.CANCELLED, payload);
  }

  emitRejected(payload: OrderDeliveredPayload): boolean {
    return this.emit(OrderEventType.REJECTED, payload);
  }

  onStatusChanged(listener: (payload: OrderStatusChangedPayload) => void): this {
    return this.on(OrderEventType.STATUS_CHANGED, listener);
  }

  onDelivered(listener: (payload: OrderDeliveredPayload) => void): this {
    return this.on(OrderEventType.DELIVERED, listener);
  }

  onCancelled(listener: (payload: OrderDeliveredPayload) => void): this {
    return this.on(OrderEventType.CANCELLED, listener);
  }

  onRejected(listener: (payload: OrderDeliveredPayload) => void): this {
    return this.on(OrderEventType.REJECTED, listener);
  }
}

/**
 * Singleton instance of OrderEventEmitter
 */
export const orderEventEmitter = new OrderEventEmitter();
