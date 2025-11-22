import Joi from "joi";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@utils/AppError";

/**
 * Validation schema for recording a purchase
 */
/**
 * Schema for a single item in a bulk purchase
 */
const bulkPurchaseItemSchema = Joi.object({
  productId: Joi.string().required().messages({
    "string.empty": "Product ID is required",
    "any.required": "Product ID is required",
  }),
  variantIndex: Joi.number().integer().min(-1).optional().messages({
    "number.base": "Variant index must be a number",
    "number.min": "Variant index must be -1 or greater",
  }),
  quantity: Joi.number().positive().required().messages({
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be greater than 0",
    "any.required": "Quantity is required",
  }),
  buyingPrice: Joi.number().positive().required().messages({
    "number.base": "Buying price must be a number",
    "number.positive": "Buying price must be greater than 0",
    "any.required": "Buying price is required",
  }),
  expiryDate: Joi.date().optional(),
  notes: Joi.string().optional().allow(""),
});

/**
 * Schema for bulk purchase request
 */
const bulkPurchaseSchema = Joi.object({
  products: Joi.array().items(bulkPurchaseItemSchema).min(1).required().messages({
    "array.base": "Products must be an array",
    "array.min": "At least one product is required",
    "any.required": "Products array is required",
  }),
  supplier: Joi.string().optional().allow(""),
  supplierContact: Joi.string().optional().allow(""),
  invoiceNumber: Joi.string().optional().allow(""),
  notes: Joi.string().optional().allow(""), // Root level notes
});

/**
 * Schema for legacy single purchase request
 */
const singlePurchaseSchema = Joi.object({
  productId: Joi.string().required().messages({
    "string.empty": "Product ID is required",
    "any.required": "Product ID is required",
  }),
  variantIndex: Joi.number().integer().min(-1).optional().messages({
    "number.base": "Variant index must be a number",
    "number.min": "Variant index must be -1 or greater",
  }),
  quantity: Joi.number().positive().required().messages({
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be greater than 0",
    "any.required": "Quantity is required",
  }),
  buyingPrice: Joi.number().positive().required().messages({
    "number.base": "Buying price must be a number",
    "number.positive": "Buying price must be greater than 0",
    "any.required": "Buying price is required",
  }),
  supplier: Joi.string().optional().allow(""),
  supplierContact: Joi.string().optional().allow(""),
  invoiceNumber: Joi.string().optional().allow(""),
  expiryDate: Joi.date().optional(),
  notes: Joi.string().optional().allow(""),
});

/**
 * Combined validation schema for recording a purchase
 * Accepts either a bulk purchase or a single purchase
 */
const purchaseSchema = Joi.alternatives().try(bulkPurchaseSchema, singlePurchaseSchema);

/**
 * Validation schema for marking items as damaged
 */
const damageSchema = Joi.object({
  productId: Joi.string().required().messages({
    "string.empty": "Product ID is required",
    "any.required": "Product ID is required",
  }),
  variantIndex: Joi.number().integer().min(-1).optional().messages({
    "number.base": "Variant index must be a number",
    "number.min": "Variant index must be -1 or greater",
  }),
  quantity: Joi.number().positive().required().messages({
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be greater than 0",
    "any.required": "Quantity is required",
  }),
  reason: Joi.string().optional().allow(""),
});

/**
 * Validation schema for processing returns
 */
const returnSchema = Joi.object({
  productId: Joi.string().required().messages({
    "string.empty": "Product ID is required",
    "any.required": "Product ID is required",
  }),
  variantIndex: Joi.number().integer().min(-1).optional().messages({
    "number.base": "Variant index must be a number",
    "number.min": "Variant index must be -1 or greater",
  }),
  quantity: Joi.number().positive().required().messages({
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be greater than 0",
    "any.required": "Quantity is required",
  }),
  orderId: Joi.string().optional().allow(""),
  reason: Joi.string().optional().allow(""),
  restockable: Joi.boolean().optional(),
});

/**
 * Middleware to validate purchase requests
 */
export const validateInventoryPurchase = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = purchaseSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(", ");
    return next(new AppError(errorMessage, 400));
  }

  next();
};

/**
 * Middleware to validate damage requests
 */
export const validateInventoryDamage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = damageSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(", ");
    return next(new AppError(errorMessage, 400));
  }

  next();
};

/**
 * Middleware to validate return requests
 */
export const validateInventoryReturn = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = returnSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(", ");
    return next(new AppError(errorMessage, 400));
  }

  next();
};
