import { Router } from "express";
import { UserController } from "@controllers/user.controller";
import { protect, restrictTo } from "@middlewares/auth.middleware";

import { validateRequest } from "@middlewares/validate.middleware";
import { registerSchema, loginSchema } from "@validators/user.validator";

const router = Router();

// Public routes with validation
router.post('/register', validateRequest(registerSchema), UserController.register);
router.post('/login', validateRequest(loginSchema), UserController.login);

// Protected routes
router.use(protect);

router.get("/me", UserController.getMe);

// Admin-only route
router.get("/", restrictTo("admin"), UserController.getAllUsers);

export default router;
