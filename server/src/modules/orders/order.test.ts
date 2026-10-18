import { hash } from "bcryptjs";
import { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { env } from "../../config/env.js";
import { clearTestDb, connectTestDb, disconnectTestDb } from "../../test/db.js";
import { User } from "../auth/user.model.js";
import type { ProductStatus } from "../catalog/catalog.types.js";
import { Product } from "../catalog/product.model.js";
import { Order } from "./order.model.js";
import type { PublicOrder } from "./order.types.js";

const PASSWORD = "Sup3rSecret!";
const ADMIN_EMAIL = "admin@example.com";
const CUSTOMER_EMAIL = "shopper@example.com";
const OTHER_EMAIL = "stranger@example.com";
const PRODUCT_DESCRIPTION = "A dependable everyday product used by the order test suite.";

const app = buildApp();

let productCounter = 0;

async function loginAs(email: string, password = PASSWORD): Promise<string> {
  const response = await request(app).post("/api/v1/auth/login").send({ email, password });
  return response.body.accessToken as string;
}

async function createUserToken(
  email: string,
  role: "customer" | "admin",
  name: string,
): Promise<string> {
  await User.create({
    name,
    email,
    passwordHash: await hash(PASSWORD, env.bcryptCost),
    role,
    isEmailVerified: true,
  });
  return loginAs(email);
}

async function seedProduct(
  overrides: {
    name?: string;
    price?: number;
    stock?: number;
    status?: ProductStatus;
  } = {},
): Promise<Types.ObjectId> {
  productCounter += 1;
  const name = overrides.name ?? `Order Test Product ${productCounter}`;
  const product = await Product.create({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: PRODUCT_DESCRIPTION,
    price: overrides.price ?? 1000,
    stock: overrides.stock ?? 5,
    status: overrides.status ?? "active",
  });
  return product._id;
}

function checkoutPayload(
  productId: Types.ObjectId | string,
  overrides: { quantity?: number; phone?: string; email?: string; name?: string } = {},
): Record<string, unknown> {
  return {
    items: [{ productId: productId.toString(), quantity: overrides.quantity ?? 1 }],
    customer: {
      name: overrides.name ?? "Casey Customer",
      email: overrides.email ?? "casey@example.com",
      phone: overrides.phone ?? "0300-1234567",
    },
    shippingAddress: {
      line1: "12 Mall Road",
      city: "Lahore",
      country: "Pakistan",
    },
  };
}

function placeOrder(payload: Record<string, unknown>, token?: string): request.Test {
  const test = request(app).post("/api/v1/orders").send(payload);
  return token ? test.set("Authorization", `Bearer ${token}`) : test;
}

function asOrder(response: request.Response): PublicOrder {
  return response.body.order as PublicOrder;
}

beforeAll(async () => {
  await connectTestDb();
  await Promise.all([User.init(), Product.init(), Order.init()]);
});

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe("POST /api/v1/orders", () => {
  it("creates a guest order with server-computed totals and decremented stock", async () => {
    const productId = await seedProduct({ price: 1500, stock: 5 });

    const response = await placeOrder(checkoutPayload(productId, { quantity: 2 }));

    expect(response.status).toBe(201);
    const order = asOrder(response);
    expect(order.userId).toBeNull();
    expect(order.status).toBe("pending");
    expect(order.currency).toBe("PKR");
    expect(order.paymentMethod).toBe("cod");
    expect(order.orderNumber.startsWith("GC-")).toBe(true);
    expect(order.subtotal).toBe(3000);
    expect(order.total).toBe(order.subtotal + order.shippingFee);

    const item = order.items[0];
    expect(item?.unitPrice).toBe(1500);
    expect(item?.quantity).toBe(2);
    expect(item?.lineTotal).toBe(3000);
    expect(order.statusHistory.map((entry) => entry.status)).toEqual(["pending"]);

    const product = await Product.findById(productId);
    expect(product?.stock).toBe(3);
  });

  it("ignores a client-supplied price and prices the order from the database", async () => {
    const productId = await seedProduct({ price: 2500, stock: 4 });
    const payload = checkoutPayload(productId, { quantity: 2 });
    (payload.items as Record<string, unknown>[])[0]!.unitPrice = 1;

    const response = await placeOrder(payload);

    expect(response.status).toBe(201);
    const order = asOrder(response);
    expect(order.subtotal).toBe(5000);
    expect(order.items[0]?.unitPrice).toBe(2500);
  });

  it("charges no shipping fee by default", async () => {
    const productId = await seedProduct({ price: 1000, stock: 3 });

    const response = await placeOrder(checkoutPayload(productId));

    expect(response.status).toBe(201);
    const order = asOrder(response);
    expect(order.shippingFee).toBe(0);
    expect(order.total).toBe(order.subtotal);
  });

  it("rejects a product listed more than once with 400", async () => {
    const productId = await seedProduct({ stock: 5 });
    const payload = {
      ...checkoutPayload(productId),
      items: [
        { productId: productId.toString(), quantity: 1 },
        { productId: productId.toString(), quantity: 1 },
      ],
    };

    const response = await placeOrder(payload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("BAD_REQUEST");
  });

  it("rejects an unknown product with 400", async () => {
    const response = await placeOrder(checkoutPayload(new Types.ObjectId()));

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("BAD_REQUEST");
  });

  it("rejects a product that is not active with 400", async () => {
    const productId = await seedProduct({ status: "draft" });

    const response = await placeOrder(checkoutPayload(productId));

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("BAD_REQUEST");
  });

  it("rejects an order that exceeds available stock with 409", async () => {
    const productId = await seedProduct({ stock: 1 });

    const response = await placeOrder(checkoutPayload(productId, { quantity: 2 }));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INSUFFICIENT_STOCK");
    const product = await Product.findById(productId);
    expect(product?.stock).toBe(1);
  });
});

describe("authenticated orders", () => {
  it("links an order to the signed-in user and lists it under /mine", async () => {
    const token = await createUserToken(CUSTOMER_EMAIL, "customer", "Casey Customer");
    const productId = await seedProduct({ stock: 5 });

    const created = await placeOrder(checkoutPayload(productId), token);
    expect(created.status).toBe(201);
    const order = asOrder(created);
    expect(typeof order.userId).toBe("string");

    const list = await request(app)
      .get("/api/v1/orders/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    const listed = list.body.items[0] as PublicOrder;
    expect(listed.orderNumber).toBe(order.orderNumber);
  });

  it("keeps guest orders out of a customer's order list", async () => {
    const token = await createUserToken(CUSTOMER_EMAIL, "customer", "Casey Customer");
    const productId = await seedProduct({ stock: 5 });
    await placeOrder(checkoutPayload(productId));

    const list = await request(app)
      .get("/api/v1/orders/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(0);
  });

  it("returns a single order to its owner and hides it from other customers", async () => {
    const owner = await createUserToken(CUSTOMER_EMAIL, "customer", "Casey Customer");
    const stranger = await createUserToken(OTHER_EMAIL, "customer", "Sam Stranger");
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId), owner);
    const orderNumber = asOrder(created).orderNumber;

    const own = await request(app)
      .get(`/api/v1/orders/mine/${orderNumber}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(own.status).toBe(200);
    expect(asOrder(own).orderNumber).toBe(orderNumber);

    const other = await request(app)
      .get(`/api/v1/orders/mine/${orderNumber}`)
      .set("Authorization", `Bearer ${stranger}`);
    expect(other.status).toBe(404);
    expect(other.body.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/v1/orders/lookup", () => {
  it("finds a guest order by number and phone regardless of phone formatting", async () => {
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId, { phone: "0300-1234567" }));
    const orderNumber = asOrder(created).orderNumber;

    const response = await request(app)
      .post("/api/v1/orders/lookup")
      .send({ orderNumber, phone: "03001234567" });

    expect(response.status).toBe(200);
    expect(asOrder(response).orderNumber).toBe(orderNumber);
  });

  it("matches the order number case-insensitively", async () => {
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId));
    const orderNumber = asOrder(created).orderNumber;

    const response = await request(app)
      .post("/api/v1/orders/lookup")
      .send({ orderNumber: orderNumber.toLowerCase(), phone: "0300-1234567" });

    expect(response.status).toBe(200);
    expect(asOrder(response).orderNumber).toBe(orderNumber);
  });

  it("rejects a mismatched phone with 404", async () => {
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId));
    const orderNumber = asOrder(created).orderNumber;

    const response = await request(app)
      .post("/api/v1/orders/lookup")
      .send({ orderNumber, phone: "03119999999" });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });
});

describe("admin order management", () => {
  it("forbids anonymous and customer access", async () => {
    const anonymous = await request(app).get("/api/v1/admin/orders");
    expect(anonymous.status).toBe(401);

    const token = await createUserToken(CUSTOMER_EMAIL, "customer", "Casey Customer");
    const customer = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", `Bearer ${token}`);
    expect(customer.status).toBe(403);
  });

  it("returns an order by id and rejects a malformed id", async () => {
    const token = await createUserToken(ADMIN_EMAIL, "admin", "Ada Admin");
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId));
    const orderId = asOrder(created).id;

    const found = await request(app)
      .get(`/api/v1/admin/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(found.status).toBe(200);
    expect(asOrder(found).id).toBe(orderId);

    const missing = await request(app)
      .get("/api/v1/admin/orders/not-an-object-id")
      .set("Authorization", `Bearer ${token}`);
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("VALIDATION_ERROR");

    const unknown = await request(app)
      .get(`/api/v1/admin/orders/${new Types.ObjectId().toString()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(unknown.status).toBe(404);
    expect(unknown.body.code).toBe("NOT_FOUND");
  });

  it("advances an order through allowed status transitions", async () => {
    const token = await createUserToken(ADMIN_EMAIL, "admin", "Ada Admin");
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId));
    const orderId = asOrder(created).id;

    const confirmed = await request(app)
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "confirmed" });
    expect(confirmed.status).toBe(200);
    expect(asOrder(confirmed).status).toBe("confirmed");

    const shipped = await request(app)
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shipped", note: "Handed to courier" });
    expect(shipped.status).toBe(200);
    expect(asOrder(shipped).status).toBe("shipped");
    expect(asOrder(shipped).statusHistory.map((entry) => entry.status)).toEqual([
      "pending",
      "confirmed",
      "shipped",
    ]);
  });

  it("rejects a skipped status transition with 409", async () => {
    const token = await createUserToken(ADMIN_EMAIL, "admin", "Ada Admin");
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId));
    const orderId = asOrder(created).id;

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shipped" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("restores stock when an order is cancelled", async () => {
    const token = await createUserToken(ADMIN_EMAIL, "admin", "Ada Admin");
    const productId = await seedProduct({ stock: 5 });
    const created = await placeOrder(checkoutPayload(productId, { quantity: 2 }));
    const orderId = asOrder(created).id;

    const depleted = await Product.findById(productId);
    expect(depleted?.stock).toBe(3);

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "cancelled" });

    expect(response.status).toBe(200);
    expect(asOrder(response).status).toBe("cancelled");

    const restored = await Product.findById(productId);
    expect(restored?.stock).toBe(5);
  });

  it("lists orders with pagination and supports search", async () => {
    const token = await createUserToken(ADMIN_EMAIL, "admin", "Ada Admin");
    const productId = await seedProduct({ stock: 10 });
    const first = await placeOrder(checkoutPayload(productId));
    await placeOrder(checkoutPayload(productId));
    const orderNumber = asOrder(first).orderNumber;

    const page = await request(app)
      .get("/api/v1/admin/orders?limit=1")
      .set("Authorization", `Bearer ${token}`);
    expect(page.status).toBe(200);
    expect(page.body.total).toBe(2);
    expect(page.body.page).toBe(1);
    expect(page.body.limit).toBe(1);
    expect((page.body.items as PublicOrder[]).length).toBe(1);

    const searched = await request(app)
      .get(`/api/v1/admin/orders?q=${orderNumber}`)
      .set("Authorization", `Bearer ${token}`);
    expect(searched.status).toBe(200);
    expect(searched.body.total).toBe(1);
    expect((searched.body.items as PublicOrder[])[0]?.orderNumber).toBe(orderNumber);
  });
});
