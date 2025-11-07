"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const catchAsync_1 = require("../utils/catchAsync");
const Product_1 = __importDefault(require("../models/Product"));
const AppError_1 = require("../utils/AppError");
const errorMessages_1 = __importDefault(require("../config/errorMessages"));
const cloudinary_service_1 = require("../services/cloudinary.service");
const config_1 = __importDefault(require("../config/config"));
const utils_1 = require("../utils/utils");
class ProductController {
}
exports.ProductController = ProductController;
_a = ProductController;
ProductController.getAll = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const products = await Product_1.default.find().populate("category");
    if (!products)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.FETCH_FAIL, 500);
    res.json(products);
});
ProductController.getById = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const product = await Product_1.default.findById(req.params.id).populate("category");
    if (!product)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.NOT_FOUND, 404);
    res.json(product);
});
ProductController.create = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { name, description, price, category, stock, sku, unit, discount, offerPrice, subcategory } = req.body;
    const existing = await Product_1.default.findOne({ name, category });
    if (existing)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.DUPLICATE, 400);
    let imageUrls = [];
    if (req.files && Array.isArray(req.files)) {
        const uploadPromises = req.files.map((file) => cloudinary_service_1.cloudinaryService.uploadImage(file.path, config_1.default.PRODUCT_IMAGE_PATH));
        imageUrls = await Promise.all(uploadPromises);
    }
    const createProductObj = {
        name,
        description,
        price,
        category,
        stock,
        images: imageUrls,
        unit,
        discount,
        offerPrice,
        subcategory
    };
    if (sku) {
        createProductObj.sku = sku;
    }
    const product = await Product_1.default.create(createProductObj);
    // const product = await Product.create(req.body);
    if (!product)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.CREATE_FAIL, 400);
    res.status(201).json(product);
});
ProductController.update = (0, catchAsync_1.catchAsync)(async (req, res) => {
    try {
        const { name, description, price, category, stock, sku } = req.body;
        let deletedImages = [];
        if (req.body.deletedImages) {
            deletedImages = JSON.parse(req.body.deletedImages);
            for (const url of deletedImages) {
                const publicId = url.split("/").slice(-1)[0].split(".")[0];
                await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.PRODUCT_IMAGE_PATH);
            }
        }
        const newImageUrls = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const result = await cloudinary_service_1.cloudinaryService.uploadImage(file.path, config_1.default.PRODUCT_IMAGE_PATH);
                newImageUrls.push(result);
            }
        }
        const product = await Product_1.default.findById(req.params.id);
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        product.name = name;
        product.description = description;
        product.price = price;
        product.category = category;
        product.stock = stock;
        product.sku = sku;
        product.images = [
            ...(product.images || []).filter((i) => !deletedImages.includes(i)),
            ...newImageUrls,
        ];
        await product.save();
        res.json(product);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating product" });
    }
});
ProductController.delete = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const product = await Product_1.default.findById(req.params.id);
    if (!product)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.NOT_FOUND, 404);
    // ✅ Remove all associated Cloudinary images
    if (product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
            try {
                // Extract public ID from Cloudinary URL
                const publicId = (0, utils_1.getImagePublicId)(imageUrl);
                if (publicId) {
                    await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.PRODUCT_IMAGE_PATH);
                }
            }
            catch (err) {
                console.error(`Failed to delete image from Cloudinary: ${imageUrl}`, err);
            }
        }
    }
    await Product_1.default.findByIdAndDelete(req.params.id);
    res
        .status(200)
        .json({ message: "Product and associated images deleted successfully" });
});
