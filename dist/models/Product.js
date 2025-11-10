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
const ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: mongoose_1.Schema.Types.ObjectId, ref: "SubCategory", required: true },
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
}, { timestamps: true });
// ✅ Ensure unique name-category combo
ProductSchema.index({ name: 1, category: 1 }, { unique: true });
// ✅ Validation middleware (prevent both loose + variants)
ProductSchema.pre("save", function (next) {
    const product = this;
    if (product.isLoose && product.variants && product.variants.length > 0) {
        return next(new Error("Loose items cannot have variant list. Either use variants OR looseConfig."));
    }
    next();
});
exports.default = mongoose_1.default.model("Product", ProductSchema);
