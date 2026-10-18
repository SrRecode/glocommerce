import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface RefreshSessionAttrs {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new Schema<RefreshSessionAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true },
);

// Expired sessions are also checked in code; this index just keeps the collection tidy.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshSessionDocument = HydratedDocument<RefreshSessionAttrs>;

export const RefreshSession: Model<RefreshSessionAttrs> = model<RefreshSessionAttrs>(
  "RefreshSession",
  refreshSessionSchema,
);
