import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
};

const outbox: OutboundMail[] = [];

export function readOutbox(): readonly OutboundMail[] {
  return outbox;
}

export function clearOutbox(): void {
  outbox.length = 0;
}

/**
 * Phase 7 replaces this with a real SMTP transport. Until then, tests read the
 * in-memory outbox and every other environment logs the message instead of
 * sending it, so no credentials are required to run the API locally.
 */
export function sendMail(mail: OutboundMail): void {
  if (env.isTest) {
    outbox.push(mail);
    return;
  }

  logger.info(
    { to: mail.to, subject: mail.subject, body: mail.text },
    "Outbound email (logged, not sent)",
  );
}
