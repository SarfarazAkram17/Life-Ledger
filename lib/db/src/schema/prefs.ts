import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userPrefsTable = pgTable("ll_user_prefs", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  theme: text("theme").default("emerald").notNull(),
  currency: text("currency").default("USD").notNull(),
  avatar: text("avatar"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPrefs = typeof userPrefsTable.$inferSelect;
export type InsertUserPrefs = typeof userPrefsTable.$inferInsert;
