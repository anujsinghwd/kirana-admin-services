import mongoose, { Schema, Document } from "mongoose";

export interface ICategoryDTO {
  name: {
    en: string;
    hi: string;
  };
  description?: {
    en: string;
    hi: string;
  };
  image?: string;
  published?: boolean;
}
export interface ICategory extends ICategoryDTO, Document { }

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      en: { type: String, required: true, unique: true },
      hi: { type: String, required: true }
    },
    description: {
      en: { type: String },
      hi: { type: String }
    },
    image: { type: String },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>("Category", CategorySchema);
