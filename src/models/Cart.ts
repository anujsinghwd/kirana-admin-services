import mongoose, { Schema, Document, Model } from "mongoose";

/** -------------------------------
 * 🧾 Interface
 * ------------------------------- */
export interface ICartProduct extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId; // For variant-based products

  /** ✅ Quantity info */
  quantity: number; // For variants OR loose
  unitType?: "gm" | "kg" | "ml" | "ltr" | "piece" | "packet" | "box"; // For loose items only

  /** ✅ Loose item info */
  isLooseItem?: boolean; // Marks this entry as a loose item
  pricePerUnit?: number; // Price per unit for loose product (e.g. ₹50/kg)
  totalPrice?: number; // Auto-calculated total price (qty * pricePerUnit)

  createdAt?: Date;
  updatedAt?: Date;
}

/** -------------------------------
 * 🧾 Schema
 * ------------------------------- */
const cartProductSchema = new Schema<ICartProduct>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    /** 🧮 Quantity Info */
    quantity: {
      type: Number,
      required: true,
      min: [0.001, "Quantity must be greater than 0"],
    },

    /** 👤 User Info */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /** 📦 Variant Info (optional for variant-based products) */
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Product.variants",
      required: false,
    },

    /** ⚖️ Loose Product Config */
    isLooseItem: {
      type: Boolean,
      default: false,
    },
    unitType: {
      type: String,
      enum: ["gm", "kg", "ml", "ltr", "piece", "packet", "box"],
      required: function (this: ICartProduct) {
        return this.isLooseItem;
      },
    },
    pricePerUnit: {
      type: Number,
      min: 0,
      required: function (this: ICartProduct): boolean {
        return Boolean(this.isLooseItem);
      },
    },
    totalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

/** -------------------------------
 * 🧠 Index & Pre-save Hooks
 * ------------------------------- */

/** 🔹 Unique constraint (variant or loose product) */
cartProductSchema.index(
  { userId: 1, productId: 1, variantId: 1, isLooseItem: 1 },
  { unique: true }
);

/** 🔹 Auto-calculate total price for loose items */
cartProductSchema.pre("save", function (this: ICartProduct, next) {
  if (this.isLooseItem && this.pricePerUnit && this.quantity) {
    this.totalPrice = Number((this.pricePerUnit * this.quantity).toFixed(2));
  }
  next();
});

/** -------------------------------
 * 🏷️ Model Export
 * ------------------------------- */
const CartProductModel: Model<ICartProduct> = mongoose.model<ICartProduct>(
  "cartProduct",
  cartProductSchema
);

export default CartProductModel;
