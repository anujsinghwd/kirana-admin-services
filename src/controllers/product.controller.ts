import { catchAsync } from "@utils/catchAsync";
import Product, { IProductDTO } from "@models/Product";
import { AppError } from "@utils/AppError";
import ERROR_MESSAGES from "@config/errorMessages";
import { cloudinaryService } from "services/cloudinary.service";
import config from "@config/config";
import { getImagePublicId } from "@utils/utils";

export class ProductController {
  public static getAll = catchAsync(async (req, res) => {
    // Optional query filters
    const { category, subcategory, published } = req.query;

    // Build dynamic filter
    const filter: any = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (published !== undefined) filter.published = published === "true";

    // Fetch products with population
    const products = await Product.find(filter)
      .populate("category", "name _id") // only populate needed fields
      .populate("subcategory", "name _id")
      .select(
        "name description category subcategory images variants published createdAt updatedAt"
      )
      .sort({ createdAt: -1 });

    // Handle empty list
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "No products found",
        data: [],
      });
    }

    // ✅ Format variants neatly (optional)
    const formattedProducts = products.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      category: p.category,
      subcategory: p.subcategory,
      images: p.images,
      published: p.published,
      variants: p.variants?.map((v) => ({
        unitValue: v.unitValue,
        unitType: v.unitType,
        price: v.price,
        offerPrice: v.offerPrice,
        discount: v.discount,
        stock: v.stock,
        sku: v.sku,
        shelfLife: v.shelfLife
          ? {
              duration: v.shelfLife.duration,
              unit: v.shelfLife.unit,
              manufacturingDate: v.shelfLife.manufacturingDate,
              expiryDate: v.shelfLife.expiryDate,
              bestBefore: v.shelfLife.bestBefore,
            }
          : null,
      })),
    }));

    // Send response
    res.status(200).json({
      success: true,
      error: false,
      message: "Products fetched successfully",
      data: formattedProducts,
    });
  });

  public static getById = catchAsync(async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ Fetch product with population
      const product = await Product.findById(id)
        .populate("category", "name _id")
        .populate("subcategory", "name _id")
        .select(
          "name description category subcategory images variants published createdAt updatedAt"
        );

      // ✅ If not found
      if (!product) {
        return res.status(404).json({
          success: false,
          error: true,
          message: "Product not found",
        });
      }

      // ✅ Format variants cleanly
      const formattedProduct = {
        _id: product._id,
        name: product.name,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory,
        images: product.images,
        published: product.published,
        variants: product.variants?.map((v) => ({
          unitValue: v.unitValue,
          unitType: v.unitType,
          price: v.price,
          offerPrice: v.offerPrice,
          discount: v.discount,
          stock: v.stock,
          sku: v.sku,
          shelfLife: v.shelfLife
            ? {
                duration: v.shelfLife.duration,
                unit: v.shelfLife.unit,
                manufacturingDate: v.shelfLife.manufacturingDate,
                expiryDate: v.shelfLife.expiryDate,
                bestBefore: v.shelfLife.bestBefore,
              }
            : null,
        })),
      };

      // ✅ Send response
      res.status(200).json({
        success: true,
        error: false,
        message: "Product fetched successfully",
        data: formattedProduct,
      });
    } catch (error: any) {
      console.error("Error fetching product by ID:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: error.message || "Error fetching product details",
      });
    }
  });

  public static create = catchAsync(async (req, res) => {
    const { name, description, category, subcategory, variants } = req.body;

    const existing = await Product.findOne({ name, category });
    if (existing) throw new AppError(ERROR_MESSAGES.PRODUCT.DUPLICATE, 400);

    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map((file: any) =>
        cloudinaryService.uploadImage(file.path, config.PRODUCT_IMAGE_PATH)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    const product = await Product.create({
      name,
      description,
      category,
      subcategory,
      images: imageUrls,
      variants, // ✅ Save multiple variants
    });

    const productNew = await Product.create(product);
    if (!productNew)
      throw new AppError(ERROR_MESSAGES.PRODUCT.CREATE_FAIL, 400);
    res.status(201).json(productNew);
  });

  public static update = catchAsync(async (req, res) => {
    try {
      const { name, description, category, subcategory, published } = req.body;

      // ✅ Parse JSON fields safely (since coming from form-data)
      let variants = [];
      let deletedImages = [];

      try {
        if (req.body.variants && typeof req.body.variants === "string") {
          variants = JSON.parse(req.body.variants);
        } else if (Array.isArray(req.body.variants)) {
          variants = req.body.variants;
        }

        if (
          req.body.deletedImages &&
          typeof req.body.deletedImages === "string"
        ) {
          deletedImages = JSON.parse(req.body.deletedImages);
        }
      } catch (parseError) {
        console.error("Error parsing JSON fields:", parseError);
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in request body (variants or deletedImages)",
        });
      }

      // ✅ Handle deleted images
      if (deletedImages.length > 0) {
        for (const url of deletedImages) {
          const publicId = url.split("/").slice(-1)[0].split(".")[0];
          await cloudinaryService.deleteImage(
            publicId,
            config.PRODUCT_IMAGE_PATH
          );
        }
      }

      // ✅ Upload new images (if any)
      let newImageUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        const uploadPromises = req.files.map((file: any) =>
          cloudinaryService.uploadImage(file.path, config.PRODUCT_IMAGE_PATH)
        );
        newImageUrls = await Promise.all(uploadPromises);
      }

      // ✅ Find product
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // ✅ Update basic fields
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

      // ✅ Merge or replace images
      product.images = [
        ...(product.images || []).filter((i) => !deletedImages.includes(i)),
        ...newImageUrls,
      ];

      // ✅ Update variants (replace fully)
      if (Array.isArray(variants) && variants.length > 0) {
        product.variants = variants;
      }

      await product.save();

      res.status(200).json({
        success: true,
        error: false,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(500).json({
        success: false,
        error: true,
        message: error.message || "Error updating product",
      });
    }
  });

  public static delete = catchAsync(async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ Find product
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: true,
          message: "Product not found",
        });
      }

      // ✅ Remove all associated Cloudinary images
      if (product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
          try {
            // Extract public ID from Cloudinary URL
            const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
            if (publicId) {
              await cloudinaryService.deleteImage(
                publicId,
                config.PRODUCT_IMAGE_PATH
              );
            }
          } catch (err) {
            console.error(
              `Failed to delete Cloudinary image: ${imageUrl}`,
              err
            );
          }
        }
      }

      // ✅ Delete product document
      await Product.findByIdAndDelete(id);

      // ✅ Respond success
      return res.status(200).json({
        success: true,
        error: false,
        message: "Product and associated images deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      return res.status(500).json({
        success: false,
        error: true,
        message: error.message || "Error deleting product",
      });
    }
  });
}
