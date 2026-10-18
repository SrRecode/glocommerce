import { hash } from "bcryptjs";
import { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { env } from "../../config/env.js";
import { clearTestDb, connectTestDb, disconnectTestDb } from "../../test/db.js";
import type { PublicCategory, PublicProduct, ProductStatus } from "./catalog.types.js";
import { Category } from "./category.model.js";
import { Product } from "./product.model.js";
import { User } from "../auth/user.model.js";

const PASSWORD = "Sup3rSecret!";
const ADMIN_EMAIL = "admin@example.com";
const CUSTOMER_EMAIL = "shopper@example.com";
const PRODUCT_DESCRIPTION = "A dependable everyday product used by the catalog test suite.";

const app = buildApp();

async function loginAs(email: string, password = PASSWORD): Promise<string> {
  const response = await request(app).post("/api/v1/auth/login").send({ email, password });
  return response.body.accessToken as string;
}

async function createAdminToken(): Promise<string> {
  await User.create({
    name: "Ada Admin",
    email: ADMIN_EMAIL,
    passwordHash: await hash(PASSWORD, env.bcryptCost),
    role: "admin",
    isEmailVerified: true,
  });
  return loginAs(ADMIN_EMAIL);
}

async function seedProduct(overrides: {
  name: string;
  category?: Types.ObjectId | null;
  price?: number;
  status?: ProductStatus;
  brand?: string | null;
  isFeatured?: boolean;
  tags?: string[];
  description?: string;
}): Promise<void> {
  await Product.create({
    name: overrides.name,
    slug: overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: overrides.description ?? PRODUCT_DESCRIPTION,
    brand: overrides.brand ?? null,
    price: overrides.price ?? 1000,
    category: overrides.category ?? null,
    status: overrides.status ?? "active",
    isFeatured: overrides.isFeatured ?? false,
    tags: overrides.tags ?? [],
  });
}

async function seedCategory(name: string): Promise<Types.ObjectId> {
  const category = await Category.create({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  });
  return category._id;
}

function itemsOf(response: request.Response): PublicProduct[] {
  return response.body.items as PublicProduct[];
}

function categoriesOf(response: request.Response): PublicCategory[] {
  return response.body.items as PublicCategory[];
}

beforeAll(async () => {
  await connectTestDb();
  await Promise.all([User.init(), Category.init(), Product.init()]);
});

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe("admin category management", () => {
  let token: string;

  beforeEach(async () => {
    token = await createAdminToken();
  });

  it("creates a category and derives a slug from the name", async () => {
    const response = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audio Gear", description: "Headphones and speakers" });

    expect(response.status).toBe(201);
    const category = response.body.category as PublicCategory;
    expect(category).toMatchObject({ name: "Audio Gear", slug: "audio-gear" });
    expect(typeof category.id).toBe("string");
  });

  it("rejects a duplicate name with 409", async () => {
    await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audio Gear" });

    const response = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audio Gear" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("updates a category and regenerates its slug", async () => {
    const created = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audio Gear" });
    const id = (created.body.category as PublicCategory).id;

    const response = await request(app)
      .patch(`/api/v1/admin/categories/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audio & Home" });

    expect(response.status).toBe(200);
    expect(response.body.category).toMatchObject({ name: "Audio & Home", slug: "audio-home" });
  });

  it("deletes an empty category with 204", async () => {
    const created = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audio Gear" });
    const id = (created.body.category as PublicCategory).id;

    const response = await request(app)
      .delete(`/api/v1/admin/categories/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(await Category.countDocuments()).toBe(0);
  });

  it("refuses to delete a category that still has products", async () => {
    const created = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audio Gear" });
    const id = (created.body.category as PublicCategory).id;
    await seedProduct({ name: "Wireless Headphones", category: new Types.ObjectId(id) });

    const response = await request(app)
      .delete(`/api/v1/admin/categories/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });
});

describe("admin product management", () => {
  let token: string;

  beforeEach(async () => {
    token = await createAdminToken();
  });

  it("creates a product attached to a category", async () => {
    const categoryId = (await seedCategory("Audio Gear")).toString();

    const response = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Wireless Headphones",
        description: PRODUCT_DESCRIPTION,
        price: 499900,
        category: categoryId,
        status: "active",
        stock: 12,
      });

    expect(response.status).toBe(201);
    const product = response.body.product as PublicProduct;
    expect(product).toMatchObject({
      name: "Wireless Headphones",
      slug: "wireless-headphones",
      price: 499900,
      stock: 12,
      status: "active",
      currency: "PKR",
    });
    expect(product.category).toMatchObject({ name: "Audio Gear", slug: "audio-gear" });
  });

  it("rejects an unknown category with a field-level error", async () => {
    const response = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Wireless Headphones",
        description: PRODUCT_DESCRIPTION,
        price: 499900,
        category: new Types.ObjectId().toString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.category).toBeInstanceOf(Array);
  });

  it("rejects a duplicate product name with 409", async () => {
    await seedProduct({ name: "Wireless Headphones" });

    const response = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Wireless Headphones", description: PRODUCT_DESCRIPTION, price: 1000 });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("lists drafts alongside published products for an admin", async () => {
    await seedProduct({ name: "Wireless Headphones", status: "active" });
    await seedProduct({ name: "Prototype Speaker", status: "draft" });

    const response = await request(app)
      .get("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(itemsOf(response)).toHaveLength(2);
  });

  it("updates a product and reports the new values", async () => {
    const created = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Wireless Headphones", description: PRODUCT_DESCRIPTION, price: 1000 });
    const id = (created.body.product as PublicProduct).id;

    const response = await request(app)
      .patch(`/api/v1/admin/products/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 2500, status: "active" });

    expect(response.status).toBe(200);
    expect(response.body.product).toMatchObject({ price: 2500, status: "active" });
  });

  it("deletes a product with 204", async () => {
    const created = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Wireless Headphones", description: PRODUCT_DESCRIPTION, price: 1000 });
    const id = (created.body.product as PublicProduct).id;

    const response = await request(app)
      .delete(`/api/v1/admin/products/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(await Product.countDocuments()).toBe(0);
  });
});

describe("admin catalog guards", () => {
  it("requires authentication on every admin route", async () => {
    const response = await request(app).get("/api/v1/admin/products");
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("blocks a customer with 403", async () => {
    await User.create({
      name: "Sam Shopper",
      email: CUSTOMER_EMAIL,
      passwordHash: await hash(PASSWORD, env.bcryptCost),
      role: "customer",
      isEmailVerified: true,
    });
    const token = await loginAs(CUSTOMER_EMAIL);

    const response = await request(app)
      .get("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("rejects an upload with no file", async () => {
    const token = await createAdminToken();

    const response = await request(app)
      .post("/api/v1/admin/uploads")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/categories", () => {
  it("lists categories with counts of every product, drafts included", async () => {
    const categoryId = await seedCategory("Audio Gear");
    await seedProduct({ name: "Wireless Headphones", category: categoryId, status: "active" });
    await seedProduct({ name: "Prototype Speaker", category: categoryId, status: "draft" });

    const response = await request(app).get("/api/v1/categories");

    expect(response.status).toBe(200);
    expect(categoriesOf(response)).toHaveLength(1);
    expect(categoriesOf(response)[0]).toMatchObject({ slug: "audio-gear", productCount: 2 });
  });
});

describe("GET /api/v1/categories/:slug", () => {
  it("counts only active products in the category detail", async () => {
    const categoryId = await seedCategory("Audio Gear");
    await seedProduct({ name: "Wireless Headphones", category: categoryId, status: "active" });
    await seedProduct({ name: "Prototype Speaker", category: categoryId, status: "draft" });

    const response = await request(app).get("/api/v1/categories/audio-gear");

    expect(response.status).toBe(200);
    expect(response.body.category).toMatchObject({ slug: "audio-gear", productCount: 1 });
  });

  it("answers 404 for an unknown slug", async () => {
    const response = await request(app).get("/api/v1/categories/missing");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/v1/products", () => {
  it("only exposes active products to the storefront", async () => {
    await seedProduct({ name: "Wireless Headphones", status: "active" });
    await seedProduct({ name: "Prototype Speaker", status: "draft" });

    const response = await request(app).get("/api/v1/products");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(itemsOf(response)[0]?.name).toBe("Wireless Headphones");
  });

  it("filters by category slug", async () => {
    const audio = await seedCategory("Audio Gear");
    const home = await seedCategory("Home");
    await seedProduct({ name: "Wireless Headphones", category: audio });
    await seedProduct({ name: "Table Lamp", category: home });

    const response = await request(app).get("/api/v1/products").query({ category: "audio-gear" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(itemsOf(response)[0]?.name).toBe("Wireless Headphones");
  });

  it("returns an empty page for an unknown category slug", async () => {
    await seedProduct({ name: "Wireless Headphones" });

    const response = await request(app).get("/api/v1/products").query({ category: "missing" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 0, page: 1 });

    expect(itemsOf(response)).toHaveLength(0);
  });

  it("filters by price range in minor units", async () => {
    await seedProduct({ name: "Cheap Cable", price: 500 });
    await seedProduct({ name: "Mid Speaker", price: 2500 });
    await seedProduct({ name: "Pricey Amp", price: 9000 });

    const response = await request(app)
      .get("/api/v1/products")
      .query({ minPrice: 1000, maxPrice: 5000 });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(itemsOf(response)[0]?.name).toBe("Mid Speaker");
  });

  it("filters by brand case-insensitively", async () => {
    await seedProduct({ name: "Wireless Headphones", brand: "Sennheiser" });
    await seedProduct({ name: "Table Lamp", brand: "Philips" });

    const response = await request(app).get("/api/v1/products").query({ brand: "sennheiser" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(itemsOf(response)[0]?.name).toBe("Wireless Headphones");
  });

  it("filters featured products", async () => {
    await seedProduct({ name: "Wireless Headphones", isFeatured: true });
    await seedProduct({ name: "Table Lamp", isFeatured: false });

    const response = await request(app).get("/api/v1/products").query({ featured: "true" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(itemsOf(response)[0]?.name).toBe("Wireless Headphones");
  });

  it("sorts by price when asked", async () => {
    await seedProduct({ name: "Mid Speaker", price: 2500 });
    await seedProduct({ name: "Cheap Cable", price: 500 });
    await seedProduct({ name: "Pricey Amp", price: 9000 });

    const response = await request(app).get("/api/v1/products").query({ sort: "price-asc" });

    expect(response.status).toBe(200);
    expect(itemsOf(response).map((product) => product.price)).toEqual([500, 2500, 9000]);
  });

  it("paginates with the envelope shape", async () => {
    await seedProduct({ name: "Alpha", price: 100 });
    await seedProduct({ name: "Bravo", price: 200 });
    await seedProduct({ name: "Charlie", price: 300 });

    const first = await request(app).get("/api/v1/products").query({ limit: 2, page: 1 });
    expect(first.body).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(itemsOf(first)).toHaveLength(2);

    const second = await request(app).get("/api/v1/products").query({ limit: 2, page: 2 });
    expect(second.body).toMatchObject({ page: 2, limit: 2, total: 3 });
    expect(itemsOf(second)).toHaveLength(1);
  });

  it("matches whole words through the text index", async () => {
    await seedProduct({ name: "Wireless Headphones", description: PRODUCT_DESCRIPTION });
    await seedProduct({ name: "Table Lamp", description: PRODUCT_DESCRIPTION });

    const response = await request(app).get("/api/v1/products").query({ q: "headphones" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(itemsOf(response)[0]?.name).toBe("Wireless Headphones");
  });

  it("falls back to a partial-word regex when the text index finds nothing", async () => {
    await seedProduct({ name: "Wireless Headphones", description: PRODUCT_DESCRIPTION });
    await seedProduct({ name: "Table Lamp", description: PRODUCT_DESCRIPTION });

    const response = await request(app).get("/api/v1/products").query({ q: "headph" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(itemsOf(response)[0]?.name).toBe("Wireless Headphones");
  });

  it("rejects an out-of-range limit", async () => {
    const response = await request(app).get("/api/v1/products").query({ limit: 500 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/products/:slug", () => {
  it("returns a published product with its category reference", async () => {
    const categoryId = await seedCategory("Audio Gear");
    await seedProduct({ name: "Wireless Headphones", category: categoryId, status: "active" });

    const response = await request(app).get("/api/v1/products/wireless-headphones");

    expect(response.status).toBe(200);
    expect(response.body.product).toMatchObject({
      slug: "wireless-headphones",
      status: "active",
    });
    expect(response.body.product.category).toMatchObject({ slug: "audio-gear" });
  });

  it("hides a draft product from the storefront", async () => {
    await seedProduct({ name: "Prototype Speaker", status: "draft" });

    const response = await request(app).get("/api/v1/products/prototype-speaker");

    expect(response.status).toBe(404);
  });
});
