"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategoryValidator = exports.createCategoryValidator = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCategoryValidator = joi_1.default.object({
    name: joi_1.default.object({
        en: joi_1.default.string().required(),
        hi: joi_1.default.string().required(),
    }).required(),
    description: joi_1.default.object({
        en: joi_1.default.string(),
        hi: joi_1.default.string(),
    }),
    image: joi_1.default.string(),
    published: joi_1.default.boolean(),
});
exports.updateCategoryValidator = joi_1.default.object({
    name: joi_1.default.object({
        en: joi_1.default.string().required(),
        hi: joi_1.default.string().required(),
    }),
    description: joi_1.default.object({
        en: joi_1.default.string(),
        hi: joi_1.default.string(),
    }),
    image: joi_1.default.string(),
    published: joi_1.default.boolean(),
});
