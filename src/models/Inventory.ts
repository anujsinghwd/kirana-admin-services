import mongoose, { Document, Schema, Model } from "mongoose";

/* ---------------------------------------------
 * 🔹 Purchase Record Interface
 * Tracks every stock purchase/restocking event
 * --------------------------------------------- */
export interface IPurchaseRecord extends Document {
  productId: mongoose.Types.ObjectId;
  variantIndex?: number; // Which variant (if applicable), -1 for loose items
  purchaseDate: Date;
  buyingPrice: number; // Cost per unit
  quantity: number;
  supplier?: string;
  supplierContact?: string;
  invoiceNumber?: string;
  expiryDate?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------------------------------------------
 * 🔹 Inventory Transaction Interface
 * Logs all inventory movements
 * --------------------------------------------- */
export interface IInventoryTransaction extends Document {
  productId: mongoose.Types.ObjectId;
  variantIndex?: number; // Which variant, -1 for loose items
  transactionType: "purchase" | "sale" | "damage" | "return" | "adjustment";
  quantity: number; // Positive for additions, negative for deductions
  date: Date;
  buyingPrice?: number; // Cost price at time of transaction
  sellingPrice?: number; // Sale price (for sales)
  profitAmount?: number; // Calculated: sellingPrice - buyingPrice (per unit)
  orderId?: mongoose.Types.ObjectId; // Link to order if applicable
  reason?: string; // For damages, returns, adjustments
  performedBy?: mongoose.Types.ObjectId; // Admin user who performed the action
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------------------------------------------
 * 🔹 Inventory Status Interface
 * Current snapshot of inventory for a product/variant
 * --------------------------------------------- */
export interface IInventoryStatus extends Document {
  productId: mongoose.Types.ObjectId;
  variantIndex?: number; // Which variant, -1 for loose items
  totalStock: number; // Total physical inventory
  availableStock: number; // Total - damaged - reserved
  damagedStock: number;
  reservedStock: number; // For pending orders
  averageBuyingPrice: number; // Weighted average cost (FIFO)
  lastPurchaseDate?: Date;
  lastPurchasePrice?: number;
  isReturnable: boolean;
  lowStockThreshold?: number; // Alert when stock falls below this
  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------------------------------------------
 * 🔹 Purchase Record Schema
 * --------------------------------------------- */
const purchaseRecordSchema = new Schema<IPurchaseRecord>(
  {
    productId: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

// Compound index for efficient queries
purchaseRecordSchema.index({ productId: 1, purchaseDate: -1 });

/* ---------------------------------------------
 * 🔹 Inventory Transaction Schema
 * --------------------------------------------- */
const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    productId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    reason: { type: String },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// Compound indexes for reporting queries
inventoryTransactionSchema.index({ productId: 1, date: -1 });
inventoryTransactionSchema.index({ transactionType: 1, date: -1 });
inventoryTransactionSchema.index({ orderId: 1 });

/* ---------------------------------------------
 * 🔹 Inventory Status Schema
 * --------------------------------------------- */
const inventoryStatusSchema = new Schema<IInventoryStatus>(
  {
    productId: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

// Unique constraint: one status record per product/variant combination
inventoryStatusSchema.index({ productId: 1, variantIndex: 1 }, { unique: true });

/* ---------------------------------------------
 * 🔹 Model Exports
 * --------------------------------------------- */
export const PurchaseRecordModel: Model<IPurchaseRecord> = mongoose.model<IPurchaseRecord>(
  "PurchaseRecord",
  purchaseRecordSchema
);

export const InventoryTransactionModel: Model<IInventoryTransaction> = mongoose.model<IInventoryTransaction>(
  "InventoryTransaction",
  inventoryTransactionSchema
);

export const InventoryStatusModel: Model<IInventoryStatus> = mongoose.model<IInventoryStatus>(
  "InventoryStatus",
  inventoryStatusSchema
);
