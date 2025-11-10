import { catchAsync } from "@utils/catchAsync";
import Product from "@models/Product";
import { AppError } from "@utils/AppError";
import ERROR_MESSAGES from "@config/errorMessages";
import { cloudinaryService } from "services/cloudinary.service";
import config from "@config/config";

export class ProductController {
  /** ------------------ GET ALL ------------------ */
  public static getAll = catchAsync(async (req, res) => {
    const { category, subcategory, published } = req.query;

    const filter: any = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (published !== undefined) filter.published = published === "true";

    const products = await Product.find(filter)
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
  public static getById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate("category", "name _id")
      .populate("subcategory", "name _id");

    if (!product)
      throw new AppError(ERROR_MESSAGES.PRODUCT.NOT_FOUND || "Product not found", 404);

    res.status(200).json({
      success: true,
      error: false,
      message: "Product fetched successfully",
      data: product,
    });
  });

  /** ------------------ CREATE ------------------ */
  public static create = catchAsync(async (req, res) => {
    const {
      name,
      description,
      category,
      subcategory,
      published,
      isLoose,
      looseConfig,
      variants,
    } = req.body;

    // Prevent duplicate product name in same category
    const existing = await Product.findOne({ name, category });
    if (existing) throw new AppError(ERROR_MESSAGES.PRODUCT.DUPLICATE, 400);

    // Handle images upload
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map((file: Express.Multer.File) =>
        cloudinaryService.uploadImage(file.buffer, config.PRODUCT_IMAGE_PATH)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    // Parse variants or looseConfig safely
    let parsedVariants: any[] = [];
    let parsedLooseConfig: any = null;
    try {
      if (variants && typeof variants === "string") {
        parsedVariants = JSON.parse(variants);
      } else if (Array.isArray(variants)) {
        parsedVariants = variants;
      }

      if (looseConfig && typeof looseConfig === "string") {
        parsedLooseConfig = JSON.parse(looseConfig);
      } else if (typeof looseConfig === "object") {
        parsedLooseConfig = looseConfig;
      }
    } catch (err) {
      throw new AppError("Invalid JSON in variants or looseConfig", 400);
    }

    // Validation: cannot have both variants and looseConfig
    if (isLoose === "true" && parsedVariants.length > 0)
      throw new AppError("Loose products cannot contain variants", 400);

    const product = await Product.create({
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
      throw new AppError(ERROR_MESSAGES.PRODUCT.CREATE_FAIL || "Failed to create product", 400);

    res.status(201).json({
      success: true,
      error: false,
      message: "Product created successfully",
      data: product,
    });
  });

  /** ------------------ UPDATE ------------------ */
  public static update = catchAsync(async (req, res) => {
    const {
      name,
      description,
      category,
      subcategory,
      published,
      isLoose,
      looseConfig,
    } = req.body;

    let variants: any[] = [];
    let deletedImages: string[] = [];
    let parsedLooseConfig: any = null;

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
    } catch (error) {
      console.error("❌ JSON parsing error:", error);
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid JSON in variants, looseConfig, or deletedImages",
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT.NOT_FOUND, 404);

    // ✅ Handle deleted images
    if (deletedImages.length > 0) {
      for (const url of deletedImages) {
        try {
          const publicId = url.split("/").slice(-1)[0].split(".")[0];
          await cloudinaryService.deleteImage(publicId, config.PRODUCT_IMAGE_PATH);
        } catch (err) {
          console.warn(`Failed to delete image: ${url}`);
        }
      }
    }

    // ✅ Upload new images
    let newImageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map((file: Express.Multer.File) =>
        cloudinaryService.uploadImage(file.buffer, config.PRODUCT_IMAGE_PATH)
      );
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
    } else {
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
  public static delete = catchAsync(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product)
      throw new AppError(ERROR_MESSAGES.PRODUCT.NOT_FOUND, 404);

    // ✅ Delete associated images
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
          await cloudinaryService.deleteImage(publicId, config.PRODUCT_IMAGE_PATH);
        } catch (err) {
          console.warn(`Failed to delete Cloudinary image: ${imageUrl}`);
        }
      }
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      error: false,
      message: "Product deleted successfully",
    });
  });
}
