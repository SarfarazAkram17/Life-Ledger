import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, budgetsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.delete("/", async (req: AuthRequest, res) => {
  try {
    await db.delete(transactionsTable).where(eq(transactionsTable.userId, req.user!.userId));
    await db.delete(budgetsTable).where(eq(budgetsTable.userId, req.user!.userId));
    res.status(204).end();
  } catch (err) {
    console.error("Clear data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
