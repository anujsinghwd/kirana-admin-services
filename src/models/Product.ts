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

/** ⚖️ Loose Config Interface */
export interface ILooseConfig {
  unitType: "gm" | "kg" | "ml" | "ltr";  // base selling unit
  pricePerUnit: number;                  // price per 1 unit (e.g. ₹50/kg)
  availableQty: number;                  // total available stock in same unit
  minQtyAllowed?: number;                // e.g. 50g or 100ml
  stepQty?: number;                      // step size (50g increments)
}

export interface IProductDTO extends Document {
  name: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  subcategory: mongoose.Types.ObjectId;
  images: string[];
  variants: IProductVariant[];
  published: boolean;
  /** 👇 new fields */
  isLoose?: boolean;
  looseConfig?: ILooseConfig;
}

export interface IProduct extends IProductDTO, Document {}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: "SubCategory", required: true },
    images: [{ type: String, required: true }],

    // ✅ Variant-based products (packaged)
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
        shelfLife: {
          duration: { type: Number, default: null },
          unit: { type: String, enum: ["days", "months", "years"], default: "months" },
          manufacturingDate: { type: Date },
          expiryDate: { type: Date },
          bestBefore: { type: String },
        },
      },
    ],

    // ⚖️ Loose item configuration
    isLoose: { type: Boolean, default: false },
    looseConfig: {
      unitType: { type: String, enum: ["gm", "kg", "ml", "ltr"] },
      pricePerUnit: { type: Number },
      availableQty: { type: Number, default: 0 },
      minQtyAllowed: { type: Number, default: 100 }, // e.g. 100g
      stepQty: { type: Number, default: 50 }, // increments
    },

    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Ensure unique name-category combo
ProductSchema.index({ name: 1, category: 1 }, { unique: true });

// ✅ Validation middleware (prevent both loose + variants)
ProductSchema.pre("save", function (next) {
  const product = this as IProduct;
  if (product.isLoose && product.variants && product.variants.length > 0) {
    return next(
      new Error("Loose items cannot have variant list. Either use variants OR looseConfig.")
    );
  }
  next();
});

export default mongoose.model<IProduct>("Product", ProductSchema);
