export type CategoryKind = "expense" | "income";

export interface Category {
  id: string;
  type: CategoryKind;
  name: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  type: CategoryKind;
  name: string;
  icon: string;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
  isArchived?: boolean;
}
