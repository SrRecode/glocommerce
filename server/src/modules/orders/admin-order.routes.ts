import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import {
  getAdminOrder,
  listAdminOrders,
  updateAdminOrderStatus,
} from "./order.controller.js";
import {
  idParamSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
} from "./order.schemas.js";

export const adminOrderRouter = Router();

// Fulfilment is admin-only; the guard runs before any handler.
adminOrderRouter.use(requireAuth, requireRole("admin"));

adminOrderRouter.get("/", validateQuery(orderQuerySchema), listAdminOrders);
adminOrderRouter.get("/:id", validateParams(idParamSchema), getAdminOrder);
adminOrderRouter.patch(
  "/:id/status",
  validateParams(idParamSchema),
  validateBody(updateOrderStatusSchema),
  updateAdminOrderStatus,
);
