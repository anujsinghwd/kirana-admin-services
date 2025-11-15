"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
/* ---------------------------------------------
 * 🔹 Order Item Schema
 * --------------------------------------------- */
const orderItemSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    variantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product.variants",
        default: null,
    },
    isLooseItem: { type: Boolean, default: false },
    looseDetails: {
        unitType: { type: String, enum: ["gm", "kg", "ml", "ltr"], default: null },
        pricePerUnit: { type: Number, default: 0 },
    },
    product_details: {
        name: { type: String, required: true },
        images: [{ type: String }],
        category: { type: String },
        subcategory: { type: String },
    },
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: "" },
    price: { type: Number, required: true },
    subTotal: { type: Number, required: true },
}, { _id: false });
/* ---------------------------------------------
 * 🔹 Tracking Schema
 * --------------------------------------------- */
const trackingSchema = new mongoose_1.Schema({
    status: {
        type: String,
        enum: [
            "Pending",
            "Processing",
            "Packed",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
            "Takeout Ready",
            "Completed",
        ],
        default: "Pending",
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { _id: false });
/* ---------------------------------------------
 * 🔹 Assigned Personnel Schema
 * --------------------------------------------- */
const assignedPersonnelSchema = new mongoose_1.Schema({
    role: {
        type: String,
        enum: ["Delivery", "Picker", "Manager", "Cashier"],
        required: true,
    },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    contact: { type: String },
    assignedAt: { type: Date, default: Date.now },
}, { _id: false });
/* ---------------------------------------------
 * 🔹 Order Schema
 * --------------------------------------------- */
const orderSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    items: {
        type: [orderItemSchema],
        validate: {
            validator: (arr) => arr.length > 0,
            message: "Order must contain at least one product.",
        },
    },
    orderType: {
        type: String,
        enum: ["Delivery", "Takeout"],
        default: "Delivery",
    },
    paymentId: { type: String, default: "" },
    payment_status: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending",
    },
    payment_method: {
        type: String,
        enum: ["COD", "Card", "UPI", "Wallet"],
        default: "COD",
    },
    delivery_address: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Address",
    },
    subTotalAmt: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalAmt: { type: Number, default: 0 },
    invoice_receipt: { type: String, default: "" },
    // CRM / Tracking Fields
    order_status: {
        type: String,
        enum: [
            "Pending",
            "Processing",
            "Packed",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
            "Completed",
            "Takeout Ready",
        ],
        default: "Pending",
    },
    tracking: { type: [trackingSchema], default: [] },
    assigned_personnel: { type: [assignedPersonnelSchema], default: [] },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    reasonForCancellation: { type: String },
}, { timestamps: true });
/* ---------------------------------------------
 * 🔹 Model Export
 * --------------------------------------------- */
const OrderModel = mongoose_1.default.model("Order", orderSchema);
exports.default = OrderModel;
