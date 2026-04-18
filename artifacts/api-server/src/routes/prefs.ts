import { Router } from "express";
import { db } from "@workspace/db";
import { userPrefsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const [prefs] = await db.select().from(userPrefsTable)
      .where(eq(userPrefsTable.userId, req.user!.userId)).limit(1);
    if (!prefs) {
      await db.insert(userPrefsTable).values({ userId: req.user!.userId });
      res.json({ theme: "emerald", currency: "USD", avatar: null });
      return;
    }
    res.json({ theme: prefs.theme, currency: prefs.currency, avatar: prefs.avatar ?? null });
  } catch (err) {
    console.error("Get prefs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/", async (req: AuthRequest, res) => {
  try {
    const { theme, currency, avatar } = req.body as {
      theme?: string; currency?: string; avatar?: string | null;
    };
    const updates: Partial<typeof userPrefsTable.$inferInsert> = { updatedAt: new Date() };
    if (theme !== undefined) updates.theme = theme;
    if (currency !== undefined) updates.currency = currency;
    if (avatar !== undefined) updates.avatar = avatar;
    const existing = await db.select().from(userPrefsTable)
      .where(eq(userPrefsTable.userId, req.user!.userId)).limit(1);
    let prefs;
    if (existing.length === 0) {
      [prefs] = await db.insert(userPrefsTable).values({ userId: req.user!.userId, ...updates }).returning();
    } else {
      [prefs] = await db.update(userPrefsTable).set(updates)
        .where(eq(userPrefsTable.userId, req.user!.userId)).returning();
    }
    res.json({ theme: prefs.theme, currency: prefs.currency, avatar: prefs.avatar ?? null });
  } catch (err) {
    console.error("Update prefs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
