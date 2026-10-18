import { Router } from "express";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import { getProduct, listProducts } from "./catalog.controller.js";
import { productQuerySchema, slugParamSchema } from "./catalog.schemas.js";

export const productRouter = Router();

productRouter.get("/", validateQuery(productQuerySchema), listProducts);
productRouter.get("/:slug", validateParams(slugParamSchema), getProduct);
