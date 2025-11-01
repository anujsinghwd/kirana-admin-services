import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  price: Joi.number().positive().required(),
  category: Joi.string().required(),
  subcategory: Joi.string(),
  stock: Joi.number().integer().min(0).optional(),
  sku: Joi.string(),
  unit: Joi.string().optional(),
  discount: Joi.string().optional(),
  offerPrice: Joi.string().optional(),
});
