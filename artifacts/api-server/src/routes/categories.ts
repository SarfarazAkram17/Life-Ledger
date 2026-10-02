import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  CreateCategoryBody,
  ListCategoriesResponse,
  ListCategoriesResponseItem,
  UpdateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { DEFAULT_CATEGORIES } from "../lib/default-categories.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function categoryResponse(category: typeof categoriesTable.$inferSelect) {
  return ListCategoriesResponseItem.parse({
    id: category.id,
    type: category.type,
    name: category.name,
    icon: category.icon,
    isArchived: category.isArchived,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  });
}

async function findNameConflict(
  userId: string,
  type: "expense" | "income",
  name: string,
  excludeId?: string,
) {
  const conditions = [
    eq(categoriesTable.userId, userId),
    eq(categoriesTable.type, type),
    sql`lower(${categoriesTable.name}) = lower(${name})`,
  ];
  if (excludeId) conditions.push(ne(categoriesTable.id, excludeId));

  const [existing] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(and(...conditions))
    .limit(1);
  return existing;
}

async function seedDefaultCategories(userId: string): Promise<void> {
  const defaultIds = DEFAULT_CATEGORIES.map((category) => category.id);
  const existingDefaults = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.userId, userId),
        inArray(categoriesTable.id, defaultIds),
      ),
    );
  const existingIds = new Set(existingDefaults.map((category) => category.id));
  const missingDefaults = DEFAULT_CATEGORIES.filter(
    (category) => !existingIds.has(category.id),
  );
  if (missingDefaults.length === 0) return;

  await db
    .insert(categoriesTable)
    .values(
      missingDefaults.map((category) => ({
        ...category,
        userId,
        isArchived: false,
      })),
    )
    .onConflictDoNothing();
}

router.get("/", async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.userId;
  await seedDefaultCategories(userId);

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .orderBy(asc(categoriesTable.type), asc(categoriesTable.name));

  res.json(ListCategoriesResponse.parse(categories.map(categoryResponse)));
});

router.post("/", async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Category name cannot be empty" });
    return;
  }

  await seedDefaultCategories(req.user!.userId);

  if (
    await findNameConflict(req.user!.userId, parsed.data.type, name)
  ) {
    res.status(409).json({ error: "A category with that name already exists" });
    return;
  }

  try {
    const [created] = await db
      .insert(categoriesTable)
      .values({
        id: randomUUID(),
        userId: req.user!.userId,
        type: parsed.data.type,
        name,
        icon: parsed.data.icon,
      })
      .returning();

    res.status(201).json(categoryResponse(created));
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "A category with that name already exists" });
      return;
    }
    req.log.error({ err: error }, "Failed to create category");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsedParams = UpdateCategoryParams.safeParse({ id: rawId });
  const parsed = UpdateCategoryBody.safeParse(req.body);

  if (!parsedParams.success || !parsed.success) {
    res.status(400).json({
      error: !parsedParams.success
        ? parsedParams.error.message
        : parsed.error.message,
    });
    return;
  }

  const { id } = parsedParams.data;
  const updates: Partial<typeof categoriesTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) {
    const name = parsed.data.name.trim();
    if (!name) {
      res.status(400).json({ error: "Category name cannot be empty" });
      return;
    }
    updates.name = name;
  }
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon;
  if (parsed.data.isArchived !== undefined)
    updates.isArchived = parsed.data.isArchived;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "At least one category field is required" });
    return;
  }

  const [current] = await db
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, id),
        eq(categoriesTable.userId, req.user!.userId),
      ),
    )
    .limit(1);

  if (!current) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  if (
    updates.name &&
    (await findNameConflict(
      req.user!.userId,
      current.type,
      updates.name,
      current.id,
    ))
  ) {
    res.status(409).json({ error: "A category with that name already exists" });
    return;
  }

  try {
    const [updated] = await db
      .update(categoriesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(categoriesTable.id, id),
          eq(categoriesTable.userId, req.user!.userId),
        ),
      )
      .returning();

    res.json(UpdateCategoryResponse.parse(categoryResponse(updated)));
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "A category with that name already exists" });
      return;
    }
    req.log.error({ err: error }, "Failed to update category");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;