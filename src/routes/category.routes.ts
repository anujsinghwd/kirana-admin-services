import express from "express";
import { CategoryController } from "@controllers/category.controller";
import { upload } from "@middlewares/upload.middleware";
import { protect } from "@middlewares/auth.middleware";

const router = express.Router();

// Protected routes
router.use(protect);
// CRUD routes
router.get("/", CategoryController.getAll);
router.get("/:id", CategoryController.getById);
router.post("/", upload.single("image"), CategoryController.create);
router.put("/:id", upload.single("image"), CategoryController.update);
router.delete("/:id", CategoryController.delete);
router.put("/remove/image", CategoryController.removeImage);

export default router;
