import { Schema, model, type HydratedDocument, type Model } from "mongoose";

export interface CategoryAttrs {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryAttrs>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: null, trim: true, maxlength: 500 },
    imageUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export type CategoryDocument = HydratedDocument<CategoryAttrs>;

export const Category: Model<CategoryAttrs> = model<CategoryAttrs>("Category", categorySchema);
