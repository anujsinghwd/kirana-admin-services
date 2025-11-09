import mongoose, { Schema, Document } from "mongoose";
export interface IShelfLife {
  duration?: number;
  unit?: "days" | "months" | "years";
  manufacturingDate?: Date;
  expiryDate?: Date;
  bestBefore?: string;
}

export interface IProductVariant {
  unitValue: number;
  unitType: string;
  price: number;
  offerPrice?: number;
  discount?: number;
  stock: number;
  sku?: string;
  shelfLife?: IShelfLife;
}

export interface IProductDTO extends Document {
  name: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  subcategory: mongoose.Types.ObjectId;
  images: string[];
  variants: IProductVariant[];
  published: boolean;
}

export interface IProduct extends IProductDTO, Document {}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: "SubCategory", required: true },
    images: [{ type: String, required: true }],

    // ✅ Variants with Shelf Life Info
    variants: [
      {
        unitValue: { type: Number, required: true },
        unitType: {
          type: String,
          enum: ["gm", "kg", "ml", "ltr", "piece", "packet", "box"],
          required: true,
        },
        price: { type: Number, required: true },
        offerPrice: { type: Number },
        discount: { type: Number, default: 0 },
        stock: { type: Number, default: 0 },
        sku: { type: String },

        // ✅ Shelf Life Section
        shelfLife: {
          duration: { type: Number, default: null }, // e.g. 6
          unit: {
            type: String,
            enum: ["days", "months", "years"],
            default: "months",
          },
          manufacturingDate: { type: Date },
          expiryDate: { type: Date },
          bestBefore: { type: String }, // optional textual note
        },
      },
    ],

    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);


ProductSchema.index({ name: 1, category: 1 }, { unique: true });

export default mongoose.model<IProduct>("Product", ProductSchema);
