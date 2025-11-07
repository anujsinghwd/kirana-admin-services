"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const product_controller_1 = require("../controllers/product.controller");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const product_validator_1 = require("../validators/product.validator");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = express_1.default.Router();
router.post("/", upload_middleware_1.upload.array("images", 3), (0, validate_middleware_1.validateRequest)(product_validator_1.createProductSchema), product_controller_1.ProductController.create);
router.get("/", product_controller_1.ProductController.getAll);
router.put("/:id", upload_middleware_1.upload.array("images", 3), product_controller_1.ProductController.update);
router.delete("/:id", product_controller_1.ProductController.delete);
exports.default = router;
