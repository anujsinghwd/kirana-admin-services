import mongoose, { Schema, Document } from "mongoose";
import { IProduct } from "@models/Product";

export interface IOrderItem {
  product: mongoose.Types.ObjectId | IProduct;
  quantity: number;
  price: number; // capture snapshot
}

export interface IOrder extends Document {
  items: IOrderItem[];
  total: number;
  customerName: string;
  address: string;
  status: "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled";
  createdAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    customerName: { type: String, required: true },
    address: { type: String, required: true },
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
