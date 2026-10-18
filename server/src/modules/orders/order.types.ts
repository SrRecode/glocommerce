export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Allowed forward moves. `delivered` and `cancelled` are terminal. Cancelling is
 * only possible before an order ships, which is where stock is still reserved.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const ORDER_PAYMENT_METHODS = ["cod"] as const;
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const ORDER_SORTS = ["newest", "oldest", "total-asc", "total-desc"] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

export interface PublicOrderAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
}

export interface PublicOrderCustomer {
  name: string;
  email: string | null;
  phone: string;
}

export interface PublicOrderItem {
  productId: string | null;
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PublicOrderStatusEntry {
  status: OrderStatus;
  at: string;
  note: string | null;
}

export interface PublicOrder {
  id: string;
  orderNumber: string;
  userId: string | null;
  customer: PublicOrderCustomer;
  shippingAddress: PublicOrderAddress;
  items: PublicOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  paymentMethod: OrderPaymentMethod;
  status: OrderStatus;
  statusHistory: PublicOrderStatusEntry[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
