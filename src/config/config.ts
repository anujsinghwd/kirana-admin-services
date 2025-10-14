import dotenv from 'dotenv';
import type { StringValue } from "ms";
dotenv.config();

export default {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/kirana',
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads/',   
  API_PREFIX: '/api',
  JWT_SECRET: process.env.JWT_SECRET || 'test',
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '1D') as StringValue | number,
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
  }
};
