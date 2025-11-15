import mongoose, { Document, Schema, Model } from "mongoose";

/* ---------------------------------------------
 * 🔹 Order Item Interface
 * --------------------------------------------- */
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId; // For products with variants
  isLooseItem?: boolean;
  looseDetails?: {
    unitType: string;
    pricePerUnit: number;
  };
  product_details: {
    name: string;
    images: string[];
    category?: string;
    subcategory?: string;
  };
  quantity: number;
  unit?: string; // e.g. "kg", "ltr", etc.
  price: number; // final price per item (after discount if applicable)
  subTotal: number; // price * qty
}

/* ---------------------------------------------
 * 🔹 Order Status & Tracking
 * --------------------------------------------- */
export interface IOrderTracking {
  status: "Pending" | "Processing" | "Packed" | "Out for Delivery" | "Delivered" | "Cancelled" | "Takeout Ready" | "Completed";
  timestamp: Date;
  note?: string;
  updatedBy?: mongoose.Types.ObjectId; // Admin or delivery staff
}

/* ---------------------------------------------
 * 🔹 Assigned Personnel
 * --------------------------------------------- */
export interface IAssignedPersonnel {
  role: "Delivery" | "Picker" | "Manager" | "Cashier";
  userId: mongoose.Types.ObjectId;
  name: string;
  contact?: string;
  assignedAt: Date;
}

/* ---------------------------------------------
 * 🔹 Order Interface
 * --------------------------------------------- */
export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: IOrderItem[];

  orderType: "Delivery" | "Takeout"; // Supports both online delivery & in-store pickup
  paymentId?: string;
  payment_status: "Pending" | "Paid" | "Failed" | "Refunded";
  payment_method?: "COD" | "Card" | "UPI" | "Wallet";

  delivery_address?: mongoose.Types.ObjectId; // Optional for Takeout
  subTotalAmt: number;
  totalDiscount: number;
  totalAmt: number;
  invoice_receipt?: string;

  // CRM Fields
  order_status: "Pending" | "Processing" | "Packed" | "Out for Delivery" | "Delivered" | "Cancelled" | "Completed" | "Takeout Ready";
  tracking: IOrderTracking[];
  assigned_personnel: IAssignedPersonnel[];

  completedAt?: Date;
  cancelledAt?: Date;
  reasonForCancellation?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------------------------------------------
 * 🔹 Order Item Schema
 * --------------------------------------------- */
const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
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
  },
  { _id: false }
);

/* ---------------------------------------------
 * 🔹 Tracking Schema
 * --------------------------------------------- */
const trackingSchema = new Schema<IOrderTracking>(
  {
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
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

/* ---------------------------------------------
 * 🔹 Assigned Personnel Schema
 * --------------------------------------------- */
const assignedPersonnelSchema = new Schema<IAssignedPersonnel>(
  {
    role: {
      type: String,
      enum: ["Delivery", "Picker", "Manager", "Cashier"],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    contact: { type: String },
    assignedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ---------------------------------------------
 * 🔹 Order Schema
 * --------------------------------------------- */
const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
        validator: (arr: IOrderItem[]) => arr.length > 0,
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
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

/* ---------------------------------------------
 * 🔹 Model Export
 * --------------------------------------------- */
const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
