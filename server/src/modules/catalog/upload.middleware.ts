import type { RequestHandler } from "express";
import multer from "multer";

import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { ALLOWED_IMAGE_MIMES } from "./storage.service.js";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

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

    next();
  });
};
