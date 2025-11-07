"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const AppError_1 = require("../utils/AppError");
const notFoundHandler = (req, res, next) => {
    next(new AppError_1.AppError(`Cannot find ${req.originalUrl} on this server`, 404));
};
exports.notFoundHandler = notFoundHandler;
