import Category from "@models/Category";
import { AppError } from "@utils/AppError";
import { catchAsync } from "@utils/catchAsync";
import ERROR_MESSAGES from "@config/errorMessages";

export class CategoryController {
  public static getAll = catchAsync(async (req, res) => {
    console.log('came here');
    const categories = await Category.find();
    res.json(categories);
  });

  public static getById = catchAsync(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError(ERROR_MESSAGES.CATEGORY.NOT_FOUND, 404);
    res.json(category);
  });

  public static create = catchAsync(async (req, res) => {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  });

  public static update = catchAsync(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!category) throw new AppError(ERROR_MESSAGES.CATEGORY.NOT_FOUND, 404);
    res.json(category);
  });

  public static delete = catchAsync(async (req, res) => {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new AppError(ERROR_MESSAGES.CATEGORY.DELETE_FAIL, 404);
    res.json({ message: ERROR_MESSAGES.CATEGORY.DELETE_SUCCESS });
  });
}
