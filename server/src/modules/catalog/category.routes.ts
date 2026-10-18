import { Router } from "express";
import { validateParams } from "../../middleware/validate.js";
import { getCategory, listCategories } from "./catalog.controller.js";
import { slugParamSchema } from "./catalog.schemas.js";

export const categoryRouter = Router();

categoryRouter.get("/", listCategories);
categoryRouter.get("/:slug", validateParams(slugParamSchema), getCategory);
