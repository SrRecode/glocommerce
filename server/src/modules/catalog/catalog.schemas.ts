import { z } from "zod";
import { PRODUCT_SORTS, PRODUCT_STATUSES } from "./catalog.types.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, { error: "Invalid id" });

/**
 * Query strings arrive as `""` for bare params (`?page=`). Treat those as
 * "absent" so a partially built URL never fails validation.
 */
const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

/**
 * Narrows an optional text field to `string | null`. `""` means "clear", and an
 * omitted key on a create also resolves to `null`, so services always receive a
 * definite value.
 */
function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .default(null);
}

function optionalUrl() {
  return z
    .union([z.url({ error: "Enter a valid image URL" }), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .default(null);
}

function optionalObjectId() {
  return z
    .union([objectIdSchema, z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .default(null);
}

/**
 * `z.literal("")` and `z.null()` must come before `z.coerce.number()`: coercion
 * turns both into `0`, so ordering decides which branch wins.
 */
function optionalInt() {
  return z
    .union([z.literal(""), z.null(), z.coerce.number().int().min(0)])
    .transform((value) => (value === "" || value === null ? null : value))
    .default(null);
}

/** `z.coerce.boolean()` maps `"false"` to `true`, so parse the enum instead. */
const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");

function optionalStringFilter(max: number) {
  return z.preprocess(emptyToUndefined, z.string().trim().min(1).max(max).optional());
}

function optionalNumberFilter() {
  return z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional());
}

export const productImageInputSchema = z.object({
  url: z.url({ error: "Enter a valid image URL" }),
  alt: z.string().trim().max(160).default(""),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: optionalText(500),
  imageUrl: optionalUrl(),
});

/** `partial()` makes every key optional so PATCH bodies only touch sent fields. */
export const updateCategorySchema = createCategorySchema.partial();

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(5000),
  brand: optionalText(80),
  price: z.coerce.number().int().min(0),
  compareAtPrice: optionalInt(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("PKR"),
  category: optionalObjectId(),
  images: z.array(productImageInputSchema).max(8).default([]),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  q: optionalStringFilter(120),
  category: optionalStringFilter(160),
  brand: optionalStringFilter(80),
  minPrice: optionalNumberFilter(),
  maxPrice: optionalNumberFilter(),
  sort: z.preprocess(emptyToUndefined, z.enum(PRODUCT_SORTS).optional()),
  featured: z.preprocess(emptyToUndefined, booleanQuery.optional()),
  status: z.preprocess(emptyToUndefined, z.enum(PRODUCT_STATUSES).optional()),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(60).default(12)),
});

export const idParamSchema = z.object({ id: objectIdSchema });

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(160),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
