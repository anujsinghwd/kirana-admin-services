"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubCategoryController = void 0;
const SubCategory_1 = __importDefault(require("../models/SubCategory"));
const AppError_1 = require("../utils/AppError");
const catchAsync_1 = require("../utils/catchAsync");
const errorMessages_1 = __importDefault(require("../config/errorMessages"));
const cloudinary_service_1 = require("../services/cloudinary.service");
const config_1 = __importDefault(require("../config/config"));
const mongoose_1 = require("mongoose");
const Product_1 = __importDefault(require("../models/Product"));
class SubCategoryController {
}
exports.SubCategoryController = SubCategoryController;
_a = SubCategoryController;
/** 🟢 Get All Subcategories */
SubCategoryController.getAll = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const subCategories = await SubCategory_1.default.find().populate("category", "name _id");
    res.json(subCategories);
});
/** 🟢 Get Subcategory by ID */
SubCategoryController.getById = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const subCategory = await SubCategory_1.default.findById(req.params.id).populate("category", "name _id");
    if (!subCategory)
        throw new AppError_1.AppError(errorMessages_1.default.SUBCATEGORY.NOT_FOUND, 404);
    res.json(subCategory);
});
/** 🟢 Create New Subcategory */
SubCategoryController.create = (0, catchAsync_1.catchAsync)(async (req, res) => {
    let imageUrl = "";
    // Upload image to Cloudinary if present
    if (req.file?.filename) {
        imageUrl = await cloudinary_service_1.cloudinaryService.uploadImage(req.file.path, config_1.default.SUBCATEGORY_IMAGE_PATH);
    }
    // Ensure category IDs are valid ObjectIds
    const categoryIds = Array.isArray(req.body.category)
        ? req.body.category.map((id) => new mongoose_1.Types.ObjectId(id))
        : [new mongoose_1.Types.ObjectId(req.body.category)];
    const createSubCategoryObj = {
        name: req.body.name,
        image: imageUrl || "",
        category: categoryIds,
    };
    const subCategory = await SubCategory_1.default.create(createSubCategoryObj);
    res.status(201).json(await subCategory.populate("category", "name _id"));
});
/** 🟢 Get Subcategories by Category ID */
SubCategoryController.getByCategoryId = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { categoryId } = req.params;
    // Validate ObjectId
    if (!categoryId || !mongoose_1.Types.ObjectId.isValid(categoryId)) {
        throw new AppError_1.AppError(errorMessages_1.default.SUBCATEGORY.INVALID_CATEGORY_ID, 400);
    }
    // Find all subcategories linked to this category
    const subCategories = await SubCategory_1.default.find({
        category: { $in: [categoryId] },
    }).populate("category", "name _id");
    res.json(subCategories);
});
/** 🟢 Remove Image */
SubCategoryController.removeImage = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { id, image } = req.body;
    const publicId = image.split("/").slice(-1)[0].split(".")[0];
    const imageResp = await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.SUBCATEGORY_IMAGE_PATH);
    if (imageResp.result === "ok") {
        const subCategory = await SubCategory_1.default.findById(id);
        if (!subCategory)
            throw new AppError_1.AppError(errorMessages_1.default.SUBCATEGORY.NOT_FOUND, 404);
        subCategory.image = "";
        await subCategory.save();
        res.json(subCategory);
    }
    else {
        throw new AppError_1.AppError(errorMessages_1.default.SUBCATEGORY.IMAGE_NOT_FOUND, 404);
    }
});
/** 🟢 Update Subcategory */
SubCategoryController.update = (0, catchAsync_1.catchAsync)(async (req, res) => {
    let imageUrl = "";
    if (req.file?.filename) {
        imageUrl = await cloudinary_service_1.cloudinaryService.uploadImage(req.file.path, config_1.default.SUBCATEGORY_IMAGE_PATH);
    }
    // Handle category IDs
    let categoryIds = [];
    if (req.body.category) {
        categoryIds = Array.isArray(req.body.category)
            ? req.body.category.map((id) => new mongoose_1.Types.ObjectId(id))
            : [new mongoose_1.Types.ObjectId(req.body.category)];
    }
    const updateObj = {
        name: req.body.name,
        category: categoryIds.length ? categoryIds : undefined,
    };
    if (imageUrl)
        updateObj.image = imageUrl;
    const subCategory = await SubCategory_1.default.findByIdAndUpdate(req.params.id, updateObj, {
        new: true,
    }).populate("category", "name _id");
    if (!subCategory)
        throw new AppError_1.AppError(errorMessages_1.default.SUBCATEGORY.NOT_FOUND, 404);
    res.json(subCategory);
});
/** 🟢 Delete Subcategory (with products + Cloudinary cleanup) */
SubCategoryController.delete = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const subCategoryId = req.params.id;
    // 🔹 1. Find subcategory
    const subCategoryData = await SubCategory_1.default.findById(subCategoryId);
    if (!subCategoryData)
        throw new AppError_1.AppError(errorMessages_1.default.SUBCATEGORY.NOT_FOUND, 404);
    // 🔹 2. Find all products linked to this subcategory
    const products = await Product_1.default.find({ subcategory: subCategoryId });
    // 🔹 3. Delete all product images from Cloudinary
    await Promise.all(products.flatMap((product) => (product.images || []).map(async (img) => {
        const publicId = img.split("/").slice(-1)[0].split(".")[0];
        await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.PRODUCT_IMAGE_PATH);
    })));
    // 🔹 4. Delete the products from DB
    await Product_1.default.deleteMany({ subcategory: subCategoryId });
    // 🔹 5. Delete subcategory image from Cloudinary if exists
    if (subCategoryData.image) {
        const publicId = subCategoryData.image
            .split("/")
            .slice(-1)[0]
            .split(".")[0];
        await cloudinary_service_1.cloudinaryService.deleteImage(publicId, config_1.default.SUBCATEGORY_IMAGE_PATH);
    }
    // 🔹 6. Delete subcategory from DB
    await SubCategory_1.default.findByIdAndDelete(subCategoryId);
    res.json({
        message: "Subcategory and all related products deleted successfully.",
    });
});
