"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessProductFormData = void 0;
const preprocessProductFormData = (req, res, next) => {
    try {
        // Parse variants JSON string if present
        if (req.body.variants && typeof req.body.variants === "string") {
            req.body.variants = JSON.parse(req.body.variants);
        }
        // Parse deletedImages if applicable
        if (req.body.deletedImages && typeof req.body.deletedImages === "string") {
            req.body.deletedImages = JSON.parse(req.body.deletedImages);
        }
        next();
    }
    catch (err) {
        return res.status(400).json({
            success: false,
            error: true,
            message: "Invalid JSON format in form data fields",
        });
    }
};
exports.preprocessProductFormData = preprocessProductFormData;
