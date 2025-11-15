"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AppError_1 = require("../utils/AppError");
const config_1 = __importDefault(require("../config/config"));
const User_1 = __importDefault(require("../models/User"));
const errorMessages_1 = __importDefault(require("../config/errorMessages"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token)
        return next(new AppError_1.AppError(errorMessages_1.default.AUTH.MISSING_TOKEN, 401));
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.JWT_SECRET);
        const user = await User_1.default.findById(decoded.id);
        if (!user)
            return next(new AppError_1.AppError(errorMessages_1.default.AUTH.USER_NOT_FOUND, 401));
        // attach user to request
        req.user = user;
        next();
    }
    catch (err) {
        console.log(err);
        return next(new AppError_1.AppError("Invalid token", 401));
    }
};
exports.protect = protect;
// Optional: role-based authorization
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError_1.AppError(errorMessages_1.default.AUTH.PERMISSION_ISSUE, 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
