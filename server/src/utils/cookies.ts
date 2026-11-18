import type { Request, Response, CookieOptions } from "express";
import { env } from "../config/env";
import { PIN_UNLOCK_TTL_SECONDS, signPinUnlockToken } from "./jwt";

export const SESSION_COOKIE = "ll_session";
export const PIN_COOKIE = "ll_pin";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Reads one cookie from the request (no cookie-parser dependency needed). */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// httpOnly: JavaScript in the page can never read these cookies, even if a script gets injected.
function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: "/",
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(), maxAge: SESSION_MAX_AGE_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseOptions());
}

export function setPinUnlockCookie(res: Response, userId: string): void {
  res.cookie(PIN_COOKIE, signPinUnlockToken(userId), {
    ...baseOptions(),
    maxAge: PIN_UNLOCK_TTL_SECONDS * 1000,
  });
}

export function clearPinUnlockCookie(res: Response): void {
  res.clearCookie(PIN_COOKIE, baseOptions());
}
