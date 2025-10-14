import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  price: Joi.number().positive().required(),
  category: Joi.string().required(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  stock: Joi.number().integer().min(0).optional(),
  sku: Joi.string().optional(),
});
