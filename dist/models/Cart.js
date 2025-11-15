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
const mongoose_1 = __importStar(require("mongoose"));
/** -------------------------------
 * 🧾 Schema
 * ------------------------------- */
const cartProductSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    /** 📦 Variant Info (optional for variant-based products) */
    variantId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        enum: ["gm", "kg", "ml", "ltr"],
        required: function () {
            return this.isLooseItem;
        },
    },
    pricePerUnit: {
        type: Number,
        min: 0,
        required: function () {
            return Boolean(this.isLooseItem);
        },
    },
    totalPrice: {
        type: Number,
        min: 0,
        default: 0,
    },
}, { timestamps: true });
/** -------------------------------
 * 🧠 Index & Pre-save Hooks
 * ------------------------------- */
/** 🔹 Unique constraint (variant or loose product) */
cartProductSchema.index({ userId: 1, productId: 1, variantId: 1, isLooseItem: 1 }, { unique: true });
/** 🔹 Auto-calculate total price for loose items */
cartProductSchema.pre("save", function (next) {
    if (this.isLooseItem && this.pricePerUnit && this.quantity) {
        this.totalPrice = Number((this.pricePerUnit * this.quantity).toFixed(2));
    }
    next();
});
/** -------------------------------
 * 🏷️ Model Export
 * ------------------------------- */
const CartProductModel = mongoose_1.default.model("cartProduct", cartProductSchema);
exports.default = CartProductModel;
