"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
// Routes
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const db_1 = require("./utils/db");
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const subcategory_routes_1 = __importDefault(require("./routes/subcategory.routes"));
// Middlewares
const logger_middleware_1 = require("./middlewares/logger.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const notFound_middleware_1 = require("./middlewares/notFound.middleware");
dotenv_1.default.config();
const corsOptions = {
    origin: ['http://localhost:5173', 'https://kirana-admin-app.vercel.app'], // Allow only requests from this origin
    methods: 'GET,POST,PUT,DELETE', // Allow only these methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow only these headers
};
class App {
    constructor(port) {
        this.app = (0, express_1.default)();
        this.port = port || process.env.PORT || 5001;
        (0, db_1.connectDB)();
        this.initializeMiddlewares();
        this.initializeRoutes();
    }
    initializeMiddlewares() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)(corsOptions));
        this.app.use(body_parser_1.default.json());
        this.app.use(body_parser_1.default.urlencoded({ extended: true }));
        this.app.use(logger_middleware_1.requestLogger);
    }
    initializeRoutes() {
        this.app.use("/api/products", product_routes_1.default);
        this.app.use("/api/categories", category_routes_1.default);
        this.app.use("/api/subcategories", subcategory_routes_1.default);
        this.app.use('/api/users', user_routes_1.default);
        // this.app.use("/api/orders", orderRoutes);
        this.app.use(notFound_middleware_1.notFoundHandler);
        this.app.use(error_middleware_1.globalErrorHandler);
        this.app.get('/', (_, res) => res.send('✅ Kirana Admin API running'));
    }
    listen() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
}
exports.default = App;
