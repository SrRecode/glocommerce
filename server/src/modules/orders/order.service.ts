import { randomBytes } from "node:crypto";
import { Types, type QueryFilter } from "mongoose";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import type { Paginated } from "../catalog/catalog.types.js";
import { Product, type ProductAttrs } from "../catalog/product.model.js";
import { toPublicOrder } from "./order.mappers.js";
import { Order, type OrderAttrs, type OrderDocument, type OrderItemAttrs } from "./order.model.js";
import type {
  CreateOrderInput,
  LookupOrderInput,
  OrderQueryInput,
  UpdateOrderStatusInput,
} from "./order.schemas.js";
import { ORDER_STATUS_TRANSITIONS, type OrderSort, type PublicOrder } from "./order.types.js";

const DEFAULT_CURRENCY = "PKR";
const ORDER_NUMBER_ATTEMPTS = 5;

/** A stock reservation that can be handed back if a later step fails. */
interface StockOperation {
  productId: Types.ObjectId;
  quantity: number;
}

/** Server-computed money for an order, plus the reservations that back it. */
interface Reservation {
  items: OrderItemAttrs[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  reserved: StockOperation[];
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
 * Strips formatting from a phone number so "0300-1234567" and "+92 300 1234567"
 * compare the way a customer means them. A leading `+` is preserved.
 */
function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `GC-${stamp}-${suffix}`;
}

/** Shipping is free by default; a flat fee applies only when configured. */
function calculateShippingFee(subtotal: number): number {
  if (env.SHIPPING_FLAT_FEE <= 0) {
    return 0;
  }
  if (env.FREE_SHIPPING_THRESHOLD > 0 && subtotal >= env.FREE_SHIPPING_THRESHOLD) {
    return 0;
  }
  return env.SHIPPING_FLAT_FEE;
}

async function restoreStock(operations: StockOperation[]): Promise<void> {
  await Promise.all(
    operations.map((operation) =>
      Product.updateOne(
        { _id: operation.productId },
        { $inc: { stock: operation.quantity } },
      ),
    ),
  );
}

/**
 * Prices every line from the database, decrements stock atomically, and returns
 * the money the order must charge. Never trusts a client-supplied price or total.
 * If any line fails, the reservations taken so far are handed back before the
 * error propagates.
 */
async function priceAndReserve(input: CreateOrderInput): Promise<Reservation> {
  const productIds = input.items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw AppError.badRequest("Each product may only appear once in an order");
  }

  const items: OrderItemAttrs[] = [];
  const reserved: StockOperation[] = [];
  let currency = DEFAULT_CURRENCY;

  try {
    for (const line of input.items) {
      const product = await Product.findById(line.productId);
      if (!product || product.status !== "active") {
        throw AppError.badRequest("One of the selected products is no longer available");
      }

      const filter: QueryFilter<ProductAttrs> = {
        _id: product._id,
        status: "active",
        stock: { $gte: line.quantity },
      };

      const decremented = await Product.findOneAndUpdate(filter, {
        $inc: { stock: -line.quantity },
      });
      if (!decremented) {
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `Not enough stock for ${product.name}`,
          { items: [`Only ${product.stock} left for ${product.name}`] },
        );
      }

      reserved.push({ productId: product._id, quantity: line.quantity });

      if (items.length === 0) {
        currency = product.currency;
      }

      items.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url ?? null,
        unitPrice: product.price,
        quantity: line.quantity,
        lineTotal: product.price * line.quantity,
      });
    }
  } catch (error) {
    await restoreStock(reserved);
    throw error;
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingFee = calculateShippingFee(subtotal);

  return { items, subtotal, shippingFee, total: subtotal + shippingFee, currency, reserved };
}

/**
 * Persists the order, retrying on the rare `orderNumber` collision. Any other
 * failure surfaces unchanged so the caller can release the stock reservation.
 */
