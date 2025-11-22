"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInventoryReturn = exports.validateInventoryDamage = exports.validateInventoryPurchase = void 0;
const joi_1 = __importDefault(require("joi"));
const AppError_1 = require("../utils/AppError");
/**
 * Validation schema for recording a purchase
 */
/**
 * Schema for a single item in a bulk purchase
 */
const bulkPurchaseItemSchema = joi_1.default.object({
    productId: joi_1.default.string().required().messages({
        "string.empty": "Product ID is required",
        "any.required": "Product ID is required",
    }),
    variantIndex: joi_1.default.number().integer().min(-1).optional().messages({
        "number.base": "Variant index must be a number",
        "number.min": "Variant index must be -1 or greater",
    }),
    quantity: joi_1.default.number().positive().required().messages({
        "number.base": "Quantity must be a number",
        "number.positive": "Quantity must be greater than 0",
        "any.required": "Quantity is required",
    }),
    buyingPrice: joi_1.default.number().positive().required().messages({
        "number.base": "Buying price must be a number",
        "number.positive": "Buying price must be greater than 0",
        "any.required": "Buying price is required",
    }),
    expiryDate: joi_1.default.date().optional(),
    notes: joi_1.default.string().optional().allow(""),
});
/**
 * Schema for bulk purchase request
 */
const bulkPurchaseSchema = joi_1.default.object({
    products: joi_1.default.array().items(bulkPurchaseItemSchema).min(1).required().messages({
        "array.base": "Products must be an array",
        "array.min": "At least one product is required",
        "any.required": "Products array is required",
    }),
    supplier: joi_1.default.string().optional().allow(""),
    supplierContact: joi_1.default.string().optional().allow(""),
    invoiceNumber: joi_1.default.string().optional().allow(""),
    notes: joi_1.default.string().optional().allow(""), // Root level notes
});
/**
 * Schema for legacy single purchase request
 */
const singlePurchaseSchema = joi_1.default.object({
    productId: joi_1.default.string().required().messages({
        "string.empty": "Product ID is required",
        "any.required": "Product ID is required",
    }),
    variantIndex: joi_1.default.number().integer().min(-1).optional().messages({
        "number.base": "Variant index must be a number",
        "number.min": "Variant index must be -1 or greater",
    }),
    quantity: joi_1.default.number().positive().required().messages({
        "number.base": "Quantity must be a number",
        "number.positive": "Quantity must be greater than 0",
        "any.required": "Quantity is required",
    }),
    buyingPrice: joi_1.default.number().positive().required().messages({
        "number.base": "Buying price must be a number",
        "number.positive": "Buying price must be greater than 0",
        "any.required": "Buying price is required",
    }),
    supplier: joi_1.default.string().optional().allow(""),
    supplierContact: joi_1.default.string().optional().allow(""),
    invoiceNumber: joi_1.default.string().optional().allow(""),
    expiryDate: joi_1.default.date().optional(),
    notes: joi_1.default.string().optional().allow(""),
});
/**
 * Combined validation schema for recording a purchase
 * Accepts either a bulk purchase or a single purchase
 */
const purchaseSchema = joi_1.default.alternatives().try(bulkPurchaseSchema, singlePurchaseSchema);
/**
 * Validation schema for marking items as damaged
 */
const damageSchema = joi_1.default.object({
    productId: joi_1.default.string().required().messages({
        "string.empty": "Product ID is required",
        "any.required": "Product ID is required",
    }),
    variantIndex: joi_1.default.number().integer().min(-1).optional().messages({
        "number.base": "Variant index must be a number",
        "number.min": "Variant index must be -1 or greater",
    }),
    quantity: joi_1.default.number().positive().required().messages({
        "number.base": "Quantity must be a number",
        "number.positive": "Quantity must be greater than 0",
        "any.required": "Quantity is required",
    }),
    reason: joi_1.default.string().optional().allow(""),
});
/**
 * Validation schema for processing returns
 */
const returnSchema = joi_1.default.object({
    productId: joi_1.default.string().required().messages({
        "string.empty": "Product ID is required",
        "any.required": "Product ID is required",
    }),
    variantIndex: joi_1.default.number().integer().min(-1).optional().messages({
        "number.base": "Variant index must be a number",
        "number.min": "Variant index must be -1 or greater",
    }),
    quantity: joi_1.default.number().positive().required().messages({
        "number.base": "Quantity must be a number",
        "number.positive": "Quantity must be greater than 0",
        "any.required": "Quantity is required",
    }),
    orderId: joi_1.default.string().optional().allow(""),
    reason: joi_1.default.string().optional().allow(""),
    restockable: joi_1.default.boolean().optional(),
});
/**
 * Middleware to validate purchase requests
 */
const validateInventoryPurchase = (req, res, next) => {
    const { error } = purchaseSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(", ");
        return next(new AppError_1.AppError(errorMessage, 400));
    }
    next();
};
exports.validateInventoryPurchase = validateInventoryPurchase;
/**
 * Middleware to validate damage requests
 */
const validateInventoryDamage = (req, res, next) => {
    const { error } = damageSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(", ");
        return next(new AppError_1.AppError(errorMessage, 400));
    }
    next();
};
exports.validateInventoryDamage = validateInventoryDamage;
/**
 * Middleware to validate return requests
 */
const validateInventoryReturn = (req, res, next) => {
    const { error } = returnSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(", ");
        return next(new AppError_1.AppError(errorMessage, 400));
    }
    next();
};
exports.validateInventoryReturn = validateInventoryReturn;
