import Category, { ICategoryDTO } from "@models/Category";
import { AppError } from "@utils/AppError";
import { catchAsync } from "@utils/catchAsync";
import ERROR_MESSAGES from "@config/errorMessages";
import { cloudinaryService } from "services/cloudinary.service";
import config from "@config/config";
import SubCategory from "@models/SubCategory";
import Product from "@models/Product";

export class CategoryController {
  public static getAll = catchAsync(async (req, res) => {
    const categories = await Category.find();
    res.json(categories);
  });

  public static getById = catchAsync(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError(ERROR_MESSAGES.CATEGORY.NOT_FOUND, 404);
    res.json(category);
  });

  public static create = catchAsync(async (req, res) => {
    let imageUrl: string = "";
    if (req.file?.filename) {
      imageUrl = await cloudinaryService.uploadImage(
        req.file.path,
        config.CATEGORY_IMAGE_PATH
      );
    }

    const createCategoryObj: ICategoryDTO = {
      name: req.body.name,
      description: req.body.description,
    };
    if (imageUrl) {
      createCategoryObj.image = imageUrl;
    }

    const category = await Category.create(createCategoryObj);
    res.status(201).json(category);
  });

  public static removeImage = catchAsync(async (req, res) => {
    const { image } = req.body;
    const publicId = image.split("/").slice(-1)[0].split(".")[0];
    const imageResp = await cloudinaryService.deleteImage(
      publicId,
      config.CATEGORY_IMAGE_PATH
    );

    if (imageResp.result === "ok") {
      const category = await Category.findById(req.body.id);
      if (category) {
        category.image = "";
        await category.save();
      }

      if (!category) throw new AppError(ERROR_MESSAGES.CATEGORY.NOT_FOUND, 404);
      res.json(category);
    } else {
      throw new AppError(ERROR_MESSAGES.CATEGORY.IMAGE_NOT_FOUND, 404);
    }
  });

  public static update = catchAsync(async (req, res) => {
    let imageUrl: string = "";
    if (req.file?.filename) {
      imageUrl = await cloudinaryService.uploadImage(
        req.file.path,
        config.CATEGORY_IMAGE_PATH
      );
    }

    const updateObj: ICategoryDTO = { ...req.body };
    if (imageUrl) {
      updateObj.image = imageUrl;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateObj,
      {
        new: true,
      }
    );
    if (!category) throw new AppError(ERROR_MESSAGES.CATEGORY.NOT_FOUND, 404);
    res.json(category);
  });

  public static delete = catchAsync(async (req, res) => {
    const categoryId = req.params.id;

    // 🔹 1. Find the category
    const categoryData = await Category.findById(categoryId);
    if (!categoryData)
      throw new AppError(ERROR_MESSAGES.CATEGORY.NOT_FOUND, 404);

    // 🔹 2. Find all subcategories linked to this category
    const subCategories = await SubCategory.find({
      category: { $in: [categoryId] },
    });

    // 🔹 3. Collect all subcategory IDs
    const subCategoryIds = subCategories.map((sub) => sub._id);

    // 🔹 4. Find all products linked to this category or its subcategories
    const products = await Product.find({
      $or: [{ category: categoryId }, { subcategory: { $in: subCategoryIds } }],
    });

    // ✅ BEGIN CLOUDINARY CLEANUP

    // 🔹 5. Delete Category Image (if exists)
    if (categoryData.image) {
      const publicId = categoryData.image.split("/").slice(-1)[0].split(".")[0];
      await cloudinaryService.deleteImage(publicId, config.CATEGORY_IMAGE_PATH);
    }

    // 🔹 6. Delete SubCategory Images
    for (const sub of subCategories) {
      if (sub.image) {
        const publicId = sub.image.split("/").slice(-1)[0].split(".")[0];
        await cloudinaryService.deleteImage(
          publicId,
          config.SUBCATEGORY_IMAGE_PATH
        );
      }
    }

    // 🔹 7. Delete Product Images
    for (const product of products) {
      if (Array.isArray(product.images)) {
        for (const img of product.images) {
          const publicId = img.split("/").slice(-1)[0].split(".")[0];
          await cloudinaryService.deleteImage(
            publicId,
            config.PRODUCT_IMAGE_PATH
          );
        }
      }
    }

    // ✅ BEGIN DATABASE CLEANUP

    // 🔹 8. Delete all products related to this category/subcategories
    await Product.deleteMany({
      $or: [{ category: categoryId }, { subcategory: { $in: subCategoryIds } }],
    });

    // 🔹 9. Delete all subcategories of this category
    await SubCategory.deleteMany({ category: { $in: [categoryId] } });

    // 🔹 10. Finally, delete the category
    await Category.findByIdAndDelete(categoryId);

    res.json({ message: "Category and all related data deleted successfully" });
  });
}
