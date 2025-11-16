// routes/dashboard.routes.ts
import express from "express";
import { getDashboardStats } from "@controllers/dashboard.controller";
import { protect } from "@middlewares/auth.middleware";

const router = express.Router();

router.use(protect);

// admin stats route - protected (admin or staff)
router.get("/stats", getDashboardStats);

export default router;
