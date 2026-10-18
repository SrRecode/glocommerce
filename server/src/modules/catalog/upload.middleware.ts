import type { RequestHandler } from "express";
import { imageSize } from "image-size";
import multer from "multer";

import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { ALLOWED_IMAGE_MIMES } from "./storage.service.js";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

/**
 * A byte cap alone still lets a small file declare an enormous canvas, which
 * downstream resizing then has to allocate. Cap each side and the total pixel
 * count as well, so a tiny file cannot cost unbounded memory.
 */
const MAX_IMAGE_DIMENSION = 8192;
const MAX_IMAGE_PIXELS = 40_000_000;

function startsWith(buffer: Buffer, bytes: readonly number[]): boolean {
  if (buffer.length < bytes.length) {
    return false;
  }

  return bytes.every((byte, index) => buffer[index] === byte);
}

/**
 * Verify the file's real type from its magic bytes. The declared MIME type is
 * only trusted once it agrees with what the bytes actually are.
 */
export function detectImageMime(buffer: Buffer): string | null {
  if (startsWith(buffer, JPEG_SIGNATURE)) {
    return "image/jpeg";
  }

  if (startsWith(buffer, PNG_SIGNATURE)) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("latin1", 0, 4) === "RIFF" &&
    buffer.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.length >= 12 && buffer.toString("latin1", 4, 8) === "ftyp") {
    const brand = buffer.toString("latin1", 8, 12);
    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }
  }

  return null;
}

const INVALID_IMAGE_MESSAGE = "Only JPEG, PNG, WebP, or AVIF images are allowed";

/**
 * Read the intrinsic pixel size straight from the header bytes. Returns null
 * when the buffer is not a decodable image, so a file that passes the magic-byte
 * check but has a truncated or corrupt header is rejected rather than stored.
 */
function readImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    const { width, height } = imageSize(buffer);

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { width, height };
  } catch {
    return null;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      callback(AppError.badRequest(INVALID_IMAGE_MESSAGE));
      return;
    }

    callback(null, true);
  },
});

export const uploadImageFile: RequestHandler = (req, res, next) => {
  upload.single("image")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError(413, "UPLOAD_TOO_LARGE", "The image is too large"));
        return;
      }

      next(AppError.badRequest(error.message));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    const file = req.file;

    if (!file) {
      next(AppError.badRequest("No image file was provided"));
      return;
    }

    if (detectImageMime(file.buffer) !== file.mimetype) {
      next(AppError.badRequest("The uploaded file is not a valid image"));
      return;
    }

    const dimensions = readImageDimensions(file.buffer);

    if (!dimensions) {
      next(AppError.badRequest("The uploaded file is not a valid image"));
      return;
    }

    if (
      dimensions.width > MAX_IMAGE_DIMENSION ||
      dimensions.height > MAX_IMAGE_DIMENSION ||
      dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
    ) {
      next(
        new AppError(
          413,
          "UPLOAD_DIMENSIONS_TOO_LARGE",
          `Images must be at most ${MAX_IMAGE_DIMENSION}px on each side`,
        ),
      );
      return;
    }

    next();
  });
};