async function createOrderDocument(
  userId: Types.ObjectId | null,
  input: CreateOrderInput,
  reservation: Reservation,
): Promise<OrderDocument> {
  for (let attempt = 1; attempt <= ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    const order: OrderDocument = new Order({
      orderNumber: generateOrderNumber(),
      user: userId,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: normalizePhone(input.customer.phone),
      },
      shippingAddress: input.shippingAddress,
      items: reservation.items,
      subtotal: reservation.subtotal,
      shippingFee: reservation.shippingFee,
      total: reservation.total,
      currency: reservation.currency,
      paymentMethod: "cod",
      status: "pending",
      statusHistory: [{ status: "pending", at: new Date(), note: null }],
      note: input.note,
    });

    try {
      await order.save();
      return order;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  throw new AppError(500, "ORDER_NUMBER_GENERATION_FAILED", "Could not create the order");
}

export async function createOrder(
  userId: Types.ObjectId | null,
  input: CreateOrderInput,
): Promise<PublicOrder> {
  const reservation = await priceAndReserve(input);

  try {
    const order = await createOrderDocument(userId, input, reservation);
    return toPublicOrder(order);
  } catch (error) {
    await restoreStock(reservation.reserved);
    throw error;
  }
}

function buildOrderFilter(query: OrderQueryInput, userId?: Types.ObjectId): QueryFilter<OrderAttrs> {
  const filter: QueryFilter<OrderAttrs> = {};

  if (userId) {
    filter.user = userId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (query.from) {
      createdAt.$gte = query.from;
    }
    if (query.to) {
      createdAt.$lte = query.to;
    }
    filter.createdAt = createdAt;
  }

  if (query.q) {
    const pattern = new RegExp(escapeRegExp(query.q), "i");
    filter.$or = [
      { orderNumber: pattern },
      { "customer.name": pattern },
      { "customer.phone": pattern },
      { "customer.email": pattern },
    ];
  }

  return filter;
}

function buildOrderSort(sort: OrderSort): Record<string, 1 | -1> {
  switch (sort) {
    case "oldest":
      return { createdAt: 1 };
    case "total-asc":
      return { total: 1 };
    case "total-desc":
      return { total: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

async function paginateOrders(
  filter: QueryFilter<OrderAttrs>,
  query: OrderQueryInput,
): Promise<Paginated<PublicOrder>> {
  const skip = (query.page - 1) * query.limit;

  const [documents, total] = await Promise.all([
    Order.find(filter).sort(buildOrderSort(query.sort)).skip(skip).limit(query.limit),
    Order.countDocuments(filter),
  ]);

  return {
    items: documents.map((document) => toPublicOrder(document)),
    page: query.page,
    limit: query.limit,
    total,
  };
}

export async function listMyOrders(
  userId: Types.ObjectId,
  query: OrderQueryInput,
): Promise<Paginated<PublicOrder>> {
  return paginateOrders(buildOrderFilter(query, userId), query);
}

export async function getMyOrder(
  userId: Types.ObjectId,
  orderNumber: string,
): Promise<PublicOrder> {
  const order = await Order.findOne({ orderNumber, user: userId });
  if (!order) {
    throw AppError.notFound("Order not found");
  }
  return toPublicOrder(order);
}

/** Guest lookup: the order number and the phone that placed it must both match. */
export async function lookupOrder(input: LookupOrderInput): Promise<PublicOrder> {
  const orderNumber = new RegExp(`^${escapeRegExp(input.orderNumber)}$`, "i");
  const order = await Order.findOne({
    orderNumber,
    "customer.phone": normalizePhone(input.phone),
  });
  if (!order) {
    throw AppError.notFound("Order not found");
  }
  return toPublicOrder(order);
}

export async function listOrders(query: OrderQueryInput): Promise<Paginated<PublicOrder>> {
  return paginateOrders(buildOrderFilter(query), query);
}

export async function getOrderById(id: string): Promise<PublicOrder> {
  if (!Types.ObjectId.isValid(id)) {
    throw AppError.notFound("Order not found");
  }

  const order = await Order.findById(id);
  if (!order) {
    throw AppError.notFound("Order not found");
  }
  return toPublicOrder(order);
}

export async function updateOrderStatus(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<PublicOrder> {
  if (!Types.ObjectId.isValid(id)) {
    throw AppError.notFound("Order not found");
  }

  const order = await Order.findById(id);
  if (!order) {
    throw AppError.notFound("Order not found");
  }

  const allowed = ORDER_STATUS_TRANSITIONS[order.status];
  if (!allowed.includes(input.status)) {
    throw new AppError(
      409,
      "INVALID_STATUS_TRANSITION",
      `Cannot move an order from ${order.status} to ${input.status}`,
    );
  }

  if (input.status === "cancelled") {
    const operations: StockOperation[] = order.items
      .filter((item) => item.product !== null)
      .map((item) => ({ productId: item.product as Types.ObjectId, quantity: item.quantity }));
    await restoreStock(operations);
  }

  order.status = input.status;
  order.statusHistory.push({ status: input.status, at: new Date(), note: input.note });
  await order.save();

  return toPublicOrder(order);
}
