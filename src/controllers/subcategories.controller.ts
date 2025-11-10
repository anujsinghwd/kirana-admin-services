import SubCategory, { ISubCategoryDTO } from "@models/SubCategory";
import { AppError } from "@utils/AppError";
import { catchAsync } from "@utils/catchAsync";
import ERROR_MESSAGES from "@config/errorMessages";
import { cloudinaryService } from "services/cloudinary.service";
import config from "@config/config";
import { Types } from "mongoose";
import Product from "@models/Product";

export class SubCategoryController {
  /** 🟢 Get All Subcategories */
  public static getAll = catchAsync(async (req, res) => {
    const subCategories = await SubCategory.find().populate(
      "category",
      "name _id"
    );
    res.json(subCategories);
  });

  /** 🟢 Get Subcategory by ID */
  public static getById = catchAsync(async (req, res) => {
    const subCategory = await SubCategory.findById(req.params.id).populate(
      "category",
      "name _id"
    );
    if (!subCategory)
      throw new AppError(ERROR_MESSAGES.SUBCATEGORY.NOT_FOUND, 404);
    res.json(subCategory);
  });

  /** 🟢 Create New Subcategory */
  public static create = catchAsync(async (req, res) => {
    let imageUrl: string = "";

    // Upload image to Cloudinary if present
    if (req.file?.buffer) {
      // 🧠 Memory upload
      imageUrl = await cloudinaryService.uploadImage(
        req.file.buffer,
        config.CATEGORY_IMAGE_PATH
      );
    } else if (req.file?.path) {
      // 📁 File path upload (fallback)
      imageUrl = await cloudinaryService.uploadImage(
        req.file.path,
        config.CATEGORY_IMAGE_PATH
      );
    }

    // Ensure category IDs are valid ObjectIds
    const categoryIds = Array.isArray(req.body.category)
      ? req.body.category.map((id: string) => new Types.ObjectId(id))
      : [new Types.ObjectId(req.body.category)];

    const createSubCategoryObj: ISubCategoryDTO = {
      name: req.body.name,
      image: imageUrl || "",
      category: categoryIds,
    };

    const subCategory = await SubCategory.create(createSubCategoryObj);
    res.status(201).json(await subCategory.populate("category", "name _id"));
  });

  /** 🟢 Get Subcategories by Category ID */
  public static getByCategoryId = catchAsync(async (req, res) => {
    const { categoryId } = req.params;

    // Validate ObjectId
    if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
      throw new AppError(ERROR_MESSAGES.SUBCATEGORY.INVALID_CATEGORY_ID, 400);
    }

    // Find all subcategories linked to this category
    const subCategories = await SubCategory.find({
      category: { $in: [categoryId] },
    }).populate("category", "name _id");

    res.json(subCategories);
  });

  /** 🟢 Remove Image */
  public static removeImage = catchAsync(async (req, res) => {
    const { id, image } = req.body;
    const publicId = image.split("/").slice(-1)[0].split(".")[0];

    const imageResp = await cloudinaryService.deleteImage(
      publicId,
      config.SUBCATEGORY_IMAGE_PATH
    );

    if (imageResp.result === "ok") {
      const subCategory = await SubCategory.findById(id);
      if (!subCategory)
        throw new AppError(ERROR_MESSAGES.SUBCATEGORY.NOT_FOUND, 404);

      subCategory.image = "";
      await subCategory.save();
      res.json(subCategory);
    } else {
      throw new AppError(ERROR_MESSAGES.SUBCATEGORY.IMAGE_NOT_FOUND, 404);
    }
  });

  /** 🟢 Update Subcategory */
  public static update = catchAsync(async (req, res) => {
    let imageUrl: string = "";

    // Upload image to Cloudinary if present
    if (req.file?.buffer) {
      // 🧠 Memory upload
      imageUrl = await cloudinaryService.uploadImage(
        req.file.buffer,
        config.CATEGORY_IMAGE_PATH
      );
    } else if (req.file?.path) {
      // 📁 File path upload (fallback)
      imageUrl = await cloudinaryService.uploadImage(
        req.file.path,
        config.CATEGORY_IMAGE_PATH
      );
    }

    // Handle category IDs
    let categoryIds: Types.ObjectId[] = [];
    if (req.body.category) {
      categoryIds = Array.isArray(req.body.category)
        ? req.body.category.map((id: string) => new Types.ObjectId(id))
        : [new Types.ObjectId(req.body.category)];
    }

    const updateObj: Partial<ISubCategoryDTO> = {
      name: req.body.name,
      category: categoryIds.length ? categoryIds : undefined,
    };
    if (imageUrl) updateObj.image = imageUrl;

    const subCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      updateObj,
      {
        new: true,
      }
    ).populate("category", "name _id");

    if (!subCategory)
      throw new AppError(ERROR_MESSAGES.SUBCATEGORY.NOT_FOUND, 404);
    res.json(subCategory);
  });

  /** 🟢 Delete Subcategory (with products + Cloudinary cleanup) */
  public static delete = catchAsync(async (req, res) => {
    const subCategoryId = req.params.id;

    // 🔹 1. Find subcategory
    const subCategoryData = await SubCategory.findById(subCategoryId);
    if (!subCategoryData)
      throw new AppError(ERROR_MESSAGES.SUBCATEGORY.NOT_FOUND, 404);

    // 🔹 2. Find all products linked to this subcategory
    const products = await Product.find({ subcategory: subCategoryId });

    // 🔹 3. Delete all product images from Cloudinary
    await Promise.all(
      products.flatMap((product) =>
        (product.images || []).map(async (img) => {
          const publicId = img.split("/").slice(-1)[0].split(".")[0];
          await cloudinaryService.deleteImage(
            publicId,
            config.PRODUCT_IMAGE_PATH
          );
        })
      )
    );

    // 🔹 4. Delete the products from DB
    await Product.deleteMany({ subcategory: subCategoryId });

    // 🔹 5. Delete subcategory image from Cloudinary if exists
    if (subCategoryData.image) {
      const publicId = subCategoryData.image
        .split("/")
        .slice(-1)[0]
        .split(".")[0];
      await cloudinaryService.deleteImage(
        publicId,
        config.SUBCATEGORY_IMAGE_PATH
      );
    }

    // 🔹 6. Delete subcategory from DB
    await SubCategory.findByIdAndDelete(subCategoryId);

    res.json({
      message: "Subcategory and all related products deleted successfully.",
    });
  });
}
