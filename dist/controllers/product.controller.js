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
class ProductController {
}
exports.ProductController = ProductController;
_a = ProductController;
/** ------------------ GET ALL ------------------ */
ProductController.getAll = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { category, subcategory, published } = req.query;
    const filter = {};
    if (category)
        filter.category = category;
    if (subcategory)
        filter.subcategory = subcategory;
    if (published !== undefined)
        filter.published = published === "true";
    const products = await Product_1.default.find(filter)
        .populate("category", "name _id")
        .populate("subcategory", "name _id")
        .sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        error: false,
        message: "Products fetched successfully",
        data: products,
    });
});
/** ------------------ GET BY ID ------------------ */
ProductController.getById = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const product = await Product_1.default.findById(id)
        .populate("category", "name _id")
        .populate("subcategory", "name _id");
    if (!product)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.NOT_FOUND || "Product not found", 404);
    res.status(200).json({
        success: true,
        error: false,
        message: "Product fetched successfully",
        data: product,
    });
});
/** ------------------ CREATE ------------------ */
ProductController.create = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { name, description, category, subcategory, published, isLoose, looseConfig, variants, } = req.body;
    // Prevent duplicate product name in same category
    const existing = await Product_1.default.findOne({ name, category });
    if (existing)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.DUPLICATE, 400);
    // Handle images upload
    let imageUrls = [];
    if (req.files && Array.isArray(req.files)) {
        const uploadPromises = req.files.map((file) => cloudinary_service_1.cloudinaryService.uploadImage(file.buffer, config_1.default.PRODUCT_IMAGE_PATH));
        imageUrls = await Promise.all(uploadPromises);
    }
    // Parse variants or looseConfig safely
    let parsedVariants = [];
    let parsedLooseConfig = null;
    try {
        if (variants && typeof variants === "string") {
            parsedVariants = JSON.parse(variants);
        }
        else if (Array.isArray(variants)) {
            parsedVariants = variants;
        }
        if (looseConfig && typeof looseConfig === "string") {
            parsedLooseConfig = JSON.parse(looseConfig);
        }
        else if (typeof looseConfig === "object") {
            parsedLooseConfig = looseConfig;
        }
    }
    catch (err) {
        throw new AppError_1.AppError("Invalid JSON in variants or looseConfig", 400);
    }
    // Validation: cannot have both variants and looseConfig
    if (isLoose === "true" && parsedVariants.length > 0)
        throw new AppError_1.AppError("Loose products cannot contain variants", 400);
    const product = await Product_1.default.create({
        name,
        description,
        category,
        subcategory,
        published: published === "true" || published === true,
        isLoose: isLoose === "true" || isLoose === true,
        looseConfig: parsedLooseConfig || undefined,
        variants: parsedVariants || [],
        images: imageUrls,
    });
    if (!product)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.CREATE_FAIL || "Failed to create product", 400);
    res.status(201).json({
        success: true,
        error: false,
        message: "Product created successfully",
        data: product,
    });
});
/** ------------------ UPDATE ------------------ */
ProductController.update = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { name, description, category, subcategory, published, isLoose, looseConfig, } = req.body;
    let variants = [];
    let deletedImages = [];
    let parsedLooseConfig = null;
    try {
        if (req.body.variants && typeof req.body.variants === "string")
            variants = JSON.parse(req.body.variants);
        else if (Array.isArray(req.body.variants))
            variants = req.body.variants;
        if (req.body.deletedImages && typeof req.body.deletedImages === "string")
            deletedImages = JSON.parse(req.body.deletedImages);
        if (looseConfig && typeof looseConfig === "string")
            parsedLooseConfig = JSON.parse(looseConfig);
        else if (typeof looseConfig === "object")
            parsedLooseConfig = looseConfig;
    }
    catch (error) {
        console.error("❌ JSON parsing error:", error);
        return res.status(400).json({
            success: false,
            error: true,
            message: "Invalid JSON in variants, looseConfig, or deletedImages",
        });
    }
    const product = await Product_1.default.findById(req.params.id);
    if (!product)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.NOT_FOUND, 404);
    // ✅ Handle deleted images
    if (deletedImages.length > 0) {
        for (const url of deletedImages) {
            try {
                const publicId = url.split("/").slice(-1)[0].split(".")[0];
                await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.PRODUCT_IMAGE_PATH);
            }
            catch (err) {
                console.warn(`Failed to delete image: ${url}`);
            }
        }
    }
    // ✅ Upload new images
    let newImageUrls = [];
    if (req.files && Array.isArray(req.files)) {
        const uploadPromises = req.files.map((file) => cloudinary_service_1.cloudinaryService.uploadImage(file.buffer, config_1.default.PRODUCT_IMAGE_PATH));
        newImageUrls = await Promise.all(uploadPromises);
    }
    // ✅ Update fields
    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.category = category ?? product.category;
    product.subcategory = subcategory ?? product.subcategory;
    product.published =
        typeof published === "boolean"
            ? published
            : published === "true"
                ? true
                : product.published;
    // ✅ Replace images correctly
    product.images = [
        ...(product.images || []).filter((img) => !deletedImages.includes(img)),
        ...newImageUrls,
    ];
    // ✅ Handle Loose or Variant Mode
    const looseMode = isLoose === "true" || isLoose === true;
    product.isLoose = looseMode;
    if (looseMode) {
        product.looseConfig = parsedLooseConfig || product.looseConfig;
        product.variants = []; // clear variants if loose
    }
    else {
        product.looseConfig = undefined;
        if (Array.isArray(variants) && variants.length > 0)
            product.variants = variants;
    }
    await product.save();
    res.status(200).json({
        success: true,
        error: false,
        message: "Product updated successfully",
        data: product,
    });
});
/** ------------------ DELETE ------------------ */
ProductController.delete = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const product = await Product_1.default.findById(id);
    if (!product)
        throw new AppError_1.AppError(errorMessages_1.default.PRODUCT.NOT_FOUND, 404);
    // ✅ Delete associated images
    if (product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
            try {
                const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
                await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.PRODUCT_IMAGE_PATH);
            }
            catch (err) {
                console.warn(`Failed to delete Cloudinary image: ${imageUrl}`);
            }
        }
    }
    await Product_1.default.findByIdAndDelete(id);
    res.status(200).json({
        success: true,
        error: false,
        message: "Product deleted successfully",
    });
});
