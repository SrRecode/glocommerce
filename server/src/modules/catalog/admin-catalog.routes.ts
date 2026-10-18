import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import {
  createAdminCategory,
  createAdminProduct,
  deleteAdminCategory,
  deleteAdminProduct,
  getAdminProduct,
  listAdminCategories,
  listAdminProducts,
  updateAdminCategory,
  updateAdminProduct,
  uploadAdminImage,
} from "./catalog.controller.js";
import {
  createCategorySchema,
  createProductSchema,
  idParamSchema,
  productQuerySchema,
  updateCategorySchema,
  updateProductSchema,
} from "./catalog.schemas.js";
import { uploadImageFile } from "./upload.middleware.js";

export const adminCatalogRouter = Router();

// Every catalog write is admin-only; the guard runs before any handler.
adminCatalogRouter.use(requireAuth, requireRole("admin"));

adminCatalogRouter.get("/products", validateQuery(productQuerySchema), listAdminProducts);
adminCatalogRouter.post("/products", validateBody(createProductSchema), createAdminProduct);
adminCatalogRouter.get("/products/:id", validateParams(idParamSchema), getAdminProduct);
adminCatalogRouter.patch(
  "/products/:id",
  validateParams(idParamSchema),
  validateBody(updateProductSchema),
  updateAdminProduct,
);
adminCatalogRouter.delete("/products/:id", validateParams(idParamSchema), deleteAdminProduct);

adminCatalogRouter.get("/categories", listAdminCategories);
adminCatalogRouter.post("/categories", validateBody(createCategorySchema), createAdminCategory);
adminCatalogRouter.patch(
  "/categories/:id",
  validateParams(idParamSchema),
  validateBody(updateCategorySchema),
  updateAdminCategory,
);
adminCatalogRouter.delete("/categories/:id", validateParams(idParamSchema), deleteAdminCategory);

adminCatalogRouter.post("/uploads", uploadImageFile, uploadAdminImage);
