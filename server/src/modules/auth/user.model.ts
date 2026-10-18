import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import { USER_ROLES, type UserRole } from "./auth.types.js";

export interface UserAttrs {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserAttrs>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: [...USER_ROLES], default: "customer", required: true },
    isEmailVerified: { type: Boolean, default: false, required: true },
    // Only the hashes are hidden from queries; the expiry timestamps are needed by the
    // verification and reset flows, so keeping them selectable avoids an extra round trip.
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<UserAttrs>;

export const User: Model<UserAttrs> = model<UserAttrs>("User", userSchema);
