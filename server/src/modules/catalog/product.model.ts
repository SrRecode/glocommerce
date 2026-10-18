import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { PRODUCT_STATUSES, type ProductStatus } from "./catalog.types.js";

export interface ProductImageAttrs {
  url: string;
  alt: string;
}

export interface ProductAttrs {
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  category: Types.ObjectId | null;
  images: ProductImageAttrs[];
  stock: number;
  status: ProductStatus;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<ProductImageAttrs>(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "", maxlength: 160 },
  },
  { _id: false },
);

const productSchema = new Schema<ProductAttrs>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    brand: { type: String, default: null, trim: true, maxlength: 80 },
    // Prices are integer minor units (e.g. 499900 === Rs 4999.00).
    price: { type: Number, required: true, min: 0, validate: Number.isInteger },
    compareAtPrice: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value: number | null) => value === null || Number.isInteger(value),
        message: "compareAtPrice must be a whole number of minor units",
      },
    },
    currency: { type: String, required: true, default: "PKR", trim: true, maxlength: 3 },
    category: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    images: { type: [productImageSchema], default: [] },
    stock: { type: Number, required: true, default: 0, min: 0, validate: Number.isInteger },
    status: {
      type: String,
      required: true,
      enum: [...PRODUCT_STATUSES],
      default: "draft",
      index: true,
    },
    rating: { type: Number, required: true, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, required: true, default: 0, min: 0, validate: Number.isInteger },
    isFeatured: { type: Boolean, required: true, default: false },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

productSchema.index(
  { name: "text", description: "text", brand: "text" },
  { weights: { name: 10, brand: 5, description: 1 }, name: "product_text" },
);
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1 });

export type ProductDocument = HydratedDocument<ProductAttrs>;

export const Product: Model<ProductAttrs> = model<ProductAttrs>("Product", productSchema);
