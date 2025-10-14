import { catchAsync } from "@utils/catchAsync";
import Product from "@models/Product";
import { AppError } from "@utils/AppError";
import ERROR_MESSAGES from "@config/errorMessages";

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
    const { name, category } = req.body;

    const existing = await Product.findOne({ name, category });
    if (existing) throw new AppError(ERROR_MESSAGES.PRODUCT.DUPLICATE, 400);

    const product = await Product.create(req.body);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT.CREATE_FAIL, 400);
    res.status(201).json(product);
  });

  public static update = catchAsync(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT.NOT_FOUND, 404);
    res.json(product);
  });

  public static delete = catchAsync(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT.NOT_FOUND, 404);
    res.json({ message: "Product deleted successfully" });
  });
}
