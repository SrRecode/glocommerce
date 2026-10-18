import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  ORDER_PAYMENT_METHODS,
  ORDER_STATUSES,
  type OrderPaymentMethod,
  type OrderStatus,
} from "./order.types.js";

export interface OrderItemAttrs {
  product: Types.ObjectId | null;
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderCustomerAttrs {
  name: string;
  email: string | null;
  phone: string;
}

export interface OrderAddressAttrs {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
}

export interface OrderStatusEntryAttrs {
  status: OrderStatus;
  at: Date;
  note: string | null;
}

export interface OrderAttrs {
  orderNumber: string;
  user: Types.ObjectId | null;
  customer: OrderCustomerAttrs;
  shippingAddress: OrderAddressAttrs;
  items: OrderItemAttrs[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  paymentMethod: OrderPaymentMethod;
  status: OrderStatus;
  statusHistory: OrderStatusEntryAttrs[];
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Item fields are snapshotted at checkout so an order keeps its history even if the
 * referenced product is later edited or deleted. `product` is nullable for that reason.
 */
const orderItemSchema = new Schema<OrderItemAttrs>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: "unitPrice must be an integer" },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "quantity must be an integer" },
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: "lineTotal must be an integer" },
    },
  },
  { _id: false },
);

const orderCustomerSchema = new Schema<OrderCustomerAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, default: null, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const orderAddressSchema = new Schema<OrderAddressAttrs>(
  {
    line1: { type: String, required: true, trim: true, maxlength: 160 },
    line2: { type: String, default: null, trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, default: null, trim: true, maxlength: 80 },
    postalCode: { type: String, default: null, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, default: "Pakistan", maxlength: 80 },
  },
  { _id: false },
);

const orderStatusEntrySchema = new Schema<OrderStatusEntryAttrs>(
  {
    status: { type: String, required: true, enum: [...ORDER_STATUSES] },
    at: { type: Date, required: true, default: () => new Date() },
    note: { type: String, default: null, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderAttrs>(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customer: { type: orderCustomerSchema, required: true },
    shippingAddress: { type: orderAddressSchema, required: true },
    items: { type: [orderItemSchema], default: [] },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: "subtotal must be an integer" },
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: "shippingFee must be an integer" },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: "total must be an integer" },
    },
    currency: { type: String, required: true, default: "PKR", trim: true },
    paymentMethod: {
      type: String,
      required: true,
      enum: [...ORDER_PAYMENT_METHODS],
      default: "cod",
    },
    status: { type: String, required: true, enum: [...ORDER_STATUSES], default: "pending" },
    statusHistory: { type: [orderStatusEntrySchema], default: [] },
    note: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
// Unfiltered admin listing sorts by createdAt alone; the compound indexes above
// cannot serve that sort without a leading equality filter.
orderSchema.index({ createdAt: -1 });

export type OrderDocument = HydratedDocument<OrderAttrs>;

export const Order: Model<OrderAttrs> = model<OrderAttrs>("Order", orderSchema);
