"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_user_controller_1 = require("../controllers/admin.user.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const admin_user_validator_1 = require("../validators/admin.user.validator");
const router = (0, express_1.Router)();
// Public routes with validation
router.post('/register', (0, validate_middleware_1.validateRequest)(admin_user_validator_1.registerSchema), admin_user_controller_1.AdminUserController.register);
router.post('/login', (0, validate_middleware_1.validateRequest)(admin_user_validator_1.loginSchema), admin_user_controller_1.AdminUserController.login);
// Protected routes
router.use(auth_middleware_1.protect);
router.get("/me", admin_user_controller_1.AdminUserController.getMe);
// Admin-only route
router.get("/", admin_user_controller_1.AdminUserController.getAllUsers);
exports.default = router;
