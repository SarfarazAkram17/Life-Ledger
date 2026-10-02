import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const categoriesTable = pgTable(
  "ll_categories",
  {
    id: text("id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").$type<"expense" | "income">().notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    primaryKey: primaryKey({
      name: "ll_categories_pkey",
      columns: [table.userId, table.id],
    }),
    typeCheck: check(
      "ll_categories_type_check",
      sql`${table.type} in ('expense', 'income')`,
    ),
    userTypeNameUnique: uniqueIndex("ll_categories_user_type_name_unique").on(
      table.userId,
      table.type,
      sql`lower(${table.name})`,
    ),
  }),
);

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;