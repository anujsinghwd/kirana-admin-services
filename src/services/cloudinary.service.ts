import { v2 as cloudinary } from 'cloudinary'
import config from '@config/config'
import fs from 'fs'
import { AppError } from '@utils/AppError'
import logger from '@config/logger'

class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: config.CLOUDINARY.CLOUD_NAME,
      api_key: config.CLOUDINARY.API_KEY,
      api_secret: config.CLOUDINARY.API_SECRET
    })
  }

  async uploadImage(filePath: string, folder: string = 'products') {
    try {
      logger.info(`Start uploading file: ${filePath}`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image'
      })
      fs.unlinkSync(filePath) // delete local file after upload
      return result.secure_url
    } catch (error: any) {
      throw new AppError(`Cloudinary upload error: ${error.message}`, 400);
    }
  }

  async deleteImage(publicId: string) {
    try {
      logger.info(`Start deleting fileId: ${publicId}`);
      const result = await cloudinary.uploader.destroy(`products/${publicId}`)
      logger.info(`Image Deleted: ${result}`);
      return result
    } catch (error: any) {
      throw new AppError(`Cloudinary delete error: ${error.message}`, 400);
    }
  }
}

export const cloudinaryService = new CloudinaryService();
