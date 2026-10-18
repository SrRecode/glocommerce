import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/app-error.js";

export interface UploadableImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface StoredImage {
  url: string;
  publicId: string | null;
}

export const IMAGE_EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export const ALLOWED_IMAGE_MIMES: readonly string[] = Object.keys(IMAGE_EXTENSION_BY_MIME);

const CLOUDINARY_FOLDER = "glocommerce/products";

let cloudinaryReady = false;

function ensureCloudinary(): void {
  if (cloudinaryReady) {
    return;
  }

  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(500, "STORAGE_NOT_CONFIGURED", "Cloudinary is not configured");
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  cloudinaryReady = true;
}

async function storeLocally(file: UploadableImage, extension: string): Promise<StoredImage> {
  await mkdir(env.uploadsDir, { recursive: true });

  // Client-supplied filenames are never used as paths.
  const filename = `${randomUUID()}${extension}`;
  await writeFile(join(env.uploadsDir, filename), file.buffer);

  return { url: `/uploads/${filename}`, publicId: null };
}

async function storeInCloudinary(file: UploadableImage): Promise<StoredImage> {
  ensureCloudinary();

  const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: CLOUDINARY_FOLDER },
      (error, result) => {
        if (error || !result) {
          logger.error({ err: error }, "Cloudinary upload failed");
          reject(new AppError(502, "UPLOAD_FAILED", "Image upload failed"));
          return;
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });

  return { url: uploaded.secure_url, publicId: uploaded.public_id };
}

export async function uploadImage(file: UploadableImage): Promise<StoredImage> {
  const extension = IMAGE_EXTENSION_BY_MIME[file.mimetype];

  if (!extension) {
    throw AppError.badRequest("Only JPEG, PNG, WebP, or AVIF images are allowed");
  }

  if (!env.cloudinaryEnabled) {
    return storeLocally(file, extension);
  }

  return storeInCloudinary(file);
}
