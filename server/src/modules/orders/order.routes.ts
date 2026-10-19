import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { clientRateLimitKey } from "../../middleware/rate-limit.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import {
  createOrder,
  getMyOrder,
  listMyOrders,
  lookupOrder,
} from "./order.controller.js";
import {
  createOrderSchema,
  lookupOrderSchema,
  orderNumberParamSchema,
  orderQuerySchema,
} from "./order.schemas.js";

// Checkout and guest lookup are unauthenticated, so they get a tighter budget.
const ordersRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: clientRateLimitKey,
  skip: () => env.isTest,
});

export const orderRouter = Router();

orderRouter.use(ordersRateLimit);

// Guests can check out; a signed-in request links the order to the account.
orderRouter.post("/", optionalAuth, validateBody(createOrderSchema), createOrder);
orderRouter.post("/lookup", validateBody(lookupOrderSchema), lookupOrder);
orderRouter.get("/mine", requireAuth, validateQuery(orderQuerySchema), listMyOrders);
orderRouter.get(
  "/mine/:orderNumber",
  requireAuth,
  validateParams(orderNumberParamSchema),
  getMyOrder,
);
