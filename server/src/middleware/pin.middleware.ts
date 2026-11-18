import { Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { userPinsTable } from "../db/schema";
import { AuthRequest } from "./auth.middleware";
import { PIN_UNLOCK_TTL_SECONDS, verifyPinUnlockToken } from "../utils/jwt";
import { PIN_COOKIE, readCookie, setPinUnlockCookie } from "../utils/cookies";
import { logger } from "../utils/logger";

/**
 * Blocks access to financial data until the PIN has been entered, but only for
 * accounts that actually have a PIN. Must run after requireAuth.
 *
 * Being logged in is not enough: the PIN must also have been verified recently
 * (an httpOnly cookie the server issues on /pin/verify). The unlock renews while
 * the app is in use and expires on its own when it is idle.
 */
export async function requirePinUnlock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const [pin] = await db
      .select({ userId: userPinsTable.userId })
      .from(userPinsTable)
      .where(eq(userPinsTable.userId, userId))
      .limit(1);
    if (!pin) {
      next();
      return;
    }

    const unlocked = verifyPinUnlockToken(readCookie(req, PIN_COOKIE));
    if (!unlocked || unlocked.userId !== userId) {
      res.status(423).json({ error: "Enter your PIN to continue.", code: "PIN_REQUIRED" });
      return;
    }

    // Sliding expiry: keep the unlock alive while the person is actively using the app.
    const secondsLeft = unlocked.exp - Math.floor(Date.now() / 1000);
    if (secondsLeft < PIN_UNLOCK_TTL_SECONDS / 2) setPinUnlockCookie(res, userId);
    next();
  } catch (err) {
    logger.error({ err }, "PIN check failed");
    res.status(500).json({ error: "Server error" });
  }
}
