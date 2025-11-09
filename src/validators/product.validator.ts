import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "string.empty": "Product name is required",
  }),

  description: Joi.string().allow("", null).optional(),

  category: Joi.string().required().messages({
    "string.empty": "Category ID is required",
  }),

  subcategory: Joi.string().allow("", null).optional(),

  images: Joi.array().items(Joi.string().uri()).optional(),

  published: Joi.boolean().default(true),

  variants: Joi.array()
    .items(
      Joi.object({
        unitValue: Joi.number().positive().required().messages({
          "number.base": "Unit value must be a number",
          "number.positive": "Unit value must be greater than 0",
        }),

        unitType: Joi.string()
          .valid("gm", "kg", "ml", "ltr", "piece", "packet", "box")
          .required(),

        price: Joi.number().positive().required().messages({
          "number.base": "Price must be a number",
          "number.positive": "Price must be greater than 0",
        }),

        offerPrice: Joi.number().min(0).optional().messages({
          "number.base": "Offer price must be a number",
        }),

        discount: Joi.number().min(0).max(100).optional().messages({
          "number.base": "Discount must be a number",
          "number.max": "Discount cannot exceed 100%",
        }),

        stock: Joi.number().integer().min(0).default(0),

        sku: Joi.string().trim().allow("", null).optional(),

        shelfLife: Joi.object({
          duration: Joi.number().min(0).optional(),
          unit: Joi.string().valid("days", "months", "years").optional(),
          manufacturingDate: Joi.date().allow("").optional(),
          expiryDate: Joi.date().optional(),
          bestBefore: Joi.string().allow("", null).optional(),
        }).optional(),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Variants must be an array",
      "array.min": "At least one product variant is required",
    }),
});
