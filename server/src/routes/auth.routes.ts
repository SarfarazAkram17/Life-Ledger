import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { categoriesTable, usersTable, userPrefsTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CATEGORIES } from "../utils/default-categories";
import {
  PASSWORD_RESET_TTL_MINUTES,
  resetTokenMatchesPassword,
  signPasswordResetToken,
  signToken,
  verifyPasswordResetToken,
} from "../utils/jwt";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { sendPasswordResetEmail } from "../utils/mailer";
import { createRateLimiter } from "../utils/rate-limit";
import { clearPinUnlockCookie, clearSessionCookie, setSessionCookie } from "../utils/cookies";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", async (req, res): Promise<void> => {
  try {
    const { email, displayName, password } = req.body as {
      email?: string;
      displayName?: string;
      password?: string;
    };

    if (!email?.trim() || !displayName?.trim() || !password) {
      res.status(400).json({ error: "Email, display name, and password are required" });
      return;
    }

    const emailLower = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }
    if (displayName.trim().length < 2) {
      res.status(400).json({ error: "Display name must be at least 2 characters" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await db.transaction(async (tx) => {
      const [createdUser] = await tx.insert(usersTable).values({
        email: emailLower,
        displayName: displayName.trim(),
        passwordHash,
      }).returning();

      await tx.insert(userPrefsTable).values({ userId: createdUser.id });
      await tx.insert(categoriesTable).values(
        DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          userId: createdUser.id,
          isArchived: false,
        })),
      );
      return createdUser;
    });

    setSessionCookie(res, signToken({ userId: newUser.id, email: newUser.email }));
    clearPinUnlockCookie(res);
    res.status(201).json({
      user: { id: newUser.id, email: newUser.email, displayName: newUser.displayName },
    });
  } catch (err) {
    req.log.error(
      { errorName: err instanceof Error ? err.name : "UnknownError" },
      "Account registration failed",
    );
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    setSessionCookie(res, signToken({ userId: user.id, email: user.email }));
    // A fresh login always starts locked: the PIN has to be entered again.
    clearPinUnlockCookie(res);
    res.json({
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  clearPinUnlockCookie(res);
  res.status(204).end();
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ id: user.id, email: user.email, displayName: user.displayName });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Failed "current password" attempts per user, so a hijacked session cannot be used
// to guess the account password. (Kept in memory: it resets when the server restarts.)
const MAX_PASSWORD_ATTEMPTS = 5;
const PASSWORD_LOCKOUT_MS = 15 * 60 * 1000;
const passwordAttempts = new Map<string, { count: number; lockedUntil: number }>();

router.put("/password", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (typeof currentPassword !== "string" || currentPassword.length === 0) {
      res.status(400).json({ error: "Enter your current password" });
      return;
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }
    // bcrypt only uses the first 72 bytes, so longer passwords would not be fully protected.
    if (Buffer.byteLength(newPassword) > 72) {
      res.status(400).json({ error: "New password is too long (72 characters at most)" });
      return;
    }
    if (newPassword === currentPassword) {
      res.status(400).json({ error: "New password must be different from your current password" });
      return;
    }

    const userId = req.user!.userId;
    const attempts = passwordAttempts.get(userId);
    if (attempts && attempts.lockedUntil > Date.now()) {
      res.status(429).json({ error: "Too many incorrect attempts. Try again in a few minutes." });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      const count = (attempts && attempts.lockedUntil <= Date.now() ? 0 : attempts?.count ?? 0) + 1;
      const locked = count >= MAX_PASSWORD_ATTEMPTS;
      passwordAttempts.set(userId, {
        count: locked ? 0 : count,
        lockedUntil: locked ? Date.now() + PASSWORD_LOCKOUT_MS : 0,
      });
      res.status(401).json({ error: "Your current password is not correct" });
      return;
    }

    passwordAttempts.delete(userId);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));

    // Start a fresh 30-day session for this browser.
    setSessionCookie(res, signToken({ userId: user.id, email: user.email }));
    res.json({ updated: true });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Forgot / reset password ------------------------------------------------
const RESET_WINDOW_MS = 15 * 60 * 1000;
const forgotByEmail = createRateLimiter({ max: 3, windowMs: RESET_WINDOW_MS });
const forgotByIp = createRateLimiter({ max: 10, windowMs: RESET_WINDOW_MS });
const resetByIp = createRateLimiter({ max: 10, windowMs: RESET_WINDOW_MS });

const INVALID_RESET_LINK = "This reset link is invalid or has expired. Please request a new one.";

router.post("/forgot-password", async (req, res): Promise<void> => {
  try {
    const { email } = req.body as { email?: unknown };
    const emailLower = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }
    if (!forgotByIp.allow(req.ip ?? "unknown")) {
      res.status(429).json({ error: "Too many requests. Please try again in a few minutes." });
      return;
    }

    // The answer is always the same, so nobody can use this form to find out
    // which email addresses have an account.
    const genericResponse = { sent: true };
    if (!forgotByEmail.allow(emailLower)) {
      res.json(genericResponse);
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    res.json(genericResponse);
    if (!user) return;

    // Sent after replying, so response time does not reveal whether the account exists.
    const token = signPasswordResetToken(user.id, user.passwordHash);
    // The token goes in the URL fragment: it is never sent to a server or shown in a Referer header.
    const resetUrl = `${env.clientOrigin}/login#reset=${token}`;
    void sendPasswordResetEmail({
      to: user.email,
      displayName: user.displayName,
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
    }).catch((err) => {
      logger.error({ err }, "Could not send password reset email");
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/reset-password", async (req, res): Promise<void> => {
  try {
    const { token, newPassword } = req.body as { token?: unknown; newPassword?: unknown };
    if (!resetByIp.allow(req.ip ?? "unknown")) {
      res.status(429).json({ error: "Too many attempts. Please try again in a few minutes." });
      return;
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }
    if (Buffer.byteLength(newPassword) > 72) {
      res.status(400).json({ error: "New password is too long (72 characters at most)" });
      return;
    }

    const payload = typeof token === "string" ? verifyPasswordResetToken(token) : null;
    if (!payload) {
      res.status(400).json({ error: INVALID_RESET_LINK });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    // If the password changed since the link was made, the link has already been used.
    if (!user || !resetTokenMatchesPassword(payload.fp, user.passwordHash)) {
      res.status(400).json({ error: INVALID_RESET_LINK });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
    passwordAttempts.delete(user.id);

    // Make the person sign in again with the new password.
    clearSessionCookie(res);
    clearPinUnlockCookie(res);
    res.json({ reset: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/display-name", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { displayName } = req.body as { displayName?: string };
    if (!displayName?.trim() || displayName.trim().length < 2) {
      res.status(400).json({ error: "Display name must be at least 2 characters" });
      return;
    }
    const [updated] = await db.update(usersTable)
      .set({ displayName: displayName.trim() })
      .where(eq(usersTable.id, req.user!.userId))
      .returning();
    res.json({ id: updated.id, email: updated.email, displayName: updated.displayName });
  } catch (err) {
    console.error("Update display name error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
