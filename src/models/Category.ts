import mongoose, { Schema, Document } from "mongoose";

export interface ICategoryDTO {
  name: string;
  description?: string;
  image?: string;
  published?: boolean;
}
export interface ICategory extends ICategoryDTO, Document {}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    image: { type: String },
    published: {type: Boolean, default: true}
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>("Category", CategorySchema);
