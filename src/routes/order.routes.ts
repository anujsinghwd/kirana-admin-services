import express from "express";
import {
  assignPersonnelController,
  getOrderByIdController,
  getOrderDetailsController,
  updateOrderStatusController,
} from "@controllers/order.controller";
import { protect } from "@middlewares/auth.middleware";

const router = express.Router();

// Protected routes
router.use(protect);

// CRUD routes
router.get("/", getOrderDetailsController);
router.get("/:orderId", getOrderByIdController);
router.put("/:orderId/status", updateOrderStatusController);
router.put("/:orderId/assign", assignPersonnelController);

export default router;
