import { catchAsync } from "@utils/catchAsync";
import Product, { IProductDTO } from "@models/Product";
import { AppError } from "@utils/AppError";
import ERROR_MESSAGES from "@config/errorMessages";
import { cloudinaryService } from "services/cloudinary.service";
import config from "@config/config";
import { getImagePublicId } from "@utils/utils";

export class ProductController {
  public static getAll = catchAsync(async (req, res) => {
    const products = await Product.find().populate("category");
    if (!products) throw new AppError(ERROR_MESSAGES.PRODUCT.FETCH_FAIL, 500);
    res.json(products);
  });

  public static getById = catchAsync(async (req, res) => {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT.NOT_FOUND, 404);
    res.json(product);
  });

  public static create = catchAsync(async (req, res) => {
    const { name, description, price, category, stock, sku, unit, discount, offerPrice, subcategory } = req.body;

    const existing = await Product.findOne({ name, category });
    if (existing) throw new AppError(ERROR_MESSAGES.PRODUCT.DUPLICATE, 400);

    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map((file: any) =>
        cloudinaryService.uploadImage(file.path, config.PRODUCT_IMAGE_PATH)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    const createProductObj: Partial<IProductDTO> = {
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
    if(sku) {
      createProductObj.sku = sku;
    }

    const product = await Product.create(createProductObj);
    // const product = await Product.create(req.body);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT.CREATE_FAIL, 400);
    res.status(201).json(product);
  });

  public static update = catchAsync(async (req, res) => {
    try {
      const { name, description, price, category, stock, sku } = req.body;
      let deletedImages = [];

      if (req.body.deletedImages) {
        deletedImages = JSON.parse(req.body.deletedImages);
        for (const url of deletedImages) {
          const publicId = url.split("/").slice(-1)[0].split(".")[0];
          await cloudinaryService.deleteImage(publicId, config.PRODUCT_IMAGE_PATH);
        }
      }

      const newImageUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const result = await cloudinaryService.uploadImage(file.path, config.PRODUCT_IMAGE_PATH);
          newImageUrls.push(result);
        }
      }

      const product = await Product.findById(req.params.id);
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating product" });
    }
  });

  public static delete = catchAsync(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT.NOT_FOUND, 404);

    // ✅ Remove all associated Cloudinary images
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          // Extract public ID from Cloudinary URL
          const publicId = getImagePublicId(imageUrl);
          if (publicId) {
            await cloudinaryService.deleteImage(publicId, config.PRODUCT_IMAGE_PATH);
          }
        } catch (err) {
          console.error(
            `Failed to delete image from Cloudinary: ${imageUrl}`,
            err
          );
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({ message: "Product and associated images deleted successfully" });
  });
}
