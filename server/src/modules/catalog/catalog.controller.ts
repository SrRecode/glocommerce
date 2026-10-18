import type { RequestHandler } from "express";
import { getParams, getQuery } from "../../middleware/validate.js";
import { AppError } from "../../utils/app-error.js";
import type {
  CreateCategoryInput,
  CreateProductInput,
  ProductQueryInput,
  UpdateCategoryInput,
  UpdateProductInput,
} from "./catalog.schemas.js";
import * as catalogService from "./catalog.service.js";
import { uploadImage } from "./storage.service.js";

interface IdParams {
  id: string;
}

interface SlugParams {
  slug: string;
}

/*
 * Controllers stay thin: read the already-validated input, call one service
 * function, and shape the HTTP response. Business rules live in the service.
 */

export const listCategories: RequestHandler = async (_req, res, next) => {
  try {
    const categories = await catalogService.listCategories();
    res.status(200).json({ items: categories, total: categories.length });
  } catch (error) {
    next(error);
  }
};

export const getCategory: RequestHandler = async (_req, res, next) => {
  try {
    const { slug } = getParams<SlugParams>(res);
    const category = await catalogService.getCategoryBySlug(slug);
    res.status(200).json({ category });
  } catch (error) {
    next(error);
  }
};

export const listProducts: RequestHandler = async (_req, res, next) => {
  try {
    const query = getQuery<ProductQueryInput>(res);
    const result = await catalogService.listProducts(query, { includeUnpublished: false });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getProduct: RequestHandler = async (_req, res, next) => {
  try {
    const { slug } = getParams<SlugParams>(res);
    const product = await catalogService.getProductBySlug(slug, { includeUnpublished: false });
    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

export const listAdminProducts: RequestHandler = async (_req, res, next) => {
  try {
    const query = getQuery<ProductQueryInput>(res);
    const result = await catalogService.listProducts(query, { includeUnpublished: true });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminProduct: RequestHandler = async (_req, res, next) => {
  try {
    const { id } = getParams<IdParams>(res);
    const product = await catalogService.getProductById(id);
    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

export const createAdminProduct: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateProductInput;
    const product = await catalogService.createProduct(input);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
};

export const updateAdminProduct: RequestHandler = async (req, res, next) => {
  try {
    const { id } = getParams<IdParams>(res);
    const input = req.body as UpdateProductInput;
    const product = await catalogService.updateProduct(id, input);
    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminProduct: RequestHandler = async (_req, res, next) => {
  try {
    const { id } = getParams<IdParams>(res);
    await catalogService.deleteProduct(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const listAdminCategories: RequestHandler = async (_req, res, next) => {
  try {
    const categories = await catalogService.listCategories();
    res.status(200).json({ items: categories, total: categories.length });
  } catch (error) {
    next(error);
  }
};

export const createAdminCategory: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateCategoryInput;
    const category = await catalogService.createCategory(input);
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

export const updateAdminCategory: RequestHandler = async (req, res, next) => {
  try {
    const { id } = getParams<IdParams>(res);
    const input = req.body as UpdateCategoryInput;
    const category = await catalogService.updateCategory(id, input);
    res.status(200).json({ category });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminCategory: RequestHandler = async (_req, res, next) => {
  try {
    const { id } = getParams<IdParams>(res);
    await catalogService.deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * `uploadImageFile` already rejected non-images and oversized files, so a missing
 * `req.file` here means the route was mounted without that middleware.
 */
export const uploadAdminImage: RequestHandler = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      throw AppError.badRequest("No image file was provided");
    }

    const image = await uploadImage({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });

    res.status(201).json({ image });
  } catch (error) {
    next(error);
  }
};
