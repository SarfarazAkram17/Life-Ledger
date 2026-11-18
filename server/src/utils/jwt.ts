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
