import express from "express";
import { CategoryController } from "@controllers/category.controller";

const router = express.Router();

// CRUD routes
router.get("/", CategoryController.getAll);
router.get("/:id", CategoryController.getById);
router.post("/", CategoryController.create);
router.put("/:id", CategoryController.update);
router.delete("/:id", CategoryController.delete);

export default router;
