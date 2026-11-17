import jwt from "jsonwebtoken";
import { env } from "../config/env";

const JWT_EXPIRY = "30d";

if (!env.jwtSecret && env.nodeEnv === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

const secret = env.jwtSecret || "dev-only-secret";

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}
