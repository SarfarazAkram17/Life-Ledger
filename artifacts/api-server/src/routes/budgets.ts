import { Router } from "express";
import { db } from "@workspace/db";
import { budgetsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const budgets = await db.select().from(budgetsTable)
      .where(eq(budgetsTable.userId, req.user!.userId));
    res.json(budgets.map(b => ({
      id: b.id, category: b.category,
      amount: Number(b.amount), monthKey: b.monthKey,
    })));
  } catch (err) {
    console.error("Get budgets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { category, amount, monthKey } = req.body as {
      category?: string; amount?: number; monthKey?: string;
    };
    if (!category || !amount || !monthKey) {
      res.status(400).json({ error: "category, amount, and monthKey are required" });
      return;
    }
    const existing = await db.select().from(budgetsTable)
      .where(and(
        eq(budgetsTable.userId, req.user!.userId),
        eq(budgetsTable.category, category),
        eq(budgetsTable.monthKey, monthKey)
      )).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(budgetsTable)
        .set({ amount: String(amount) })
        .where(eq(budgetsTable.id, existing[0].id))
        .returning();
      res.json({ id: updated.id, category: updated.category, amount: Number(updated.amount), monthKey: updated.monthKey });
      return;
    }
    const [budget] = await db.insert(budgetsTable).values({
      userId: req.user!.userId, category, amount: String(amount), monthKey,
    }).returning();
    res.status(201).json({ id: budget.id, category: budget.category, amount: Number(budget.amount), monthKey: budget.monthKey });
  } catch (err) {
    console.error("Create budget error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body as { amount?: number };
    if (!amount) { res.status(400).json({ error: "amount is required" }); return; }
    const [budget] = await db.update(budgetsTable)
      .set({ amount: String(amount) })
      .where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, req.user!.userId)))
      .returning();
    if (!budget) { res.status(404).json({ error: "Budget not found" }); return; }
    res.json({ id: budget.id, category: budget.category, amount: Number(budget.amount), monthKey: budget.monthKey });
  } catch (err) {
    console.error("Update budget error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(budgetsTable)
      .where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, req.user!.userId)));
    res.status(204).end();
  } catch (err) {
    console.error("Delete budget error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
