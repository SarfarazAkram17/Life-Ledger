import bcrypt from "bcryptjs";
import { Router } from "express";
import { db } from "@workspace/db";
import { userPinsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(requireAuth);

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000;

function isPin(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$|^\d{6}$/.test(value);
}

function isPinLength(value: unknown): value is 4 | 6 {
  return value === 4 || value === 6;
}

async function checkPin(userId: string, pin: string) {
  const [record] = await db.select().from(userPinsTable)
    .where(eq(userPinsTable.userId, userId)).limit(1);

  if (!record) return { exists: false, verified: false, locked: false };
  if (record.lockedUntil && record.lockedUntil.getTime() > Date.now()) {
    return { exists: true, verified: false, locked: true };
  }

  const verified = await bcrypt.compare(pin, record.pinHash);
  if (verified) {
    await db.update(userPinsTable).set({
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    }).where(eq(userPinsTable.userId, userId));
    return { exists: true, verified: true, locked: false };
  }

  const attempts = record.failedAttempts + 1;
  const locked = attempts >= MAX_PIN_ATTEMPTS;
  await db.update(userPinsTable).set({
    failedAttempts: locked ? 0 : attempts,
    lockedUntil: locked ? new Date(Date.now() + PIN_LOCKOUT_MS) : null,
    updatedAt: new Date(),
  }).where(eq(userPinsTable.userId, userId));
  return { exists: true, verified: false, locked };
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const [record] = await db.select({ length: userPinsTable.pinLength })
      .from(userPinsTable)
      .where(eq(userPinsTable.userId, req.user!.userId))
      .limit(1);
    res.json({ enabled: !!record, length: record?.length ?? null });
  } catch (err) {
    logger.error({ err }, "Get PIN status failed");
    res.status(500).json({ error: "Unable to load PIN settings." });
  }
});

router.put("/", async (req: AuthRequest, res) => {
  try {
    const { currentPin, newPin, length } = req.body as {
      currentPin?: unknown;
      newPin?: unknown;
      length?: unknown;
    };
    if (!isPin(newPin) || !isPinLength(length) || newPin.length !== length) {
      res.status(400).json({ error: "Enter a valid 4- or 6-digit PIN." });
      return;
    }

    const userId = req.user!.userId;
    const [existing] = await db.select().from(userPinsTable)
      .where(eq(userPinsTable.userId, userId)).limit(1);
    if (existing) {
      if (!isPin(currentPin)) {
        res.status(400).json({ error: "Enter your current PIN to update it." });
        return;
      }
      const check = await checkPin(userId, currentPin);
      if (check.locked) {
        res.status(429).json({ error: "Too many incorrect PIN attempts. Recover with your account password or try again later." });
        return;
      }
      if (!check.verified) {
        res.json({ updated: false, enabled: true, length: existing.pinLength });
        return;
      }
    } else if (currentPin !== undefined) {
      res.status(400).json({ error: "No existing PIN is set." });
      return;
    }

    const pinHash = await bcrypt.hash(newPin, 12);
    await db.insert(userPinsTable).values({
      userId,
      pinHash,
      pinLength: length,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: userPinsTable.userId,
      set: {
        pinHash,
        pinLength: length,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    });
    res.json({ updated: true, enabled: true, length });
  } catch (err) {
    logger.error({ err }, "Save PIN failed");
    res.status(500).json({ error: "Unable to save your PIN." });
  }
});

router.post("/verify", async (req: AuthRequest, res) => {
  try {
    const { pin } = req.body as { pin?: unknown };
    if (!isPin(pin)) {
      res.status(400).json({ error: "Enter a valid PIN." });
      return;
    }

    const check = await checkPin(req.user!.userId, pin);
    if (check.locked) {
      res.status(429).json({ error: "Too many incorrect PIN attempts. Recover with your account password or try again later." });
      return;
    }
    res.json({ verified: check.verified });
  } catch (err) {
    logger.error({ err }, "Verify PIN failed");
    res.status(500).json({ error: "Unable to verify the PIN." });
  }
});

router.delete("/", async (req: AuthRequest, res) => {
  try {
    const { currentPin } = req.body as { currentPin?: unknown };
    if (!isPin(currentPin)) {
      res.status(400).json({ error: "Enter your current PIN." });
      return;
    }

    const check = await checkPin(req.user!.userId, currentPin);
    if (check.locked) {
      res.status(429).json({ error: "Too many incorrect PIN attempts. Recover with your account password or try again later." });
      return;
    }
    if (!check.verified) {
      res.json({ removed: false });
      return;
    }

    await db.delete(userPinsTable).where(eq(userPinsTable.userId, req.user!.userId));
    res.json({ removed: true });
  } catch (err) {
    logger.error({ err }, "Remove PIN failed");
    res.status(500).json({ error: "Unable to remove your PIN." });
  }
});

router.post("/recover", async (req: AuthRequest, res) => {
  try {
    const { password } = req.body as { password?: unknown };
    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ error: "Enter your account password." });
      return;
    }

    const [user] = await db.select({
      passwordHash: usersTable.passwordHash,
    }).from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "That account password is not correct." });
      return;
    }

    await db.delete(userPinsTable).where(eq(userPinsTable.userId, req.user!.userId));
    res.json({ recovered: true });
  } catch (err) {
    logger.error({ err }, "Recover PIN failed");
    res.status(500).json({ error: "Unable to recover your PIN." });
  }
});

export default router;