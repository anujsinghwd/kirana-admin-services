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
  price: number;              // Selling price (MRP)
  buyingPrice?: number;       // 🆕 Purchase/cost price
  offerPrice?: number;
  discount?: number;
  stock: number;              // Available stock for sale
  damagedQty?: number;        // 🆕 Damaged inventory count
  sku?: string;
  isReturnable?: boolean;     // 🆕 Can customers return this variant?
  lastPurchaseDate?: Date;    // 🆕 Last restocking date
  shelfLife?: IShelfLife;
}

/** ⚖️ Loose Config Interface */
export interface ILooseConfig {
  unitType: "gm" | "kg" | "ml" | "ltr";  // base selling unit
  pricePerUnit: number;                  // selling price per 1 unit (e.g. ₹50/kg)
  buyingPricePerUnit?: number;           // 🆕 purchase cost per 1 unit
  availableQty: number;                  // total available stock in same unit
  damagedQty?: number;                   // 🆕 damaged loose item quantity
  minQtyAllowed?: number;                // e.g. 50g or 100ml
  stepQty?: number;                      // step size (50g increments)
  isReturnable?: boolean;                // 🆕 can customers return loose items?
  lastPurchaseDate?: Date;               // 🆕 last restocking date
}

export interface IProductName {
  en: string;
  hi: string;
}

export interface IProductDTO extends Document {
  name: IProductName;
  description: IProductName;
  category: mongoose.Types.ObjectId;
  subcategory: mongoose.Types.ObjectId;
  categoryName: IProductName;
  subcategoryName: IProductName;
  keywords: {
    en: string[];
    hi: string[];
  };
  images: string[];
  variants: IProductVariant[];
  published: boolean;
  /** 👇 new fields */
  isLoose?: boolean;
  looseConfig?: ILooseConfig;
}

export interface IProduct extends IProductDTO, Document { }

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      en: { type: String, required: true, trim: true },
      hi: { type: String, required: true, trim: true },
    },
    description: {
      en: { type: String, trim: true },
      hi: { type: String, trim: true },
    },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: "SubCategory", required: true },
    categoryName: {
      en: { type: String, required: true },
      hi: { type: String, required: true },
    },
    subcategoryName: {
      en: { type: String, required: true },
      hi: { type: String, required: true },
    },
    keywords: {
      en: { type: [String], default: [] },
      hi: { type: [String], default: [] },
    },
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
        price: { type: Number, required: true },        // Selling price
        buyingPrice: { type: Number, min: 0 },           // 🆕 Cost price
        offerPrice: { type: Number },
        discount: { type: Number, default: 0 },
        stock: { type: Number, default: 0 },            // Available stock
        damagedQty: { type: Number, default: 0, min: 0 },// 🆕 Damaged stock
        sku: { type: String },
        isReturnable: { type: Boolean, default: true },  // 🆕 Returnable flag
        lastPurchaseDate: { type: Date },                // 🆕 Last purchase
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
      pricePerUnit: { type: Number },                    // Selling price
      buyingPricePerUnit: { type: Number, min: 0 },      // 🆕 Cost price
      availableQty: { type: Number, default: 0 },
      damagedQty: { type: Number, default: 0, min: 0 },  // 🆕 Damaged qty
      minQtyAllowed: { type: Number, default: 100 },     // e.g. 100g
      stepQty: { type: Number, default: 50 },            // increments
      isReturnable: { type: Boolean, default: true },    // 🆕 Returnable
      lastPurchaseDate: { type: Date },                  // 🆕 Last purchase
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

// 🆕 Virtual field for profit margin calculation
ProductSchema.virtual('profitMargins').get(function (this: IProduct) {
  if (this.isLoose && this.looseConfig) {
    const { pricePerUnit, buyingPricePerUnit } = this.looseConfig;
    if (buyingPricePerUnit && buyingPricePerUnit > 0) {
      return {
        type: 'loose',
        margin: ((pricePerUnit - buyingPricePerUnit) / buyingPricePerUnit * 100).toFixed(2),
        marginAmount: (pricePerUnit - buyingPricePerUnit).toFixed(2)
      };
    }
  } else {
    return this.variants.map(v => ({
      unitValue: v.unitValue,
      unitType: v.unitType,
      margin: v.buyingPrice && v.buyingPrice > 0
        ? ((v.price - v.buyingPrice) / v.buyingPrice * 100).toFixed(2)
        : null,
      marginAmount: v.buyingPrice ? (v.price - v.buyingPrice).toFixed(2) : null
    }));
  }
  return null;
});

export default mongoose.model<IProduct>("Product", ProductSchema);
