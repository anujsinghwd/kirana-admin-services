import express from "express";
import { SubCategoryController } from "@controllers/subcategories.controller";
import { upload } from "@middlewares/upload.middleware";
import { protect } from "@middlewares/auth.middleware";

const router = express.Router();

// Protected routes
router.use(protect);

// 🟢 Get all subcategories
router.get("/", SubCategoryController.getAll);

// 🟢 Get subcategories by category ID
router.get("/category/:categoryId", SubCategoryController.getByCategoryId);

// 🟢 Get a specific subcategory by ID
router.get("/:id", SubCategoryController.getById);

// 🟢 Create a new subcategory
router.post("/", upload.single("image"), SubCategoryController.create);

// 🟢 Update a subcategory
router.put("/:id", upload.single("image"), SubCategoryController.update);

// 🟢 Delete a subcategory
router.delete("/:id", SubCategoryController.delete);

// 🟢 Remove subcategory image
router.put("/remove/image", SubCategoryController.removeImage);

export default router;
