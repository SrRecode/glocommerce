import { z } from "zod";
import { ORDER_PAYMENT_METHODS, ORDER_SORTS, ORDER_STATUSES } from "./order.types.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, { error: "Invalid id" });

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{7,20}$/, { error: "Enter a valid phone number" });

const optionalEmailSchema = z
  .union([z.email({ error: "Enter a valid email" }), z.literal(""), z.null()])
  .transform((value) => (value === "" || value === null ? null : value))
  .default(null);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .default(null);

export const orderCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: optionalEmailSchema,
  phone: phoneSchema,
});

export const orderAddressSchema = z.object({
  line1: z.string().trim().min(3).max(160),
  line2: optionalText(160),
  city: z.string().trim().min(2).max(80),
  state: optionalText(80),
  postalCode: optionalText(20),
  country: z.string().trim().min(2).max(80).default("Pakistan"),
});

export const checkoutItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.coerce.number().int().min(1).max(99),
});

export const createOrderSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  customer: orderCustomerSchema,
  shippingAddress: orderAddressSchema,
  note: optionalText(500),
});

export const orderQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(120).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(ORDER_STATUSES).optional()),
  from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(ORDER_SORTS).default("newest")),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(60).default(20)),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(300),
});

export const lookupOrderSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  phone: phoneSchema,
});

export const orderNumberParamSchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export type OrderCustomerInput = z.infer<typeof orderCustomerSchema>;
export type OrderAddressInput = z.infer<typeof orderAddressSchema>;
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type LookupOrderInput = z.infer<typeof lookupOrderSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type OrderNumberParamInput = z.infer<typeof orderNumberParamSchema>;

export { ORDER_PAYMENT_METHODS };
