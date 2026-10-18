import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const app = buildApp();

describe("GET /api/v1/health", () => {
  it("reports ok with an uptime and timestamp", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok" });
    expect(typeof response.body.uptime).toBe("number");
    expect(typeof response.body.timestamp).toBe("string");
  });
});

describe("unknown routes", () => {
  it("returns the 404 error contract", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: "NOT_FOUND" });
    expect(typeof response.body.message).toBe("string");
  });
});

describe("security headers", () => {
  it("sets helmet defaults and hides the framework", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("CORS", () => {
  it("allows the configured client origin", async () => {
    const response = await request(app)
      .get("/api/v1/health")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("rejects an unknown origin", async () => {
    const response = await request(app)
      .get("/api/v1/health")
      .set("Origin", "http://evil.example");

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: "CORS_NOT_ALLOWED" });
  });
});
