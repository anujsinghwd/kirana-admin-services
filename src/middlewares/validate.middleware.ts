import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { AppError } from "@utils/AppError";

export const validateRequest = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return next(new AppError(message, 400));
    }
    next();
  };
};
