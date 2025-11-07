"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.default = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/kirana',
    UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads/',
    API_PREFIX: '/api',
    JWT_SECRET: process.env.JWT_SECRET || 'test',
    JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '1D'),
    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
        API_KEY: process.env.CLOUDINARY_API_KEY || '',
        API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
    },
    PRODUCT_IMAGE_PATH: 'products',
    CATEGORY_IMAGE_PATH: 'categories',
    SUBCATEGORY_IMAGE_PATH: "subcategories",
};
