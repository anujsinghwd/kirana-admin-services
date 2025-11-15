"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// Protected routes
router.use(auth_middleware_1.protect);
// CRUD routes
router.get("/", order_controller_1.getOrderDetailsController);
router.get("/:orderId", order_controller_1.getOrderByIdController);
router.put("/:orderId/status", order_controller_1.updateOrderStatusController);
router.put("/:orderId/assign", order_controller_1.assignPersonnelController);
exports.default = router;
