import { v2 as cloudinary } from "cloudinary";
import config from "@config/config";
import fs from "fs";
import streamifier from "streamifier";
import { AppError } from "@utils/AppError";
import logger from "@config/logger";

class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: config.CLOUDINARY.CLOUD_NAME,
      api_key: config.CLOUDINARY.API_KEY,
      api_secret: config.CLOUDINARY.API_SECRET,
    });
  }

  /**
   * ✅ Upload image — supports both memory buffer and file path
   * @param file - either a string (path) or Buffer
   * @param folder - Cloudinary folder name
   */
  async uploadImage(file: string | Buffer, folder: string): Promise<string> {
    try {
      logger.info(`Start uploading file to folder: ${folder}`);

      // If file is a buffer (from memoryStorage)
      if (Buffer.isBuffer(file)) {
        return await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (error, result) => {
              if (error || !result) {
                logger.error("Cloudinary upload error:", error);
                return reject(new AppError(`Cloudinary upload error: ${error?.message}`, 400));
              }
              resolve(result.secure_url);
            }
          );

          streamifier.createReadStream(file).pipe(uploadStream);
        });
      }

      // Otherwise, treat as file path (for backward compatibility)
      const result = await cloudinary.uploader.upload(file, {
        folder,
        resource_type: "image",
      });

      // delete local file after upload
      if (fs.existsSync(file)) fs.unlinkSync(file);

      return result.secure_url;
    } catch (error: any) {
      logger.error("Cloudinary upload error:", error);
      throw new AppError(`Cloudinary upload error: ${error.message}`, 400);
    }
  }

  /**
   * ✅ Delete image from Cloudinary
   * @param publicId - Cloudinary public ID
   * @param folder - Cloudinary folder name
   */
  async deleteImage(publicId: string, folder: string) {
    try {
      logger.info(`Start deleting fileId: ${publicId}`);
      const result = await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      logger.info(`Image Deleted: ${result}`);
      return result;
    } catch (error: any) {
      logger.error("Cloudinary delete error:", error);
      throw new AppError(`Cloudinary delete error: ${error.message}`, 400);
    }
  }
}

export const cloudinaryService = new CloudinaryService();
