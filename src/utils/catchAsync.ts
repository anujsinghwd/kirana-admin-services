import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const catchAsync = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch((err) => {
      if (!(err instanceof AppError))
        err = new AppError(err.message || "Internal Server Error", 500);
      next(err);
    });
  };
};
