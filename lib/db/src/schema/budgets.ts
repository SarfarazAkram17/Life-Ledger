import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const budgetsTable = pgTable("ll_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  monthKey: text("month_key").notNull(), // YYYY-MM
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Budget = typeof budgetsTable.$inferSelect;
export type InsertBudget = typeof budgetsTable.$inferInsert;
