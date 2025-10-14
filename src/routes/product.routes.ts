import express from "express";
import { ProductController } from "@controllers/product.controller";

import { validateRequest } from "@middlewares/validate.middleware";
import { createProductSchema } from "@validators/product.validator";
import { upload } from "@middlewares/upload.middleware";

const router = express.Router();

router.post(
  "/",
  upload.array("images", 3),
  validateRequest(createProductSchema),
  ProductController.create
);
router.get("/", ProductController.getAll);
router.put("/:id", upload.array("images", 3), ProductController.update);
router.delete("/:id", ProductController.delete);

export default router;
