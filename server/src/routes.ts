import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { adminCatalogRouter } from "./modules/catalog/admin-catalog.routes.js";
import { categoryRouter } from "./modules/catalog/category.routes.js";
import { productRouter } from "./modules/catalog/product.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { adminOrderRouter } from "./modules/orders/admin-order.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";

export const apiV1Router: Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/products", productRouter);
apiV1Router.use("/categories", categoryRouter);
apiV1Router.use("/orders", orderRouter);
apiV1Router.use("/admin/orders", adminOrderRouter);
apiV1Router.use("/admin", adminCatalogRouter);
