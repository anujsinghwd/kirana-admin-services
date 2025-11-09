import mongoose, { Document, Schema, Model } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  product_details: {
    name: string;
    image: string[];
  };
  quantity: number;
  price: number;
  subTotal: number;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: IOrderItem[];
  paymentId: string;
  payment_status: string;
  delivery_address: mongoose.Types.ObjectId;
  subTotalAmt: number;
  totalAmt: number;
  invoice_receipt: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    product_details: {
      name: { type: String, required: true },
      image: { type: [String], default: [] },
    },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    subTotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: [true, "Provide orderId"],
      unique: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr: IOrderItem[]) => arr.length > 0,
        message: "Order must contain at least one product.",
      },
    },
    paymentId: {
      type: String,
      default: "",
    },
    payment_status: {
      type: String,
      default: "Pending",
    },
    delivery_address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    subTotalAmt: { type: Number, default: 0 },
    totalAmt: { type: Number, default: 0 },
    invoice_receipt: { type: String, default: "" },
  },
  { timestamps: true }
);

const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
