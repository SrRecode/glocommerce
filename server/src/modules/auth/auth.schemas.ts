import { z } from "zod";

const EMAIL_MESSAGE = "Enter a valid email address";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: EMAIL_MESSAGE }));

export const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters" })
  .max(128, { error: "Password must be at most 128 characters" });

const tokenSchema = z
  .string()
  .trim()
  .min(20, { error: "This link is invalid or has expired" })
  .max(200, { error: "This link is invalid or has expired" });

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(80, { error: "Name must be at most 80 characters" }),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Password is required" }),
});

export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
