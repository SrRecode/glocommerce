import mongoose from "mongoose";
import { logger } from "./logger.js";

export async function connectDatabase(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  // Reject query operators ($gt, $ne, …) smuggled through user input.
  mongoose.set("sanitizeFilter", true);

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("error", (error) => logger.error({ err: error }, "MongoDB error"));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
