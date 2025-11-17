import { Router } from "express";
import { AdminUserController } from "@controllers/admin.user.controller";
import { protect } from "@middlewares/auth.middleware";

import { validateRequest } from "@middlewares/validate.middleware";
import { registerSchema, loginSchema } from "@validators/admin.user.validator";

const router = Router();

// Public routes with validation
router.post('/register', validateRequest(registerSchema), AdminUserController.register);
router.post('/login', validateRequest(loginSchema), AdminUserController.login);

// Protected routes
router.use(protect);

router.get("/me", AdminUserController.getMe);

// Admin-only route
router.get("/", AdminUserController.getAllUsers);

export default router;
