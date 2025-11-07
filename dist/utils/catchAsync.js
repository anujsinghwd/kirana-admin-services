"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = void 0;
const AppError_1 = require("./AppError");
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch((err) => {
            if (!(err instanceof AppError_1.AppError))
                err = new AppError_1.AppError(err.message || "Internal Server Error", 500);
            next(err);
        });
    };
};
exports.catchAsync = catchAsync;
