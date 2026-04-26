import { AppError } from "@utils/AppError";
import { NextFunction, Request, Response } from "express";

export const preprocessCategoryFormData = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.body.name && typeof req.body.name === "string") {
            req.body.name = JSON.parse(req.body.name);
        }

        if (req.body.description && typeof req.body.description === "string") {
            req.body.description = JSON.parse(req.body.description);
        }
        next();
    } catch (err) {
        throw new AppError("Invalid JSON format in form data fields", 400);
    }
};
