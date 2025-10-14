import { Request, Response, NextFunction } from "express";
import { AppError } from "@utils/AppError";
import logger from "@config/logger";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log error
  logger.error(
    `Error => Method: ${req.method}, URL: ${req.originalUrl}, Status: ${err.statusCode}, Message: ${err.message}, Stack: ${err.stack}`
  );

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
