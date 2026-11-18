import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

/**
 * Because the session is a cookie, the browser attaches it automatically, so a
 * malicious site could try to trigger requests on the person's behalf (CSRF).
 * Every request that changes data must come from our own client's origin.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  const origin = req.headers.origin ?? originFromReferer(req.headers.referer);
  if (origin === env.clientOrigin) {
    next();
    return;
  }
  res.status(403).json({ error: "Request blocked: untrusted origin" });
}
