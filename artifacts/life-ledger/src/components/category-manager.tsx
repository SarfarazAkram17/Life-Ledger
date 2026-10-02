import React, { useMemo, useState } from "react";
import { Archive, Check, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useData, type TransactionType } from "@/contexts/data-context";
import { cn } from "@/lib/utils";

const ICON_CHOICES = [
  "🍔",
  "🚌",
  "🛍️",
  "🎬",
  "💡",
  "🏥",
  "📚",
  "📈",
  "✈️",
  "🏠",
  "🛡️",
  "👗",
  "📱",
  "🐾",
  "💆",
  "💰",
  "💼",
  "🏢",
  "🏘️",
  "🎯",
  "🎁",
  "📊",
  "🏦",
  "💳",
  "🔄",
  "🪙",
  "🏛️",
  "📦",
  "🎨",
  "🚗",
  "☕",
  "🧾",
];

export function CategoryManager() {
  const { categories, loading, addCategory, updateCategory } = useData();
  const [type, setType] = useState<TransactionType>("expense");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const typeCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );
  const activeCategories = typeCategories.filter(
    (category) => !category.isArchived,
  );
  const archivedCategories = typeCategories.filter(
    (category) => category.isArchived,
  );

  const resetForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setName("");
    setIcon("📦");
    setError("");
  };

  const beginAdd = () => {
    setEditingId(null);
    setName("");
    setIcon(type === "income" ? "💰" : "📦");
    setError("");
    setFormOpen(true);
  };

  const beginEdit = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    setEditingId(category.id);
    setName(category.name);
    setIcon(category.icon);
    setError("");
    setFormOpen(true);
  };

  const submitCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Enter a name for this category.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateCategory(editingId, { name: cleanName, icon });
      } else {
        await addCategory({ type, name: cleanName, icon });
      }
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save this category. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const setArchived = async (categoryId: string, isArchived: boolean) => {
    setBusyId(categoryId);
    setError("");
    try {
      await updateCategory(categoryId, { isArchived });
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to update this category. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby="category-manager-title"
      data-testid="category-manager"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="category-manager-title"
            className="text-base font-bold sm:text-lg"
          >
            Spending categories &amp; income sources
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Rename, customize, or archive categories. Archived categories stay
            on existing transactions and can be restored at any time.
          </p>
        </div>
        <button
          type="button"
          onClick={beginAdd}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="button-add-category"
        >
          <Plus className="h-4 w-4" />
          Add {type === "income" ? "source" : "category"}
        </button>
      </div>

      <div
        className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
        role="tablist"
        aria-label="Category type"
      >
        {(
          [
            ["expense", "Expense categories"],
            ["income", "Income sources"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={type === value}
            onClick={() => {
              setType(value);
              resetForm();
            }}
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              type === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {formOpen && (
        <form
          onSubmit={submitCategory}
          className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
          data-testid="form-category"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">
              {editingId
                ? "Rename and update icon"
                : `New ${type === "income" ? "income source" : "expense category"}`}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close category form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label
            htmlFor="category-name"
            className="mb-1.5 mt-4 block text-sm font-medium"
          >
            Name
          </label>
          <input
            id="category-name"
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            maxLength={40}
            placeholder={
              type === "income" ? "e.g. Consulting" : "e.g. Groceries"
            }
            className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none transition-colors focus:border-primary"
            data-testid="input-category-name"
          />

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">Choose an icon</legend>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-11">
              {ICON_CHOICES.map((choice, index) => (
                <button
                  key={`${choice}-${index}`}
                  type="button"
                  onClick={() => setIcon(choice)}
                  aria-label={`Choose icon ${choice}`}
                  aria-pressed={icon === choice}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-lg border text-xl transition-colors hover:bg-muted",
                    icon === choice
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-background",
                  )}
                >
                  {choice}
                </button>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="button-save-category"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      )}

      {error && !formOpen && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 divide-y divide-border/70">
        {loading && categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading your categories…
          </p>
        ) : activeCategories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active{" "}
            {type === "income" ? "income sources" : "expense categories"} yet.
          </p>
        ) : (
          activeCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-3 py-3 first:pt-1"
              data-testid={`category-row-${category.id}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-xl">
                {category.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {category.name}
              </span>
              <button
                type="button"
                onClick={() => beginEdit(category.id)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Edit ${category.name}`}
                title="Rename and change icon"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={busyId === category.id}
                onClick={() => void setArchived(category.id, true)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label={`Archive ${category.name}`}
                title="Archive category"
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {archivedCategories.length > 0 && (
        <div className="mt-2 border-t border-border pt-3">
          <button
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((visible) => !visible)}
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>Archived ({archivedCategories.length})</span>
            <span>{showArchived ? "Hide" : "Show"}</span>
          </button>
          {showArchived && (
            <div className="divide-y divide-border/70">
              {archivedCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 py-3"
                  data-testid={`category-row-${category.id}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xl opacity-70">
                    {category.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {category.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => beginEdit(category.id)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${category.name}`}
                    title="Rename and change icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === category.id}
                    onClick={() => void setArchived(category.id, false)}
                    className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    aria-label={`Restore ${category.name}`}
                    title="Restore category"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}