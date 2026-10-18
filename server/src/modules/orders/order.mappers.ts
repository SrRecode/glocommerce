import type { Types } from "mongoose";
import type {
  OrderPaymentMethod,
  OrderStatus,
  PublicOrder,
  PublicOrderAddress,
  PublicOrderCustomer,
  PublicOrderItem,
  PublicOrderStatusEntry,
} from "./order.types.js";

/**
 * Structural view of an order document. Accepting a plain shape (rather than the
 * hydrated document type) keeps the mapper usable with lean objects and populates.
 */
export interface OrderLike {
  _id: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId | null;
  customer: { name: string; email: string | null; phone: string };
  shippingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
  };
  items: {
    product: Types.ObjectId | null;
    name: string;
    slug: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  paymentMethod: OrderPaymentMethod;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: Date; note: string | null }[];
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toPublicCustomer(order: OrderLike): PublicOrderCustomer {
  return {
    name: order.customer.name,
    email: order.customer.email,
    phone: order.customer.phone,
  };
}

function toPublicAddress(order: OrderLike): PublicOrderAddress {
  return {
    line1: order.shippingAddress.line1,
    line2: order.shippingAddress.line2,
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    postalCode: order.shippingAddress.postalCode,
    country: order.shippingAddress.country,
  };
}

function toPublicItems(order: OrderLike): PublicOrderItem[] {
  return order.items.map((item) => ({
    productId: item.product ? item.product.toString() : null,
    name: item.name,
    slug: item.slug,
    image: item.image,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  }));
}

function toPublicStatusHistory(order: OrderLike): PublicOrderStatusEntry[] {
  return order.statusHistory.map((entry) => ({
    status: entry.status,
    at: entry.at.toISOString(),
    note: entry.note,
  }));
}

export function toPublicOrder(order: OrderLike): PublicOrder {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    userId: order.user ? order.user.toString() : null,
    customer: toPublicCustomer(order),
    shippingAddress: toPublicAddress(order),
    items: toPublicItems(order),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    status: order.status,
    statusHistory: toPublicStatusHistory(order),
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
