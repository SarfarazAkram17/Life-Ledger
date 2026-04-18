import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, userPrefsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/auth.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
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
    const [newUser] = await db.insert(usersTable).values({
      email: emailLower,
      displayName: displayName.trim(),
      passwordHash,
    }).returning();

    await db.insert(userPrefsTable).values({ userId: newUser.id });

    const token = signToken({ userId: newUser.id, email: newUser.email });
    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, displayName: newUser.displayName },
    });
  } catch (err) {
    console.error("Register error:", err);
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

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
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
