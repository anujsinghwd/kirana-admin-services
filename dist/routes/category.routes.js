"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const category_controller_1 = require("../controllers/category.controller");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// Protected routes
router.use(auth_middleware_1.protect);
// CRUD routes
router.get("/", category_controller_1.CategoryController.getAll);
router.get("/:id", category_controller_1.CategoryController.getById);
router.post("/", upload_middleware_1.upload.single("image"), category_controller_1.CategoryController.create);
router.put("/:id", upload_middleware_1.upload.single("image"), category_controller_1.CategoryController.update);
router.delete("/:id", category_controller_1.CategoryController.delete);
router.put("/remove/image", category_controller_1.CategoryController.removeImage);
exports.default = router;
