import { env } from "../../config/env.js";
import { sendMail } from "../../utils/mailer.js";

export function sendVerificationEmail(to: string, token: string): void {
  const link = `${env.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;

  sendMail({
    to,
    subject: "Confirm your Glocommerce email address",
    text: [
      "Welcome to Glocommerce.",
      "",
      "Confirm your email address to finish setting up your account:",
      link,
      "",
      `This link expires in ${env.EMAIL_TOKEN_TTL_MINUTES} minutes.`,
      "If you did not create an account, you can ignore this message.",
    ].join("\n"),
  });
}

export function sendPasswordResetEmail(to: string, token: string): void {
  const link = `${env.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;

  sendMail({
    to,
    subject: "Reset your Glocommerce password",
    text: [
      "We received a request to reset your Glocommerce password.",
      "",
      "Choose a new password using the link below:",
      link,
      "",
      `This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes.`,
      "If you did not request a reset, no action is needed.",
    ].join("\n"),
  });
}
