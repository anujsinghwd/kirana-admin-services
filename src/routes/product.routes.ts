import express from "express";
import { ProductController } from "@controllers/product.controller";

import { validateRequest } from "@middlewares/validate.middleware";
import { createProductSchema } from "@validators/product.validator";

const router = express.Router();

router.post(
  "/",
  validateRequest(createProductSchema),
  ProductController.create
);
router.get("/", ProductController.getAll);
router.put("/:id", ProductController.update);
router.delete("/:id", ProductController.delete);

export default router;
