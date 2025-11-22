import { Router } from "express";
import { InventoryController } from "@controllers/inventory.controller";
import { protect } from "@middlewares/auth.middleware";
import { validateInventoryPurchase, validateInventoryDamage, validateInventoryReturn } from "@validators/inventory.validator";

const router = Router();

// All inventory routes require admin authentication
router.use(protect);

// Purchase management
router.post("/purchase", validateInventoryPurchase, InventoryController.recordPurchase);
router.get("/purchases", InventoryController.getAllPurchases);
router.get("/purchases/:productId", InventoryController.getPurchaseHistory);

// Damage tracking
router.post("/damage", validateInventoryDamage, InventoryController.markAsDamaged);

// Return processing
router.post("/return", validateInventoryReturn, InventoryController.processReturn);

// Status and reporting
router.get("/status/:productId", InventoryController.getInventoryStatus);
router.get("/transactions", InventoryController.getTransactionHistory);
router.get("/profit-report", InventoryController.getProfitReport);

export default router;
