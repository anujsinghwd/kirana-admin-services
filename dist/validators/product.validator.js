"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/** --- Reusable variant schema --- */
const variantSchema = joi_1.default.object({
    unitValue: joi_1.default.number().positive().required().messages({
        "number.base": "Unit value must be a number",
        "number.positive": "Unit value must be greater than 0",
        "any.required": "Unit value is required",
    }),
    unitType: joi_1.default.string()
        .valid("gm", "kg", "ml", "ltr", "piece", "packet", "box")
        .required()
        .messages({
        "any.only": "Unit type must be one of gm, kg, ml, ltr, piece, packet, box",
        "any.required": "Unit type is required",
    }),
    price: joi_1.default.number().min(0).required().messages({
        "number.base": "Price must be a number",
        "number.min": "Price cannot be negative",
        "any.required": "Price is required",
    }),
    offerPrice: joi_1.default.number().min(0).optional().allow(null, ""),
    discount: joi_1.default.number().min(0).max(100).optional().messages({
        "number.base": "Discount must be a number",
        "number.max": "Discount cannot exceed 100%",
    }),
    stock: joi_1.default.number().integer().min(0).default(0).messages({
        "number.base": "Stock must be a number",
        "number.min": "Stock cannot be negative",
    }),
    sku: joi_1.default.string().trim().allow("", null).optional(),
    shelfLife: joi_1.default.object({
        duration: joi_1.default.number().min(0).optional().allow(null),
        unit: joi_1.default.string().valid("days", "months", "years").optional(),
        manufacturingDate: joi_1.default.date().iso().allow("", null).optional(),
        expiryDate: joi_1.default.date().iso().allow("", null).optional(),
        bestBefore: joi_1.default.string().allow("", null).optional(),
    })
        .optional()
        .allow(null),
});
/** --- Loose product config schema --- */
const looseConfigSchema = joi_1.default.object({
    unitType: joi_1.default.string()
        .valid("gm", "kg", "ml", "ltr")
        .required()
        .messages({ "any.only": "Loose unitType must be gm, kg, ml or ltr" }),
    pricePerUnit: joi_1.default.number().min(0).required().messages({
        "number.base": "pricePerUnit must be a number",
        "number.min": "pricePerUnit cannot be negative",
        "any.required": "pricePerUnit is required for loose products",
    }),
    // availableQty expressed in the same `unitType` units (e.g., kg)
    availableQty: joi_1.default.number().min(0).required().messages({
        "number.base": "availableQty must be a number",
        "number.min": "availableQty cannot be negative",
        "any.required": "availableQty is required for loose products",
    }),
    // minimal allowed purchase unit (e.g., 50 for 50gm if using grams)
    minQtyAllowed: joi_1.default.number().min(0).optional().default(0),
    // step size for allowed purchase increments (e.g., 50 => purchase in multiples of 50gm)
    stepQty: joi_1.default.number().min(1).optional().default(1),
    sku: joi_1.default.string().trim().allow("", null).optional(),
}).required();
/** --- Main schema --- */
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string().trim().required().messages({
        "string.empty": "Product name is required",
    }),
    description: joi_1.default.string().allow("", null).optional(),
    category: joi_1.default.string().trim().required().messages({
        "string.empty": "Category ID is required",
    }),
    subcategory: joi_1.default.string().trim().allow("", null).optional(),
    // images may be passed as array of urls (for validation) or absent when files are posted via multipart
    images: joi_1.default.alternatives()
        .try(joi_1.default.array().items(joi_1.default.string().uri()), joi_1.default.string().allow("", null))
        .optional(),
    published: joi_1.default.boolean().default(true),
    // mode toggle: loose product or packaged (variants)
    isLoose: joi_1.default.boolean().default(false),
    /**
     * variants: either JSON string (from form-data) or array of variant objects.
     * When isLoose === false, variants are required (at least 1).
     */
    variants: joi_1.default.alternatives()
        .try(joi_1.default.string().custom((value, helpers) => {
        // attempt to parse JSON string
        try {
            const parsed = JSON.parse(value);
            return parsed;
        }
        catch (e) {
            return helpers.error("any.invalid");
        }
    }, "JSON parse"), joi_1.default.array().items(variantSchema))
        .when("isLoose", {
        is: false,
        then: joi_1.default.required().messages({
            "any.required": "Variants are required for non-loose products",
        }),
        otherwise: joi_1.default.forbidden().messages({
            "any.unknown": "Variants are not allowed for loose products",
        }),
    }),
    /**
     * looseConfig can come as JSON string or object.
     * Required when isLoose === true.
     */
    looseConfig: joi_1.default.alternatives()
        .try(joi_1.default.string().custom((value, helpers) => {
        try {
            const parsed = JSON.parse(value);
            return parsed;
        }
        catch (e) {
            return helpers.error("any.invalid");
        }
    }, "JSON parse"), looseConfigSchema)
        .when("isLoose", {
        is: true,
        then: joi_1.default.required().messages({
            "any.required": "looseConfig is required for loose products",
        }),
        otherwise: joi_1.default.forbidden().messages({
            "any.unknown": "looseConfig is only allowed for loose products",
        }),
    }),
})
    // final safety: ensure one of variants or looseConfig is present based on isLoose
    .options({ abortEarly: false }); // return all validation errors
