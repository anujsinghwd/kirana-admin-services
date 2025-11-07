"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const user_validator_1 = require("../validators/user.validator");
const router = (0, express_1.Router)();
// Public routes with validation
router.post('/register', (0, validate_middleware_1.validateRequest)(user_validator_1.registerSchema), user_controller_1.UserController.register);
router.post('/login', (0, validate_middleware_1.validateRequest)(user_validator_1.loginSchema), user_controller_1.UserController.login);
// Protected routes
router.use(auth_middleware_1.protect);
router.get("/me", user_controller_1.UserController.getMe);
// Admin-only route
router.get("/", (0, auth_middleware_1.restrictTo)("admin"), user_controller_1.UserController.getAllUsers);
exports.default = router;
