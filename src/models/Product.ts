import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  price: number;
  description: string;
  category: mongoose.Types.ObjectId;
  images: string[];
  stock: number;
  offerPrice?: number;
  sku: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: [{ type: String, required: true }],
    stock: { type: Number, default: 0 },
    offerPrice: { type: Number },
    sku: { type: String, required: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1, category: 1 }, { unique: true });

export default mongoose.model<IProduct>("Product", ProductSchema);
