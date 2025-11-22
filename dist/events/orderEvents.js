"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderEventEmitter = exports.OrderEventType = void 0;
const events_1 = require("../events");
/**
 * Order Event Types
 */
var OrderEventType;
(function (OrderEventType) {
    OrderEventType["STATUS_CHANGED"] = "order:status:changed";
    OrderEventType["DELIVERED"] = "order:delivered";
    OrderEventType["CANCELLED"] = "order:cancelled";
    OrderEventType["REJECTED"] = "order:rejected";
})(OrderEventType || (exports.OrderEventType = OrderEventType = {}));
/**
 * Typed Event Emitter for Order Events
 */
class OrderEventEmitter extends events_1.EventEmitter {
    emitStatusChanged(payload) {
        return this.emit(OrderEventType.STATUS_CHANGED, payload);
    }
    emitDelivered(payload) {
        return this.emit(OrderEventType.DELIVERED, payload);
    }
    emitCancelled(payload) {
        return this.emit(OrderEventType.CANCELLED, payload);
    }
    emitRejected(payload) {
        return this.emit(OrderEventType.REJECTED, payload);
    }
    onStatusChanged(listener) {
        return this.on(OrderEventType.STATUS_CHANGED, listener);
    }
    onDelivered(listener) {
        return this.on(OrderEventType.DELIVERED, listener);
    }
    onCancelled(listener) {
        return this.on(OrderEventType.CANCELLED, listener);
    }
    onRejected(listener) {
        return this.on(OrderEventType.REJECTED, listener);
    }
}
/**
 * Singleton instance of OrderEventEmitter
 */
exports.orderEventEmitter = new OrderEventEmitter();
