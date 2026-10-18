import { Types, type QueryFilter } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { slugify } from "../../utils/slug.js";
import type {
  CreateCategoryInput,
  CreateProductInput,
  ProductQueryInput,
  UpdateCategoryInput,
  UpdateProductInput,
} from "./catalog.schemas.js";
import { toPublicCategory, toPublicProduct } from "./catalog.mappers.js";
import type { Paginated, ProductStatus, PublicCategory, PublicProduct } from "./catalog.types.js";
import { Category, type CategoryDocument } from "./category.model.js";
import { Product, type ProductAttrs } from "./product.model.js";

const INVALID_CATEGORY_MESSAGE = "The selected category does not exist";
const MAX_SLUG_ATTEMPTS = 50;

type ProductSortSpec = Record<string, 1 | -1 | { $meta: "textScore" }>;

/** Who is asking: admins may see unpublished records, the storefront may not. */
export interface CatalogAccessOptions {
  includeUnpublished: boolean;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/** Escapes user input before it is compiled into a RegExp. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Appends a counter suffix until the candidate slug is unused. The fallback keeps
 * a name made entirely of symbols (which slugifies to `""`) from producing an
 * empty slug.
 */
async function resolveUniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = base.length > 0 ? base : `item-${Date.now().toString(36)}`;

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 1 ? root : `${root}-${attempt}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new AppError(500, "SLUG_GENERATION_FAILED", "Could not generate a unique slug");
}

async function uniqueCategorySlug(
  base: string,
  excludeId?: Types.ObjectId,
): Promise<string> {
  return resolveUniqueSlug(base, async (candidate) => {
    const query: QueryFilter<CategoryDocument> =
      excludeId === undefined
        ? { slug: candidate }
        : { slug: candidate, _id: { $ne: excludeId } };
    return (await Category.exists(query)) !== null;
  });
}

async function uniqueProductSlug(base: string, excludeId?: Types.ObjectId): Promise<string> {
  return resolveUniqueSlug(base, async (candidate) => {
    const query: QueryFilter<ProductAttrs> =
      excludeId === undefined
        ? { slug: candidate }
        : { slug: candidate, _id: { $ne: excludeId } };
    return (await Product.exists(query)) !== null;
  });
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const exists = await Category.exists({ _id: categoryId });
  if (!exists) {
    throw AppError.badRequest(INVALID_CATEGORY_MESSAGE, {
      category: [INVALID_CATEGORY_MESSAGE],
    });
  }
}

function toObjectIdOrNull(id: string | null): Types.ObjectId | null {
  return id === null ? null : new Types.ObjectId(id);
}

/**
 * Names are compared case-insensitively so "Audio Gear" and "audio gear" collide.
 * The schema's unique index is on `slug`, which cannot express that rule, so the
 * check runs here; the E11000 catch in the callers stays as a backstop.
 */
async function categoryNameExists(name: string, excludeId?: Types.ObjectId): Promise<boolean> {
  const query: QueryFilter<CategoryDocument> = {
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
  };
  if (excludeId !== undefined) {
    query._id = { $ne: excludeId };
  }
  return (await Category.exists(query)) !== null;
}

async function productNameExists(name: string, excludeId?: Types.ObjectId): Promise<boolean> {
  const query: QueryFilter<ProductAttrs> = {
    name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
  };
  if (excludeId !== undefined) {
    query._id = { $ne: excludeId };
  }
  return (await Product.exists(query)) !== null;
}

export async function listCategories(): Promise<PublicCategory[]> {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { category: { $ne: null } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const countByCategory = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));

  return categories.map((category) =>
    toPublicCategory(category, countByCategory.get(category._id.toString()) ?? 0),
  );
}

export async function getCategoryBySlug(slug: string): Promise<PublicCategory> {
  const category = await Category.findOne({ slug });
  if (!category) {
    throw AppError.notFound("Category not found");
  }

  const productCount = await Product.countDocuments({ category: category._id, status: "active" });
  return toPublicCategory(category, productCount);
}

export async function createCategory(input: CreateCategoryInput): Promise<PublicCategory> {
  if (await categoryNameExists(input.name)) {
    throw AppError.conflict("A category with that name already exists");
  }

  const slug = await uniqueCategorySlug(slugify(input.name));

  try {
    const category = await Category.create({
      name: input.name,
      slug,
      description: input.description,
      imageUrl: input.imageUrl,
    });
    return toPublicCategory(category);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("A category with that name already exists");
    }
    throw error;
  }
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<PublicCategory> {
  const category = await Category.findById(id);
  if (!category) {
    throw AppError.notFound("Category not found");
  }

  if (input.name !== undefined) {
    if (await categoryNameExists(input.name, category._id)) {
      throw AppError.conflict("A category with that name already exists");
    }
    category.name = input.name;
    category.slug = await uniqueCategorySlug(slugify(input.name), category._id);
  }
  if (input.description !== undefined) {
    category.description = input.description;
  }
  if (input.imageUrl !== undefined) {
    category.imageUrl = input.imageUrl;
  }

  try {
    await category.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("A category with that name already exists");
    }
    throw error;
  }

  return toPublicCategory(category);
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await Category.findById(id);
  if (!category) {
    throw AppError.notFound("Category not found");
  }

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    throw AppError.conflict("Reassign or delete this category's products before removing it");
  }

  await category.deleteOne();
}

async function buildBaseFilter(
  query: ProductQueryInput,
  defaultStatus: ProductStatus | null,
): Promise<QueryFilter<ProductAttrs> | null> {
  const filter: QueryFilter<ProductAttrs> = {};

  const status = query.status ?? defaultStatus;
  if (status !== null) {
    filter.status = status;
  }

  if (query.category !== undefined) {
    const category = await Category.findOne({ slug: query.category }).select("_id");
    if (!category) {
      return null;
    }
    filter.category = category._id;
  }

  if (query.brand !== undefined) {
    filter.brand = { $regex: `^${escapeRegExp(query.brand)}$`, $options: "i" };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const price: { $gte?: number; $lte?: number } = {};
    if (query.minPrice !== undefined) {
      price.$gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      price.$lte = query.maxPrice;
    }
    filter.price = price;
  }

  if (query.featured !== undefined) {
    filter.isFeatured = query.featured;
  }

  return filter;
}

function buildSort(sort: ProductQueryInput["sort"]): ProductSortSpec {
  switch (sort) {
    case "price-asc":
      return { price: 1 };
    case "price-desc":
      return { price: -1 };
    case "name-asc":
      return { name: 1 };
    case "rating":
      return { rating: -1, reviewCount: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

interface ProductQueryPlan {
  filter: QueryFilter<ProductAttrs>;
  sort: ProductSortSpec;
  projection?: Record<string, 1 | { $meta: "textScore" }>;
}

async function executeProductQuery(
  plan: ProductQueryPlan,
  skip: number,
  limit: number,
): Promise<{ items: PublicProduct[]; total: number }> {
  const documentQuery = Product.find(plan.filter)
    .sort(plan.sort)
    .skip(skip)
    .limit(limit)
    .populate<{ category: CategoryDocument | null }>("category");

  if (plan.projection !== undefined) {
    documentQuery.select(plan.projection);
  }

  const [documents, total] = await Promise.all([
    documentQuery,
    Product.countDocuments(plan.filter),
  ]);

  return { items: documents.map((document) => toPublicProduct(document)), total };
}

/**
 * Search strategy: a MongoDB text index (ranked by name > brand > description)
 * answers whole-word queries; when it returns nothing we fall back to a
 * case-insensitive regex so partial words still match. `$text` is never combined
 * inside `$or` — MongoDB rejects that — so the fallback swaps the whole filter.
 */
export async function listProducts(
  query: ProductQueryInput,
  options: CatalogAccessOptions,
): Promise<Paginated<PublicProduct>> {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const defaultStatus: ProductStatus | null = options.includeUnpublished ? null : "active";

  const baseFilter = await buildBaseFilter(query, defaultStatus);
  if (baseFilter === null) {
    return { items: [], page, limit, total: 0 };
  }

  if (query.q !== undefined) {
    const textResult = await executeProductQuery(
      {
        filter: { ...baseFilter, $text: { $search: query.q } },
        sort: { score: { $meta: "textScore" } },
        projection: { score: { $meta: "textScore" } },
      },
      skip,
      limit,
    );

    if (textResult.total > 0) {
      return { items: textResult.items, page, limit, total: textResult.total };
    }

    const pattern = new RegExp(escapeRegExp(query.q), "i");
    const regexResult = await executeProductQuery(
      {
        filter: {
          ...baseFilter,
          $or: [
            { name: pattern },
            { slug: pattern },
            { brand: pattern },
            { description: pattern },
            { tags: pattern },
          ],
        },
        sort: buildSort(query.sort),
      },
      skip,
      limit,
    );

    return { items: regexResult.items, page, limit, total: regexResult.total };
  }

  const result = await executeProductQuery(
    { filter: baseFilter, sort: buildSort(query.sort) },
    skip,
    limit,
  );

  return { items: result.items, page, limit, total: result.total };
}

export async function getProductBySlug(
  slug: string,
  options: CatalogAccessOptions,
): Promise<PublicProduct> {
  const filter: QueryFilter<ProductAttrs> = options.includeUnpublished
    ? { slug }
    : { slug, status: "active" };

  const product = await Product.findOne(filter).populate<{ category: CategoryDocument | null }>(
    "category",
  );

  if (!product) {
    throw AppError.notFound("Product not found");
  }

  return toPublicProduct(product);
}

export async function getProductById(id: string): Promise<PublicProduct> {
  const product = await Product.findById(id).populate<{ category: CategoryDocument | null }>(
    "category",
  );

  if (!product) {
    throw AppError.notFound("Product not found");
  }

  return toPublicProduct(product);
}

export async function createProduct(input: CreateProductInput): Promise<PublicProduct> {
  if (input.category !== null) {
    await assertCategoryExists(input.category);
  }

  if (await productNameExists(input.name)) {
    throw AppError.conflict("A product with that name already exists");
  }

  const slug = await uniqueProductSlug(slugify(input.name));

  try {
    const product = await Product.create({
      name: input.name,
      slug,
      description: input.description,
      brand: input.brand,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      currency: input.currency,
      category: toObjectIdOrNull(input.category),
      images: input.images,
      stock: input.stock,
      status: input.status,
      isFeatured: input.isFeatured,
      tags: input.tags,
    });

    return toPublicProduct(
      await product.populate<{ category: CategoryDocument | null }>("category"),
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("A product with that name already exists");
    }
    throw error;
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<PublicProduct> {
  const product = await Product.findById(id);
  if (!product) {
    throw AppError.notFound("Product not found");
  }

  if (input.name !== undefined) {
    if (await productNameExists(input.name, product._id)) {
      throw AppError.conflict("A product with that name already exists");
    }
    product.name = input.name;
    product.slug = await uniqueProductSlug(slugify(input.name), product._id);
  }
  if (input.description !== undefined) {
    product.description = input.description;
  }
  if (input.brand !== undefined) {
    product.brand = input.brand;
  }
  if (input.price !== undefined) {
    product.price = input.price;
  }
  if (input.compareAtPrice !== undefined) {
    product.compareAtPrice = input.compareAtPrice;
  }
  if (input.currency !== undefined) {
    product.currency = input.currency;
  }
  if (input.category !== undefined) {
    if (input.category !== null) {
      await assertCategoryExists(input.category);
    }
    product.category = toObjectIdOrNull(input.category);
  }
  if (input.images !== undefined) {
    product.images = input.images;
  }
  if (input.stock !== undefined) {
    product.stock = input.stock;
  }
  if (input.status !== undefined) {
    product.status = input.status;
  }
  if (input.isFeatured !== undefined) {
    product.isFeatured = input.isFeatured;
  }
  if (input.tags !== undefined) {
    product.tags = [...input.tags];
  }

  try {
    await product.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("A product with that name already exists");
    }
    throw error;
  }

  return toPublicProduct(await product.populate<{ category: CategoryDocument | null }>("category"));
}

/**
 * Hard delete. Orders snapshot the product name and price at purchase time, so
 * removing a product never rewrites order history.
 */
export async function deleteProduct(id: string): Promise<void> {
  const product = await Product.findById(id);
  if (!product) {
    throw AppError.notFound("Product not found");
  }

  await product.deleteOne();
}
