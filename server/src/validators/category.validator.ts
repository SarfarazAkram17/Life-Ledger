import { z } from "zod";

const NAME_MAX = 40;
const ICON_MAX = 16;

export const categoryTypeSchema = z.enum(["expense", "income"]);

export const createCategorySchema = z.object({
  type: categoryTypeSchema,
  name: z.string().min(1).max(NAME_MAX),
  icon: z.string().min(1).max(ICON_MAX),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(NAME_MAX).optional(),
  icon: z.string().min(1).max(ICON_MAX).optional(),
  isArchived: z.boolean().optional(),
});

export const categoryParamsSchema = z.object({
  id: z.coerce.string(),
});

export const categoryResponseSchema = z.object({
  id: z.string(),
  type: categoryTypeSchema,
  name: z.string(),
  icon: z.string(),
  isArchived: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const categoryListResponseSchema = z.array(categoryResponseSchema);
