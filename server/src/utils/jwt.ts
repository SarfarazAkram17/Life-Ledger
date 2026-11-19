import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const JWT_EXPIRY = "30d";
/** How long an unlocked PIN stays valid without activity (it renews while you use the app). */
export const PIN_UNLOCK_TTL_SECONDS = 30 * 60;

if (!env.jwtSecret && env.nodeEnv === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

const secret = env.jwtSecret || "dev-only-secret";
// A different key, so a PIN-unlock token can never be accepted as a login session (or the reverse).
const pinSecret = `${secret}:pin-unlock`;

/** How long a password reset link stays valid. */
export const PASSWORD_RESET_TTL_MINUTES = 30;
const resetSecret = `${secret}:password-reset`;

/** A short fingerprint of the current password hash; it changes the moment the password does. */
function passwordFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 32);
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY, algorithm: "HS256" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayload;
    return typeof payload.userId === "string" ? payload : null;
  } catch {
    return null;
  }
}

export function signPinUnlockToken(userId: string): string {
  return jwt.sign({ userId }, pinSecret, {
    expiresIn: PIN_UNLOCK_TTL_SECONDS,
    algorithm: "HS256",
  });
}

export function verifyPinUnlockToken(
  token: string | undefined,
): { userId: string; exp: number } | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, pinSecret, { algorithms: ["HS256"] }) as {
      userId?: unknown;
      exp?: unknown;
    };
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    return { userId: payload.userId, exp: payload.exp };
  } catch {
    return null;
  }
}

/**
 * A single-use reset token. It carries a fingerprint of the user's current password
 * hash, so it stops working as soon as the password is changed (by this link or any other).
 */
export function signPasswordResetToken(userId: string, passwordHash: string): string {
  return jwt.sign({ userId, fp: passwordFingerprint(passwordHash) }, resetSecret, {
    expiresIn: PASSWORD_RESET_TTL_MINUTES * 60,
    algorithm: "HS256",
  });
}

export function verifyPasswordResetToken(token: string): { userId: string; fp: string } | null {
  try {
    const payload = jwt.verify(token, resetSecret, { algorithms: ["HS256"] }) as {
      userId?: unknown;
      fp?: unknown;
    };
    if (typeof payload.userId !== "string" || typeof payload.fp !== "string") return null;
    return { userId: payload.userId, fp: payload.fp };
  } catch {
    return null;
  }
}

/** True when the token's fingerprint still matches the user's current password hash. */
export function resetTokenMatchesPassword(fp: string, passwordHash: string): boolean {
  const expected = Buffer.from(passwordFingerprint(passwordHash));
  const actual = Buffer.from(fp);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
