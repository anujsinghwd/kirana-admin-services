import Category, { ICategoryDTO } from "@models/Category";
import { AppError } from "@utils/AppError";
import { catchAsync } from "@utils/catchAsync";
import ERROR_MESSAGES from "@config/errorMessages";
import { cloudinaryService } from "services/cloudinary.service";
import config from "@config/config";
import { Types } from "mongoose";

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

    const updateObj: ICategoryDTO = {...req.body};
    if(imageUrl) {
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
    const categoryData = await Category.findById(req.params.id);
    const category = await Category.findByIdAndDelete(req.params.id);

    const publicId = categoryData?.image?.split("/").slice(-1)[0].split(".")[0];
    if (publicId) {
      await cloudinaryService.deleteImage(publicId, config.CATEGORY_IMAGE_PATH);
    }

    if (!category) throw new AppError(ERROR_MESSAGES.CATEGORY.DELETE_FAIL, 404);
    res.json({ message: ERROR_MESSAGES.CATEGORY.DELETE_SUCCESS });
  });
}
