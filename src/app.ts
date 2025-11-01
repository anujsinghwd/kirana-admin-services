import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import helmet from 'helmet';

// Routes
import productRoutes from "@routes/product.routes";
import { connectDB } from "@utils/db";
import categoryRoutes from "@routes/category.routes";
import userRoutes from '@routes/user.routes';
import subCategoryRoutes from '@routes/subcategory.routes';

// Middlewares
import { requestLogger } from '@middlewares/logger.middleware';
import { globalErrorHandler } from '@middlewares/error.middleware';
import { notFoundHandler } from '@middlewares/notFound.middleware';


dotenv.config();

const corsOptions = {
    origin: 'http://localhost:5173', // Allow only requests from this origin
    methods: 'GET,POST,PUT,DELETE', // Allow only these methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow only these headers
};

class App {
  public app: Application;
  private port: string | number;

  constructor(port?: string | number) {
    this.app = express();
    this.port = port || process.env.PORT || 5001;
    connectDB();
    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares() {
    this.app.use(helmet());
    this.app.use(cors(corsOptions));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(requestLogger);
  }

  private initializeRoutes() {
    this.app.use("/api/products", productRoutes);
    this.app.use("/api/categories", categoryRoutes);
    this.app.use("/api/subcategories", subCategoryRoutes);
    this.app.use('/api/users', userRoutes);
    // this.app.use("/api/orders", orderRoutes);
    this.app.use(notFoundHandler);
    this.app.use(globalErrorHandler);

    this.app.get('/', (_, res) => res.send('✅ Kirana Admin API running'));
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

export default App;
