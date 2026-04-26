"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessCategoryFormData = void 0;
const AppError_1 = require("../utils/AppError");
const preprocessCategoryFormData = (req, res, next) => {
    try {
        if (req.body.name && typeof req.body.name === "string") {
            req.body.name = JSON.parse(req.body.name);
        }
        if (req.body.description && typeof req.body.description === "string") {
            req.body.description = JSON.parse(req.body.description);
        }
        next();
    }
    catch (err) {
        throw new AppError_1.AppError("Invalid JSON format in form data fields", 400);
    }
};
exports.preprocessCategoryFormData = preprocessCategoryFormData;
