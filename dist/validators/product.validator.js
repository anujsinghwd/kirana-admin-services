"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string().trim().required().messages({
        "string.empty": "Product name is required",
    }),
    description: joi_1.default.string().allow("", null).optional(),
    category: joi_1.default.string().required().messages({
        "string.empty": "Category ID is required",
    }),
    subcategory: joi_1.default.string().allow("", null).optional(),
    images: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    published: joi_1.default.boolean().default(true),
    variants: joi_1.default.array()
        .items(joi_1.default.object({
        unitValue: joi_1.default.number().positive().required().messages({
            "number.base": "Unit value must be a number",
            "number.positive": "Unit value must be greater than 0",
        }),
        unitType: joi_1.default.string()
            .valid("gm", "kg", "ml", "ltr", "piece", "packet", "box")
            .required(),
        price: joi_1.default.number().positive().required().messages({
            "number.base": "Price must be a number",
            "number.positive": "Price must be greater than 0",
        }),
        offerPrice: joi_1.default.number().min(0).optional().messages({
            "number.base": "Offer price must be a number",
        }),
        discount: joi_1.default.number().min(0).max(100).optional().messages({
            "number.base": "Discount must be a number",
            "number.max": "Discount cannot exceed 100%",
        }),
        stock: joi_1.default.number().integer().min(0).default(0),
        sku: joi_1.default.string().trim().allow("", null).optional(),
        shelfLife: joi_1.default.object({
            duration: joi_1.default.number().min(0).optional(),
            unit: joi_1.default.string().valid("days", "months", "years").optional(),
            manufacturingDate: joi_1.default.date().allow("").optional(),
            expiryDate: joi_1.default.date().optional(),
            bestBefore: joi_1.default.string().allow("", null).optional(),
        }).optional(),
    }))
        .min(1)
        .required()
        .messages({
        "array.base": "Variants must be an array",
        "array.min": "At least one product variant is required",
    }),
});
