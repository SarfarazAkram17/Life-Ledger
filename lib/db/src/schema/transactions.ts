import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transactionsTable = pgTable("ll_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'income' | 'expense'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  note: text("note").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
