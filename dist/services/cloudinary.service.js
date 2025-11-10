"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const config_1 = __importDefault(require("../config/config"));
const fs_1 = __importDefault(require("fs"));
const streamifier_1 = __importDefault(require("streamifier"));
const AppError_1 = require("../utils/AppError");
const logger_1 = __importDefault(require("../config/logger"));
class CloudinaryService {
    constructor() {
        cloudinary_1.v2.config({
            cloud_name: config_1.default.CLOUDINARY.CLOUD_NAME,
            api_key: config_1.default.CLOUDINARY.API_KEY,
            api_secret: config_1.default.CLOUDINARY.API_SECRET,
        });
    }
    /**
     * ✅ Upload image — supports both memory buffer and file path
     * @param file - either a string (path) or Buffer
     * @param folder - Cloudinary folder name
     */
    async uploadImage(file, folder) {
        try {
            logger_1.default.info(`Start uploading file to folder: ${folder}`);
            // If file is a buffer (from memoryStorage)
            if (Buffer.isBuffer(file)) {
                return await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary_1.v2.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
                        if (error || !result) {
                            logger_1.default.error("Cloudinary upload error:", error);
                            return reject(new AppError_1.AppError(`Cloudinary upload error: ${error?.message}`, 400));
                        }
                        resolve(result.secure_url);
                    });
                    streamifier_1.default.createReadStream(file).pipe(uploadStream);
                });
            }
            // Otherwise, treat as file path (for backward compatibility)
            const result = await cloudinary_1.v2.uploader.upload(file, {
                folder,
                resource_type: "image",
            });
            // delete local file after upload
            if (fs_1.default.existsSync(file))
                fs_1.default.unlinkSync(file);
            return result.secure_url;
        }
        catch (error) {
            logger_1.default.error("Cloudinary upload error:", error);
            throw new AppError_1.AppError(`Cloudinary upload error: ${error.message}`, 400);
        }
    }
    /**
     * ✅ Delete image from Cloudinary
     * @param publicId - Cloudinary public ID
     * @param folder - Cloudinary folder name
     */
    async deleteImage(publicId, folder) {
        try {
            logger_1.default.info(`Start deleting fileId: ${publicId}`);
            const result = await cloudinary_1.v2.uploader.destroy(`${folder}/${publicId}`);
            logger_1.default.info(`Image Deleted: ${result}`);
            return result;
        }
        catch (error) {
            logger_1.default.error("Cloudinary delete error:", error);
            throw new AppError_1.AppError(`Cloudinary delete error: ${error.message}`, 400);
        }
    }
}
exports.cloudinaryService = new CloudinaryService();
