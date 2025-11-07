"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    description: joi_1.default.string().optional(),
    price: joi_1.default.number().positive().required(),
    category: joi_1.default.string().required(),
    subcategory: joi_1.default.string(),
    stock: joi_1.default.number().integer().min(0).optional(),
    sku: joi_1.default.string(),
    unit: joi_1.default.string().optional(),
    discount: joi_1.default.string().optional(),
    offerPrice: joi_1.default.string().optional(),
});
