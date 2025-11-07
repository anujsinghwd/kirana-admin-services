"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const subcategories_controller_1 = require("../controllers/subcategories.controller");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = express_1.default.Router();
// 🟢 Get all subcategories
router.get("/", subcategories_controller_1.SubCategoryController.getAll);
// 🟢 Get subcategories by category ID
router.get("/category/:categoryId", subcategories_controller_1.SubCategoryController.getByCategoryId);
// 🟢 Get a specific subcategory by ID
router.get("/:id", subcategories_controller_1.SubCategoryController.getById);
// 🟢 Create a new subcategory
router.post("/", upload_middleware_1.upload.single("image"), subcategories_controller_1.SubCategoryController.create);
// 🟢 Update a subcategory
router.put("/:id", upload_middleware_1.upload.single("image"), subcategories_controller_1.SubCategoryController.update);
// 🟢 Delete a subcategory
router.delete("/:id", subcategories_controller_1.SubCategoryController.delete);
// 🟢 Remove subcategory image
router.put("/remove/image", subcategories_controller_1.SubCategoryController.removeImage);
exports.default = router;
