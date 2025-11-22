"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const inventory_validator_1 = require("../validators/inventory.validator");
const router = (0, express_1.Router)();
// All inventory routes require admin authentication
router.use(auth_middleware_1.protect);
// Purchase management
router.post("/purchase", inventory_validator_1.validateInventoryPurchase, inventory_controller_1.InventoryController.recordPurchase);
router.get("/purchases", inventory_controller_1.InventoryController.getAllPurchases);
router.get("/purchases/:productId", inventory_controller_1.InventoryController.getPurchaseHistory);
// Damage tracking
router.post("/damage", inventory_validator_1.validateInventoryDamage, inventory_controller_1.InventoryController.markAsDamaged);
// Return processing
router.post("/return", inventory_validator_1.validateInventoryReturn, inventory_controller_1.InventoryController.processReturn);
// Status and reporting
router.get("/status/:productId", inventory_controller_1.InventoryController.getInventoryStatus);
router.get("/transactions", inventory_controller_1.InventoryController.getTransactionHistory);
router.get("/profit-report", inventory_controller_1.InventoryController.getProfitReport);
exports.default = router;
