"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUserController = void 0;
const catchAsync_1 = require("../utils/catchAsync");
const AdminUser_1 = __importDefault(require("../models/AdminUser"));
const AppError_1 = require("../utils/AppError");
const errorMessages_1 = __importDefault(require("../config/errorMessages"));
const jwt_1 = require("../utils/jwt");
class AdminUserController {
}
exports.AdminUserController = AdminUserController;
_a = AdminUserController;
AdminUserController.register = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existingUser = await AdminUser_1.default.findOne({ email });
    if (existingUser)
        throw new AppError_1.AppError(errorMessages_1.default.USER.EMAIL_EXISTS, 400);
    const user = await AdminUser_1.default.create({ name, email, password, role });
    const token = (0, jwt_1.signToken)({ id: user._id });
    res.status(201).json({ user, token });
});
AdminUserController.login = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        throw new AppError_1.AppError(errorMessages_1.default.USER.EMAIL_PASS_REQ, 400);
    const user = await AdminUser_1.default.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
        throw new AppError_1.AppError(errorMessages_1.default.USER.INVALID_EMAIL_PASS, 401);
    }
    const token = (0, jwt_1.signToken)({ id: user._id });
    res.status(200).json({ user, token });
});
AdminUserController.getMe = (0, catchAsync_1.catchAsync)(async (req, res) => {
    res.status(200).json(req.user);
});
AdminUserController.getAllUsers = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const users = await AdminUser_1.default.find();
    res.status(200).json(users);
});
