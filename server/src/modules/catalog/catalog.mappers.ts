import type { Types } from "mongoose";
import type { CategoryDocument } from "./category.model.js";
import type { ProductStatus } from "./catalog.types.js";
import type {
  PublicCategory,
  PublicProduct,
  PublicProductCategoryRef,
  PublicProductImage,
} from "./catalog.types.js";

/**
 * Structural shape the product mapper reads. Declared structurally (rather than
 * `Omit<ProductDocument, ...>`) so both a plain `ProductDocument` and a
 * `.populate<{ category: CategoryDocument | null }>()` result are assignable.
 */
export interface ProductWithCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  category: CategoryDocument | Types.ObjectId | null;
  images: { url: string; alt: string }[];
  stock: number;
  status: ProductStatus;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Distinguishes a populated category document from a raw ObjectId or `null`. */
export function isCategoryDocument(value: unknown): value is CategoryDocument {
  return (
    typeof value === "object" && value !== null && "name" in value && "slug" in value
  );
}

export function toPublicCategory(
  category: CategoryDocument,
  productCount?: number,
): PublicCategory {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    imageUrl: category.imageUrl ?? null,
    ...(productCount === undefined ? {} : { productCount }),
    createdAt: category.createdAt.toISOString(),
  };
}

function toProductCategoryRef(category: CategoryDocument): PublicProductCategoryRef {
  return { id: category._id.toString(), name: category.name, slug: category.slug };
}

export function toPublicProduct(product: ProductWithCategory): PublicProduct {
  const images: PublicProductImage[] = product.images.map((image) => ({
    url: image.url,
    alt: image.alt,
  }));

  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand ?? null,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    currency: product.currency,
    category: isCategoryDocument(product.category)
      ? toProductCategoryRef(product.category)
      : null,
    images,
    stock: product.stock,
    status: product.status,
    rating: product.rating,
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    tags: [...product.tags],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
