export const USER_ROLES = ["customer", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return value === "customer" || value === "admin";
}

/** The only user shape ever sent to a client. Never includes hashes or tokens. */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
};

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};

/** Request-derived metadata stored alongside a refresh session. */
export type SessionContext = {
  userAgent: string | null;
  ip: string | null;
};

export type AuthSession = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};
