import type { RequestHandler } from "express";
import { getAuthUser, getOptionalAuthUser } from "../../middleware/auth.js";
import { getParams, getQuery } from "../../middleware/validate.js";
import type {
  CreateOrderInput,
  LookupOrderInput,
  OrderQueryInput,
  UpdateOrderStatusInput,
} from "./order.schemas.js";
import * as orderService from "./order.service.js";

interface IdParams {
  id: string;
}

interface OrderNumberParams {
  orderNumber: string;
}

/*
 * Controllers stay thin: read the already-validated input, call one service
 * function, and shape the HTTP response. Money, stock, and status rules live in
 * the service so no client-supplied price or total is ever trusted.
 */

/** Checkout is open to guests; a signed-in request links the order to the account. */
export const createOrder: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateOrderInput;
    const userId = getOptionalAuthUser(res)?._id ?? null;
    const order = await orderService.createOrder(userId, input);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
};

export const listMyOrders: RequestHandler = async (_req, res, next) => {
  try {
    const query = getQuery<OrderQueryInput>(res);
    const { _id } = getAuthUser(res);
    const result = await orderService.listMyOrders(_id, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyOrder: RequestHandler = async (_req, res, next) => {
  try {
    const { orderNumber } = getParams<OrderNumberParams>(res);
    const { _id } = getAuthUser(res);
    const order = await orderService.getMyOrder(_id, orderNumber);
    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

/** Guest lookup: order number and phone must both match. */
export const lookupOrder: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as LookupOrderInput;
    const order = await orderService.lookupOrder(input);
    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

export const listAdminOrders: RequestHandler = async (_req, res, next) => {
  try {
    const query = getQuery<OrderQueryInput>(res);
    const result = await orderService.listOrders(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminOrder: RequestHandler = async (_req, res, next) => {
  try {
    const { id } = getParams<IdParams>(res);
    const order = await orderService.getOrderById(id);
    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

export const updateAdminOrderStatus: RequestHandler = async (req, res, next) => {
  try {
    const { id } = getParams<IdParams>(res);
    const input = req.body as UpdateOrderStatusInput;
    const order = await orderService.updateOrderStatus(id, input);
    res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};
