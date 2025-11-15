import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "@utils/AppError";
import config from "@config/config";
import User from "@models/User";
import ERROR_MESSAGES from "@config/errorMessages";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return next(new AppError(ERROR_MESSAGES.AUTH.MISSING_TOKEN, 401));

  try {
    const decoded: any = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError(ERROR_MESSAGES.AUTH.USER_NOT_FOUND, 401));
    // attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    return next(new AppError("Invalid token", 401));
  }
};

// Optional: role-based authorization
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(ERROR_MESSAGES.AUTH.PERMISSION_ISSUE, 403)
      );
    }
    next();
  };
};
