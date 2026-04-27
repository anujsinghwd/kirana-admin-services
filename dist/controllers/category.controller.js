"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const AppError_1 = require("../utils/AppError");
const catchAsync_1 = require("../utils/catchAsync");
const errorMessages_1 = __importDefault(require("../config/errorMessages"));
const cloudinary_service_1 = require("../services/cloudinary.service");
const config_1 = __importDefault(require("../config/config"));
const SubCategory_1 = __importDefault(require("../models/SubCategory"));
const Product_1 = __importDefault(require("../models/Product"));
const imageCompressor_1 = require("../utils/imageCompressor");
class CategoryController {
}
exports.CategoryController = CategoryController;
_a = CategoryController;
CategoryController.getAll = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const categories = await Category_1.default.find();
    res.json(categories);
});
CategoryController.getById = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const category = await Category_1.default.findById(req.params.id);
    if (!category)
        throw new AppError_1.AppError(errorMessages_1.default.CATEGORY.NOT_FOUND, 404);
    res.json(category);
});
CategoryController.create = (0, catchAsync_1.catchAsync)(async (req, res) => {
    let imageUrl = "";
    // Upload image to Cloudinary if present
    if (req.file?.buffer) {
        // 🧠 Memory upload
        const compressedBuffer = await (0, imageCompressor_1.compressImageTo70KB)(req.file.buffer);
        imageUrl = await cloudinary_service_1.cloudinaryService.uploadImage(compressedBuffer, config_1.default.CATEGORY_IMAGE_PATH);
    }
    else if (req.file?.path) {
        // 📁 File path upload (fallback)
        imageUrl = await cloudinary_service_1.cloudinaryService.uploadImage(req.file.path, config_1.default.CATEGORY_IMAGE_PATH);
    }
    const createCategoryObj = {
        name: JSON.parse(req.body.name),
        description: JSON.parse(req.body.description),
    };
    if (imageUrl) {
        createCategoryObj.image = imageUrl;
    }
    const category = await Category_1.default.create(createCategoryObj);
    res.status(201).json(category);
});
CategoryController.removeImage = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { image } = req.body;
    const publicId = image.split("/").slice(-1)[0].split(".")[0];
    const imageResp = await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.CATEGORY_IMAGE_PATH);
    if (imageResp.result === "ok") {
        const category = await Category_1.default.findById(req.body.id);
        if (category) {
            category.image = "";
            await category.save();
        }
        if (!category)
            throw new AppError_1.AppError(errorMessages_1.default.CATEGORY.NOT_FOUND, 404);
        res.json(category);
    }
    else {
        throw new AppError_1.AppError(errorMessages_1.default.CATEGORY.IMAGE_NOT_FOUND, 404);
    }
});
CategoryController.update = (0, catchAsync_1.catchAsync)(async (req, res) => {
    let imageUrl = "";
    // Upload image to Cloudinary if present
    if (req.file?.buffer) {
        // 🧠 Memory upload
        const compressedBuffer = await (0, imageCompressor_1.compressImageTo70KB)(req.file.buffer);
        imageUrl = await cloudinary_service_1.cloudinaryService.uploadImage(compressedBuffer, config_1.default.CATEGORY_IMAGE_PATH);
    }
    else if (req.file?.path) {
        // 📁 File path upload (fallback)
        imageUrl = await cloudinary_service_1.cloudinaryService.uploadImage(req.file.path, config_1.default.CATEGORY_IMAGE_PATH);
    }
    const updateObj = {
        name: JSON.parse(req.body.name),
        description: JSON.parse(req.body.description),
    };
    if (imageUrl) {
        updateObj.image = imageUrl;
    }
    const category = await Category_1.default.findByIdAndUpdate(req.params.id, { $set: updateObj }, {
        new: true,
    });
    if (!category)
        throw new AppError_1.AppError(errorMessages_1.default.CATEGORY.NOT_FOUND, 404);
    res.json(category);
});
CategoryController.delete = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const categoryId = req.params.id;
    // 🔹 1. Find the category
    const categoryData = await Category_1.default.findById(categoryId);
    if (!categoryData)
        throw new AppError_1.AppError(errorMessages_1.default.CATEGORY.NOT_FOUND, 404);
    // 🔹 2. Find all subcategories linked to this category
    const subCategories = await SubCategory_1.default.find({
        category: { $in: [categoryId] },
    });
    // 🔹 3. Collect all subcategory IDs
    const subCategoryIds = subCategories.map((sub) => sub._id);
    // 🔹 4. Find all products linked to this category or its subcategories
    const products = await Product_1.default.find({
        $or: [{ category: categoryId }, { subcategory: { $in: subCategoryIds } }],
    });
    // ✅ BEGIN CLOUDINARY CLEANUP
    // 🔹 5. Delete Category Image (if exists)
    if (categoryData.image) {
        const publicId = categoryData.image.split("/").slice(-1)[0].split(".")[0];
        await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.CATEGORY_IMAGE_PATH);
    }
    // 🔹 6. Delete SubCategory Images
    for (const sub of subCategories) {
        if (sub.image) {
            const publicId = sub.image.split("/").slice(-1)[0].split(".")[0];
            await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.SUBCATEGORY_IMAGE_PATH);
        }
    }
    // 🔹 7. Delete Product Images
    for (const product of products) {
        if (Array.isArray(product.images)) {
            for (const img of product.images) {
                const publicId = img.split("/").slice(-1)[0].split(".")[0];
                await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.PRODUCT_IMAGE_PATH);
            }
        }
    }
    // ✅ BEGIN DATABASE CLEANUP
    // 🔹 8. Delete all products related to this category/subcategories
    await Product_1.default.deleteMany({
        $or: [{ category: categoryId }, { subcategory: { $in: subCategoryIds } }],
    });
    // 🔹 9. Delete all subcategories of this category
    await SubCategory_1.default.deleteMany({ category: { $in: [categoryId] } });
    // 🔹 10. Finally, delete the category
    await Category_1.default.findByIdAndDelete(categoryId);
    res.json({ message: "Category and all related data deleted successfully" });
});
