export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    if (fieldErrors) this.fieldErrors = fieldErrors;
  }

  static badRequest(message: string, fieldErrors?: FieldErrors): AppError {
    return new AppError(400, "BAD_REQUEST", message, fieldErrors);
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Not allowed"): AppError {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, "CONFLICT", message);
  }
}
