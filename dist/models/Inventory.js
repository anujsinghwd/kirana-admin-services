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
exports.InventoryStatusModel = exports.InventoryTransactionModel = exports.PurchaseRecordModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/* ---------------------------------------------
 * 🔹 Purchase Record Schema
 * --------------------------------------------- */
const purchaseRecordSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
    },
    variantIndex: {
        type: Number,
        default: -1, // -1 means loose item
    },
    purchaseDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    buyingPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    supplier: { type: String },
    supplierContact: { type: String },
    invoiceNumber: { type: String },
    expiryDate: { type: Date },
    notes: { type: String },
}, { timestamps: true });
// Compound index for efficient queries
purchaseRecordSchema.index({ productId: 1, purchaseDate: -1 });
/* ---------------------------------------------
 * 🔹 Inventory Transaction Schema
 * --------------------------------------------- */
const inventoryTransactionSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
    },
    variantIndex: {
        type: Number,
        default: -1,
    },
    transactionType: {
        type: String,
        enum: ["purchase", "sale", "damage", "return", "adjustment"],
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
        required: true,
    },
    buyingPrice: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    profitAmount: { type: Number },
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Order",
    },
    reason: { type: String },
    performedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "AdminUser",
    },
    notes: { type: String },
}, { timestamps: true });
// Compound indexes for reporting queries
inventoryTransactionSchema.index({ productId: 1, date: -1 });
inventoryTransactionSchema.index({ transactionType: 1, date: -1 });
inventoryTransactionSchema.index({ orderId: 1 });
/* ---------------------------------------------
 * 🔹 Inventory Status Schema
 * --------------------------------------------- */
const inventoryStatusSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
    },
    variantIndex: {
        type: Number,
        default: -1,
    },
    totalStock: {
        type: Number,
        default: 0,
        min: 0,
    },
    availableStock: {
        type: Number,
        default: 0,
        min: 0,
    },
    damagedStock: {
        type: Number,
        default: 0,
        min: 0,
    },
    reservedStock: {
        type: Number,
        default: 0,
        min: 0,
    },
    averageBuyingPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastPurchaseDate: { type: Date },
    lastPurchasePrice: { type: Number, min: 0 },
    isReturnable: {
        type: Boolean,
        default: true,
    },
    lowStockThreshold: {
        type: Number,
        default: 10,
        min: 0,
    },
}, { timestamps: true });
// Unique constraint: one status record per product/variant combination
inventoryStatusSchema.index({ productId: 1, variantIndex: 1 }, { unique: true });
/* ---------------------------------------------
 * 🔹 Model Exports
 * --------------------------------------------- */
exports.PurchaseRecordModel = mongoose_1.default.model("PurchaseRecord", purchaseRecordSchema);
exports.InventoryTransactionModel = mongoose_1.default.model("InventoryTransaction", inventoryTransactionSchema);
exports.InventoryStatusModel = mongoose_1.default.model("InventoryStatus", inventoryStatusSchema);
