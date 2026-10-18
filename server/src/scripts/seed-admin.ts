import { hash } from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { User } from "../modules/auth/user.model.js";

function readArguments(): { email: string; password: string } {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    throw new Error("Usage: npm run seed:admin -- <email> <password>");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  return { email: email.trim().toLowerCase(), password };
}

async function main(): Promise<void> {
  const { email, password } = readArguments();

  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  await connectDatabase(env.MONGODB_URI);

  const passwordHash = await hash(password, env.bcryptCost);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        role: "admin",
        isEmailVerified: true,
        passwordHash,
      },
      $setOnInsert: {
        name: "Administrator",
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  logger.info(
    { id: user._id.toString(), email: user.email },
    "Admin account seeded (password set to the value supplied)",
  );

  await disconnectDatabase();
}

main().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to seed admin account");
  process.exitCode = 1;
});
