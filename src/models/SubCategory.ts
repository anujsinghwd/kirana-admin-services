import mongoose, { Schema, Document, Types } from "mongoose";

// Data Transfer Object (used in controllers/services)
export interface ISubCategoryDTO {
  name: string;
  image?: string;
  category: Types.ObjectId[]; // references to Category documents
  published?: boolean;
}

// Complete Mongoose Document Interface
export interface ISubCategory extends ISubCategoryDTO, Document {}

const SubCategorySchema = new Schema<ISubCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    category: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],
    published: {type: Boolean, default: true}
  },
  { timestamps: true }
);

export default mongoose.model<ISubCategory>("SubCategory", SubCategorySchema);
