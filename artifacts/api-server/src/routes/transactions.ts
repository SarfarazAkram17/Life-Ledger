import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, transactionsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const txs = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, req.user!.userId))
      .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));
    res.json(txs.map(t => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      category: t.category,
      date: t.date,
      note: t.note,
      createdAt: t.createdAt,
    })));
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { type, amount, category, date, note } = req.body as {
      type?: string; amount?: number; category?: string; date?: string; note?: string;
    };
    if (!type || !amount || !category || !date) {
      res.status(400).json({ error: "type, amount, category, and date are required" });
      return;
    }
    if (type !== "income" && type !== "expense") {
      res.status(400).json({ error: "Invalid transaction type" });
      return;
    }
    const [activeCategory] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(
        eq(categoriesTable.id, category),
        eq(categoriesTable.userId, req.user!.userId),
        eq(categoriesTable.type, type),
        eq(categoriesTable.isArchived, false),
      ))
      .limit(1);
    if (!activeCategory) {
      res.status(400).json({ error: "Choose an active category for this transaction" });
      return;
    }
    const [tx] = await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type,
      amount: String(amount),
      category,
      date,
      note: note || "",
    }).returning();
    res.status(201).json({
      id: tx.id, type: tx.type, amount: Number(tx.amount),
      category: tx.category, date: tx.date, note: tx.note, createdAt: tx.createdAt,
    });
  } catch (err) {
    console.error("Create transaction error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { type, amount, category, date, note } = req.body as {
      type?: string; amount?: number; category?: string; date?: string; note?: string;
    };
    const [current] = await db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.id, id),
        eq(transactionsTable.userId, req.user!.userId),
      ))
      .limit(1);
    if (!current) { res.status(404).json({ error: "Transaction not found" }); return; }

    const nextType = type ?? current.type;
    const nextCategory = category ?? current.category;
    if (nextType !== "income" && nextType !== "expense") {
      res.status(400).json({ error: "Invalid transaction type" });
      return;
    }
    if (category !== undefined || type !== undefined) {
      const [categoryRecord] = await db.select({
        id: categoriesTable.id,
        type: categoriesTable.type,
        isArchived: categoriesTable.isArchived,
      }).from(categoriesTable)
        .where(and(
          eq(categoriesTable.id, nextCategory),
          eq(categoriesTable.userId, req.user!.userId),
        ))
        .limit(1);
      const isExistingArchivedCategory =
        categoryRecord?.isArchived === true &&
        nextCategory === current.category &&
        nextType === current.type;
      if (
        !categoryRecord ||
        categoryRecord.type !== nextType ||
        (categoryRecord.isArchived && !isExistingArchivedCategory)
      ) {
        res.status(400).json({ error: "Choose an active category for this transaction" });
        return;
      }
    }

    const updates: Partial<typeof transactionsTable.$inferInsert> = {};
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = String(amount);
    if (category !== undefined) updates.category = category;
    if (date !== undefined) updates.date = date;
    if (note !== undefined) updates.note = note;
    const [tx] = await db.update(transactionsTable)
      .set(updates)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, req.user!.userId)))
      .returning();
    if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
    res.json({
      id: tx.id, type: tx.type, amount: Number(tx.amount),
      category: tx.category, date: tx.date, note: tx.note, createdAt: tx.createdAt,
    });
  } catch (err) {
    console.error("Update transaction error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(transactionsTable)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, req.user!.userId)));
    res.status(204).end();
  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
