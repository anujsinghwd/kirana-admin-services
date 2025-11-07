"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const config_1 = __importDefault(require("../config/config"));
const fs_1 = __importDefault(require("fs"));
const AppError_1 = require("../utils/AppError");
const logger_1 = __importDefault(require("../config/logger"));
class CloudinaryService {
    constructor() {
        cloudinary_1.v2.config({
            cloud_name: config_1.default.CLOUDINARY.CLOUD_NAME,
            api_key: config_1.default.CLOUDINARY.API_KEY,
            api_secret: config_1.default.CLOUDINARY.API_SECRET
        });
    }
    async uploadImage(filePath, folder) {
        try {
            logger_1.default.info(`Start uploading file: ${filePath}`);
            const result = await cloudinary_1.v2.uploader.upload(filePath, {
                folder,
                resource_type: 'image'
            });
            fs_1.default.unlinkSync(filePath); // delete local file after upload
            return result.secure_url;
        }
        catch (error) {
            throw new AppError_1.AppError(`Cloudinary upload error: ${error.message}`, 400);
        }
    }
    async deleteImage(publicId, folder) {
        try {
            logger_1.default.info(`Start deleting fileId: ${publicId}`);
            const result = await cloudinary_1.v2.uploader.destroy(`${folder}/${publicId}`);
            logger_1.default.info(`Image Deleted: ${result}`);
            return result;
        }
        catch (error) {
            throw new AppError_1.AppError(`Cloudinary delete error: ${error.message}`, 400);
        }
    }
}
exports.cloudinaryService = new CloudinaryService();
