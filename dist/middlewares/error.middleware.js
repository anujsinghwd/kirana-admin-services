"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";
    // Log error
    logger_1.default.error(`Error => Method: ${req.method}, URL: ${req.originalUrl}, Status: ${err.statusCode}, Message: ${err.message}, Stack: ${err.stack}`);
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
    });
};
exports.globalErrorHandler = globalErrorHandler;
