import mongoose, { Document, Schema, Model } from "mongoose";

// 1️⃣ Define a TypeScript interface for the Address document
export interface IAddress extends Document {
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  mobile: number | null;
  status: boolean;
  userId: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 2️⃣ Define the Mongoose schema
const addressSchema = new Schema<IAddress>(
  {
    address_line: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    pincode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    mobile: {
      type: Number,
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // optional but recommended for clarity
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 3️⃣ Create the model with type safety
const AddressModel: Model<IAddress> =
  mongoose.models.Address || mongoose.model<IAddress>("Address", addressSchema);

export default AddressModel;
