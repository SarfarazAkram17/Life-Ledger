import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { SESSION_COOKIE, readCookie } from "../utils/cookies";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/** The login session lives in an httpOnly cookie, so page scripts can never read or steal it. */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) {
    res.status(401).json({ error: "Unauthorized", code: "SESSION_EXPIRED" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session", code: "SESSION_EXPIRED" });
    return;
  }
  req.user = payload;
  next();
}
