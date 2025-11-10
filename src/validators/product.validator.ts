import Joi from "joi";

/** --- Reusable variant schema --- */
const variantSchema = Joi.object({
  unitValue: Joi.number().positive().required().messages({
    "number.base": "Unit value must be a number",
    "number.positive": "Unit value must be greater than 0",
    "any.required": "Unit value is required",
  }),

  unitType: Joi.string()
    .valid("gm", "kg", "ml", "ltr", "piece", "packet", "box")
    .required()
    .messages({
      "any.only":
        "Unit type must be one of gm, kg, ml, ltr, piece, packet, box",
      "any.required": "Unit type is required",
    }),

  price: Joi.number().min(0).required().messages({
    "number.base": "Price must be a number",
    "number.min": "Price cannot be negative",
    "any.required": "Price is required",
  }),

  offerPrice: Joi.number().min(0).optional().allow(null, ""),
  discount: Joi.number().min(0).max(100).optional().messages({
    "number.base": "Discount must be a number",
    "number.max": "Discount cannot exceed 100%",
  }),

  stock: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Stock must be a number",
    "number.min": "Stock cannot be negative",
  }),

  sku: Joi.string().trim().allow("", null).optional(),

  shelfLife: Joi.object({
    duration: Joi.number().min(0).optional().allow(null),
    unit: Joi.string().valid("days", "months", "years").optional(),
    manufacturingDate: Joi.date().iso().allow("", null).optional(),
    expiryDate: Joi.date().iso().allow("", null).optional(),
    bestBefore: Joi.string().allow("", null).optional(),
  })
    .optional()
    .allow(null),
});

/** --- Loose product config schema --- */
const looseConfigSchema = Joi.object({
  unitType: Joi.string()
    .valid("gm", "kg", "ml", "ltr")
    .required()
    .messages({ "any.only": "Loose unitType must be gm, kg, ml or ltr" }),

  pricePerUnit: Joi.number().min(0).required().messages({
    "number.base": "pricePerUnit must be a number",
    "number.min": "pricePerUnit cannot be negative",
    "any.required": "pricePerUnit is required for loose products",
  }),

  // availableQty expressed in the same `unitType` units (e.g., kg)
  availableQty: Joi.number().min(0).required().messages({
    "number.base": "availableQty must be a number",
    "number.min": "availableQty cannot be negative",
    "any.required": "availableQty is required for loose products",
  }),

  // minimal allowed purchase unit (e.g., 50 for 50gm if using grams)
  minQtyAllowed: Joi.number().min(0).optional().default(0),
  // step size for allowed purchase increments (e.g., 50 => purchase in multiples of 50gm)
  stepQty: Joi.number().min(1).optional().default(1),

  sku: Joi.string().trim().allow("", null).optional(),
}).required();

/** --- Main schema --- */
export const createProductSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "string.empty": "Product name is required",
  }),

  description: Joi.string().allow("", null).optional(),

  category: Joi.string().trim().required().messages({
    "string.empty": "Category ID is required",
  }),

  subcategory: Joi.string().trim().allow("", null).optional(),

  // images may be passed as array of urls (for validation) or absent when files are posted via multipart
  images: Joi.alternatives()
    .try(Joi.array().items(Joi.string().uri()), Joi.string().allow("", null))
    .optional(),

  published: Joi.boolean().default(true),

  // mode toggle: loose product or packaged (variants)
  isLoose: Joi.boolean().default(false),

  /**
   * variants: either JSON string (from form-data) or array of variant objects.
   * When isLoose === false, variants are required (at least 1).
   */
  variants: Joi.alternatives()
    .try(
      Joi.string().custom((value, helpers) => {
        // attempt to parse JSON string
        try {
          const parsed = JSON.parse(value);
          return parsed;
        } catch (e) {
          return helpers.error("any.invalid");
        }
      }, "JSON parse"),
      Joi.array().items(variantSchema)
    )
    .when("isLoose", {
      is: false,
      then: Joi.required().messages({
        "any.required": "Variants are required for non-loose products",
      }),
      otherwise: Joi.forbidden().messages({
        "any.unknown": "Variants are not allowed for loose products",
      }),
    }),

  /**
   * looseConfig can come as JSON string or object.
   * Required when isLoose === true.
   */
  looseConfig: Joi.alternatives()
    .try(
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          return parsed;
        } catch (e) {
          return helpers.error("any.invalid");
        }
      }, "JSON parse"),
      looseConfigSchema
    )
    .when("isLoose", {
      is: true,
      then: Joi.required().messages({
        "any.required": "looseConfig is required for loose products",
      }),
      otherwise: Joi.forbidden().messages({
        "any.unknown": "looseConfig is only allowed for loose products",
      }),
    }),
})
  // final safety: ensure one of variants or looseConfig is present based on isLoose
  .options({ abortEarly: false }); // return all validation errors
