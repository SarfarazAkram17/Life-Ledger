import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileSpreadsheet,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import type { Budget, Category, Transaction } from "@/contexts/data-context";
import {
  buildBudgetPreview,
  buildBudgetTable,
  buildTransactionPreview,
  buildTransactionTable,
  categoryMappingKey,
  guessBudgetColumnMapping,
  guessTransactionColumnMapping,
  parseCsvDocument,
  type CsvBudgetColumnMapping,
  type CsvBudgetPreviewRow,
  type CsvBudgetTable,
  type CsvColumnMapping,
  type CsvImportField,
  type CsvImportPreviewRow,
  type CsvImportTable,
} from "@/lib/csv-import";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  onImport: (tx: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
  onImportBudget: (budget: Omit<Budget, "id">) => Promise<void>;
}

const FIELD_LABELS: Record<CsvImportField, string> = {
  date: "Date",
  type: "Type",
  category: "Category",
  amount: "Amount",
  note: "Note",
};

const FIELD_ORDER: CsvImportField[] = [
  "date",
  "type",
  "category",
  "amount",
  "note",
];
const REQUIRED_FIELDS: CsvImportField[] = ["date", "category", "amount"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type ImportResult = {
  imported: number;
  importedBudgets: number;
  failures: {
    lineNumber: number;
    message: string;
    kind: "transaction" | "budget";
  }[];
};

type ImportProgress = {
  processed: number;
  total: number;
  imported: number;
  failed: number;
};

function BudgetImportPreview({
  table,
  mapping,
  rows,
  selectedCount,
  invalidCount,
  isImporting,
  includedRows,
  categories,
  categoryMappings,
  onMappingChange,
  onCategoryMapping,
  onToggle,
}: {
  table: CsvBudgetTable;
  mapping: CsvBudgetColumnMapping;
  rows: CsvBudgetPreviewRow[];
  selectedCount: number;
  invalidCount: number;
  isImporting: boolean;
  includedRows: Record<number, boolean>;
  categories: Category[];
  categoryMappings: Record<string, string>;
  onMappingChange: (field: keyof CsvBudgetColumnMapping, value: string) => void;
  onCategoryMapping: (sourceCategory: string, value: string) => void;
  onToggle: (row: CsvBudgetPreviewRow, checked: boolean) => void;
}) {
  const fields: { field: keyof CsvBudgetColumnMapping; label: string }[] = [
    { field: "month", label: "Month" },
    { field: "category", label: "Category" },
    { field: "amount", label: "Budget limit" },
  ];
  const unmappedCategories = [
    ...new Set(
      rows
        .filter((row) => row.sourceCategory && !row.categoryId)
        .map((row) => row.sourceCategory),
    ),
  ];

  return (
    <section aria-labelledby="budget-preview-title" className="space-y-4">
      <div>
        <h3 id="budget-preview-title" className="text-sm font-bold">
          Budget column mapping
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Mapped independently from transactions. Invalid budget rows stay
          blocked.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {fields.map(({ field, label }) => (
            <label key={field} className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {label} *
              </span>
              <select
                value={mapping[field] ?? ""}
                onChange={(event) => onMappingChange(field, event.target.value)}
                disabled={isImporting}
                aria-label={`Map budget ${label} column`}
                data-testid={`select-budget-column-${field}`}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Do not map</option>
                {table.headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
          {selectedCount} selected
        </span>
        {invalidCount > 0 && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-semibold text-destructive">
            {invalidCount} invalid
          </span>
        )}
      </div>

      {unmappedCategories.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <h4 className="text-sm font-semibold">Match budget categories</h4>
          {unmappedCategories.map((sourceCategory) => {
            const key = categoryMappingKey("expense", sourceCategory);
            return (
              <label
                key={key}
                className="grid gap-2 sm:grid-cols-2 sm:items-center"
              >
                <span className="text-sm">{sourceCategory}</span>
                <select
                  value={categoryMappings[key] ?? ""}
                  disabled={isImporting}
                  onChange={(event) =>
                    onCategoryMapping(sourceCategory, event.target.value)
                  }
                  aria-label={`Map budget category ${sourceCategory}`}
                  data-testid={`select-budget-category-remap-${key}`}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Choose active expense category</option>
                  {categories
                    .filter((category) => category.type === "expense")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
            );
          })}
        </div>
      )}

      <div className="overflow-auto rounded-2xl border border-border">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No budget rows found.
          </p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-3">
                  Include
                </th>
                <th scope="col" className="px-3 py-3">
                  Month
                </th>
                <th scope="col" className="px-3 py-3">
                  Category
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Limit
                </th>
                <th scope="col" className="px-3 py-3">
                  Review
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const invalid = row.errors.length > 0;
                const included =
                  !invalid &&
                  (includedRows[row.lineNumber] ?? !row.possibleDuplicate);
                return (
                  <tr
                    key={row.lineNumber}
                    data-testid={`row-budget-preview-${row.lineNumber}`}
                    className={invalid ? "bg-destructive/[0.035]" : "bg-card"}
                  >
                    <td className="px-3 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={included}
                        disabled={invalid || isImporting}
                        onChange={(event) =>
                          onToggle(row, event.target.checked)
                        }
                        aria-label={
                          invalid
                            ? `Budget row ${row.lineNumber} cannot be included`
                            : `${included ? "Exclude" : "Include"} budget row ${row.lineNumber}`
                        }
                        data-testid={`checkbox-include-budget-row-${row.lineNumber}`}
                        className="h-4 w-4 accent-[hsl(var(--primary))] disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-3">{row.monthKey ?? "—"}</td>
                    <td className="px-3 py-3">
                      {row.categoryName || row.sourceCategory || "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.amount?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      }) ?? "—"}
                    </td>
                    <td className="max-w-[20rem] px-3 py-3 text-xs">
                      {invalid ? (
                        <div
                          role="alert"
                          className="space-y-1 text-destructive"
                        >
                          {row.errors.map((error) => (
                            <p key={error}>{error}</p>
                          ))}
                        </div>
                      ) : row.possibleDuplicate ? (
                        <span className="text-amber-700 dark:text-amber-300">
                          {row.duplicateReason}{" "}
                          {included ? "Included." : "Excluded by default."}
                        </span>
                      ) : (
                        <span className="text-income">Ready to import</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export function CsvImportModal({
  isOpen,
  onClose,
  transactions,
  budgets,
  categories,
  onImport,
  onImportBudget,
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentText, setDocumentText] = useState("");
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<CsvImportTable | null>(null);
  const [budgetTable, setBudgetTable] = useState<CsvBudgetTable | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping>({
    date: null,
    type: null,
    category: null,
    amount: null,
    note: null,
  });
  const [budgetMapping, setBudgetMapping] = useState<CsvBudgetColumnMapping>({
    month: null,
    category: null,
    amount: null,
  });
  const [detectedHeaderLine, setDetectedHeaderLine] = useState<number | null>(
    null,
  );
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [categoryMappings, setCategoryMappings] = useState<
    Record<string, string>
  >({});
  const [includedRows, setIncludedRows] = useState<Record<number, boolean>>({});
  const [reviewTransactionsSnapshot, setReviewTransactionsSnapshot] = useState<
    Transaction[] | null
  >(null);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null,
  );
  const [fileError, setFileError] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const activeCategories = useMemo(
    () => categories.filter((category) => !category.isArchived),
    [categories],
  );

  const previewRows = useMemo(() => {
    if (!table) return [];
    return buildTransactionPreview(
      table,
      mapping,
      activeCategories,
      reviewTransactionsSnapshot ?? transactions,
      categoryMappings,
    );
  }, [
    table,
    mapping,
    activeCategories,
    transactions,
    reviewTransactionsSnapshot,
    categoryMappings,
  ]);

  const budgetPreviewRows = useMemo(() => {
    if (!budgetTable) return [];
    return buildBudgetPreview(
      budgetTable,
      budgetMapping,
      activeCategories,
      budgets,
      categoryMappings,
    );
  }, [budgetTable, budgetMapping, activeCategories, budgets, categoryMappings]);

  const invalidCount = previewRows.filter(
    (row) => row.errors.length > 0,
  ).length;
  const duplicateCount = previewRows.filter(
    (row) => row.errors.length === 0 && row.possibleDuplicate,
  ).length;
  const selectedCount = previewRows.filter(
    (row) =>
      row.errors.length === 0 &&
      (includedRows[row.lineNumber] ?? !row.possibleDuplicate),
  ).length;
  const selectedBudgetCount = budgetPreviewRows.filter(
    (row) =>
      row.errors.length === 0 &&
      (includedRows[row.lineNumber] ?? !row.possibleDuplicate),
  ).length;
  const budgetInvalidCount = budgetPreviewRows.filter(
    (row) => row.errors.length > 0,
  ).length;
  const hasMissingRequiredMapping = REQUIRED_FIELDS.some(
    (field) => mapping[field] === null,
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isImporting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isImporting, onClose]);

  useEffect(() => {
    if (isOpen) return;
    setDocumentText("");
    setFileName("");
    setTable(null);
    setBudgetTable(null);
    setMapping({
      date: null,
      type: null,
      category: null,
      amount: null,
      note: null,
    });
    setBudgetMapping({ month: null, category: null, amount: null });
    setDetectedHeaderLine(null);
    setFirstRowIsHeader(true);
    setCategoryMappings({});
    setIncludedRows({});
    setReviewTransactionsSnapshot(null);
    setFileError("");
    setImportResult(null);
    setIsReading(false);
    setIsImporting(false);
    setImportProgress(null);
  }, [isOpen]);

  const installDocument = (text: string, name: string) => {
    const parsed = parseCsvDocument(text);
    const detectedHeader = parsed.detectedHeaderLine !== null;
    const nextBudgetTable = buildBudgetTable(parsed);
    const parsedTable =
      detectedHeader || nextBudgetTable.rows.length === 0
        ? buildTransactionTable(parsed, detectedHeader)
        : null;
    const nextTable = parsedTable?.rows.length ? parsedTable : null;
    setDocumentText(text);
    setFileName(name);
    setDetectedHeaderLine(parsed.detectedHeaderLine);
    setFirstRowIsHeader(detectedHeader);
    setTable(nextTable);
    setBudgetTable(nextBudgetTable.rows.length ? nextBudgetTable : null);
    setMapping(
      nextTable
        ? guessTransactionColumnMapping(nextTable.headers)
        : { date: null, type: null, category: null, amount: null, note: null },
    );
    setBudgetMapping(guessBudgetColumnMapping(nextBudgetTable.headers));
    setCategoryMappings({});
    setIncludedRows({});
    setReviewTransactionsSnapshot(null);
    setImportProgress(null);
    setImportResult(null);
    setFileError("");
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setFileError("Choose a CSV file to continue.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        "This CSV is larger than 10 MB. Export or split it into smaller files.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsReading(true);
    setFileError("");
    try {
      const text = await file.text();
      if (!text.trim()) {
        setFileError("This file is empty. Choose a CSV with transaction rows.");
      } else {
        installDocument(text, file.name);
      }
    } catch {
      setFileError("This file could not be read. Please choose it again.");
    } finally {
      setIsReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateHeaderChoice = (checked: boolean) => {
    if (!documentText) return;
    const parsed = parseCsvDocument(documentText);
    const nextTable = buildTransactionTable(parsed, checked);
    setFirstRowIsHeader(checked);
    setTable(nextTable.rows.length ? nextTable : null);
    setMapping(
      checked
        ? guessTransactionColumnMapping(nextTable.headers)
        : { date: null, type: null, category: null, amount: null, note: null },
    );
    setCategoryMappings({});
    setIncludedRows({});
  };

  const updateMapping = (field: CsvImportField, value: string) => {
    const nextIndex = value === "" ? null : Number(value);
    setMapping((current) => {
      const next = { ...current, [field]: nextIndex };
      // A single source column should not accidentally feed multiple fields.
      if (nextIndex !== null) {
        for (const otherField of FIELD_ORDER) {
          if (otherField !== field && next[otherField] === nextIndex) {
            next[otherField] = null;
          }
        }
      }
      return next;
    });
    setCategoryMappings({});
    setIncludedRows({});
  };

  const updateBudgetMapping = (
    field: keyof CsvBudgetColumnMapping,
    value: string,
  ) => {
    const nextIndex = value === "" ? null : Number(value);
    setBudgetMapping((current) => {
      const next = { ...current, [field]: nextIndex };
      if (nextIndex !== null) {
        for (const otherField of ["month", "category", "amount"] as const) {
          if (otherField !== field && next[otherField] === nextIndex) {
            next[otherField] = null;
          }
        }
      }
      return next;
    });
    setIncludedRows({});
  };

  const unmappedCategories = useMemo(() => {
    const seen = new Set<string>();
    const findUnmapped = (
      sourceCategory: string,
      type: "income" | "expense",
    ) => {
      const key = categoryMappingKey(type, sourceCategory);
      if (seen.has(key)) return [];
      seen.add(key);
      const resolved = activeCategories.some(
        (category) =>
          category.type === type &&
          (category.id === sourceCategory ||
            categoryMappingKey(category.type, category.name) === key),
      );
      const mapped = activeCategories.some(
        (category) =>
          category.id === categoryMappings[key] && category.type === type,
      );
      return resolved || mapped ? [] : [{ key, type, sourceCategory }];
    };
    return [
      ...previewRows.flatMap((row) =>
        row.sourceCategory && row.type
          ? findUnmapped(row.sourceCategory, row.type)
          : [],
      ),
      ...budgetPreviewRows.flatMap((row) =>
        row.sourceCategory ? findUnmapped(row.sourceCategory, "expense") : [],
      ),
    ];
  }, [previewRows, budgetPreviewRows, activeCategories, categoryMappings]);

  const handleImport = async () => {
    const totalSelected = selectedCount + selectedBudgetCount;
    if (isImporting || importResult !== null || totalSelected === 0) return;
    const rowsToImport = previewRows.filter(
      (row) =>
        row.errors.length === 0 &&
        (includedRows[row.lineNumber] ?? !row.possibleDuplicate),
    );
    const budgetsToImport = budgetPreviewRows.filter(
      (row) =>
        row.errors.length === 0 &&
        (includedRows[row.lineNumber] ?? !row.possibleDuplicate),
    );
    if (rowsToImport.length + budgetsToImport.length === 0) return;
    setIsImporting(true);
    setImportResult(null);
    setReviewTransactionsSnapshot(transactions);
    let imported = 0;
    let importedBudgets = 0;
    const failures: ImportResult["failures"] = [];
    const total = rowsToImport.length + budgetsToImport.length;
    setImportProgress({
      processed: 0,
      total,
      imported: 0,
      failed: 0,
    });
    try {
      let processed = 0;
      for (const row of rowsToImport) {
        if (row.date && row.type && row.amount !== null && row.categoryId) {
          try {
            await onImport({
              date: row.date,
              type: row.type,
              amount: row.amount,
              category: row.categoryId,
              note: row.note,
            });
            imported += 1;
          } catch (error) {
            failures.push({
              lineNumber: row.lineNumber,
              kind: "transaction",
              message:
                error instanceof Error && error.message
                  ? error.message
                  : "Could not save this transaction.",
            });
          }
        } else {
          failures.push({
            lineNumber: row.lineNumber,
            kind: "transaction",
            message: "This row is missing a required transaction value.",
          });
        }
        processed += 1;
        setImportProgress({
          processed,
          total,
          imported: imported + importedBudgets,
          failed: failures.length,
        });
      }
      for (const row of budgetsToImport) {
        if (row.monthKey && row.amount !== null && row.categoryId) {
          try {
            await onImportBudget({
              category: row.categoryId,
              amount: row.amount,
              monthKey: row.monthKey,
            });
            importedBudgets += 1;
          } catch (error) {
            failures.push({
              lineNumber: row.lineNumber,
              kind: "budget",
              message:
                error instanceof Error && error.message
                  ? error.message
                  : "Could not save this budget.",
            });
          }
        } else {
          failures.push({
            lineNumber: row.lineNumber,
            kind: "budget",
            message: "This row is missing a required budget value.",
          });
        }
        processed += 1;
        setImportProgress({
          processed,
          total,
          imported: imported + importedBudgets,
          failed: failures.length,
        });
      }
      setImportResult({ imported, importedBudgets, failures });
    } finally {
      setIsImporting(false);
      onClose();
    }
  };

  const toggleRow = (
    row: CsvImportPreviewRow | CsvBudgetPreviewRow,
    checked: boolean,
  ) => {
    setIncludedRows((current) => ({
      ...current,
      [row.lineNumber]: checked,
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close CSV import"
            data-testid="button-close-csv-import-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isImporting && onClose()}
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[71] flex items-end justify-center sm:items-center sm:p-5"
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="csv-import-title"
              className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-card text-card-foreground shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.75rem]"
            >
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-8 sm:py-6">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Data management
                    </p>
                    <h2
                      id="csv-import-title"
                      className="text-xl font-bold tracking-tight sm:text-2xl"
                    >
                      Review CSV import
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Check every row and category before anything is added to
                      your ledger.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isImporting}
                  aria-label="Close import"
                  data-testid="button-close-csv-import"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
                  <main className="min-w-0 space-y-6">
                    {!table && !budgetTable ? (
                      <div className="rounded-2xl border border-dashed border-border bg-background/50 px-5 py-10 text-center sm:px-10">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          {isReading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <Upload className="h-6 w-6" />
                          )}
                        </div>
                        <h3 className="text-base font-semibold">
                          Choose a CSV file
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                          A file can contain transactions, budgets, or both. You
                          review and map each section separately before
                          importing.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,text/csv"
                          className="sr-only"
                          aria-label="Choose CSV file"
                          data-testid="input-csv-file"
                          onChange={(event) =>
                            void handleFile(event.target.files?.[0])
                          }
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isReading}
                          data-testid="button-choose-csv"
                          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                        >
                          <Upload className="h-4 w-4" />
                          {isReading ? "Reading file…" : "Choose CSV file"}
                        </button>
                        <p className="mt-3 text-xs text-muted-foreground">
                          CSV files only
                        </p>
                        {fileError && (
                          <p
                            role="alert"
                            data-testid="status-csv-file-error"
                            className="mt-4 text-sm text-destructive"
                          >
                            {fileError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-semibold"
                                data-testid="text-csv-file-name"
                              >
                                {fileName}
                              </p>
                              <p
                                className="mt-0.5 text-xs text-muted-foreground"
                                data-testid="text-csv-row-count"
                              >
                                {previewRows.length} transaction
                                {previewRows.length === 1 ? "" : "s"} ·{" "}
                                {budgetPreviewRows.length} budget
                                {budgetPreviewRows.length === 1 ? "" : "s"}{" "}
                                found
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {table && (
                              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={firstRowIsHeader}
                                  onChange={(event) =>
                                    updateHeaderChoice(event.target.checked)
                                  }
                                  disabled={isImporting}
                                  data-testid="checkbox-first-row-header"
                                  className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                                />
                                {detectedHeaderLine !== null
                                  ? `Use transaction header (line ${detectedHeaderLine})`
                                  : "First row contains headers"}
                              </label>
                            )}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              className="sr-only"
                              aria-label="Choose a different CSV file"
                              data-testid="input-replace-csv-file"
                              onChange={(event) =>
                                void handleFile(event.target.files?.[0])
                              }
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isReading || isImporting}
                              data-testid="button-replace-csv"
                              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            >
                              Choose another
                            </button>
                          </div>
                        </div>

                        {table && (
                          <>
                            <section aria-labelledby="column-mapping-title">
                              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                                <div>
                                  <h3
                                    id="column-mapping-title"
                                    className="text-sm font-bold"
                                  >
                                    Column mapping
                                  </h3>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Auto-matched from your headers. Adjust any
                                    field that needs it.
                                  </p>
                                </div>
                                <span
                                  data-testid="status-column-mapping"
                                  className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                                >
                                  {hasMissingRequiredMapping
                                    ? "Review required fields"
                                    : "Ready to review"}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                {FIELD_ORDER.map((field) => (
                                  <label key={field} className="block min-w-0">
                                    <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                      {FIELD_LABELS[field]}
                                      {REQUIRED_FIELDS.includes(field)
                                        ? " *"
                                        : " (optional)"}
                                    </span>
                                    <span className="relative block">
                                      <select
                                        value={mapping[field] ?? ""}
                                        onChange={(event) =>
                                          updateMapping(
                                            field,
                                            event.target.value,
                                          )
                                        }
                                        disabled={isImporting}
                                        aria-label={`Map ${FIELD_LABELS[field]} column`}
                                        data-testid={`select-column-${field}`}
                                        className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                      >
                                        <option value="">Do not map</option>
                                        {table.headers.map((header, index) => (
                                          <option
                                            key={`${header}-${index}`}
                                            value={index}
                                          >
                                            {header}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </section>

                            {unmappedCategories.length > 0 && (
                              <section
                                aria-labelledby="category-remap-title"
                                className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:p-5"
                              >
                                <div className="mb-4 flex items-start gap-3">
                                  <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                                    <CircleHelp className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h3
                                      id="category-remap-title"
                                      className="text-sm font-bold"
                                    >
                                      Match source categories
                                    </h3>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                      These names are not active categories.
                                      Choose an active category with the same
                                      transaction type to make those rows
                                      importable.
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {unmappedCategories.map((item) => {
                                    const options = activeCategories.filter(
                                      (category) => category.type === item.type,
                                    );
                                    return (
                                      <label
                                        key={item.key}
                                        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.9fr)] sm:items-center"
                                        data-testid={`row-category-remap-${item.key}`}
                                      >
                                        <span className="min-w-0 text-sm">
                                          <span className="block truncate font-semibold">
                                            {item.sourceCategory}
                                          </span>
                                          <span className="text-xs capitalize text-muted-foreground">
                                            {item.type} in this file
                                          </span>
                                        </span>
                                        <span className="relative">
                                          <select
                                            value={
                                              categoryMappings[item.key] ?? ""
                                            }
                                            disabled={isImporting}
                                            onChange={(event) => {
                                              const value = event.target.value;
                                              setCategoryMappings((current) => {
                                                const next = { ...current };
                                                if (value)
                                                  next[item.key] = value;
                                                else delete next[item.key];
                                                return next;
                                              });
                                              setIncludedRows({});
                                            }}
                                            aria-label={`Map source category ${item.sourceCategory}`}
                                            data-testid={`select-category-remap-${item.key}`}
                                            className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                                          >
                                            <option value="">
                                              Choose active {item.type} category
                                            </option>
                                            {options.map((category) => (
                                              <option
                                                key={category.id}
                                                value={category.id}
                                              >
                                                {category.name}
                                              </option>
                                            ))}
                                          </select>
                                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </section>
                            )}

                            <section aria-labelledby="preview-title">
                              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                  <h3
                                    id="preview-title"
                                    className="text-sm font-bold"
                                  >
                                    Transaction preview
                                  </h3>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Valid rows are selected by default. Invalid
                                    rows stay blocked; possible duplicates start
                                    unchecked.
                                  </p>
                                </div>
                                <div
                                  className="flex flex-wrap gap-2"
                                  data-testid="status-preview-summary"
                                >
                                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                    {selectedCount} selected
                                  </span>
                                  {invalidCount > 0 && (
                                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                                      {invalidCount} invalid
                                    </span>
                                  )}
                                  {duplicateCount > 0 && (
                                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                      {duplicateCount} possible duplicate
                                      {duplicateCount === 1 ? "" : "s"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {previewRows.length === 0 ? (
                                <div
                                  role="status"
                                  data-testid="empty-csv-preview"
                                  className="rounded-2xl border border-dashed border-border px-5 py-9 text-center"
                                >
                                  <Info className="mx-auto h-5 w-5 text-muted-foreground" />
                                  <p className="mt-2 text-sm font-semibold">
                                    No transaction rows found
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Check the header setting or choose a
                                    different CSV file.
                                  </p>
                                </div>
                              ) : (
                                <div className="overflow-hidden rounded-2xl border border-border">
                                  <div className="max-h-[25rem] overflow-auto">
                                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                                      <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                                        <tr>
                                          <th
                                            scope="col"
                                            className="w-12 px-3 py-3"
                                          >
                                            Include
                                          </th>
                                          <th scope="col" className="px-3 py-3">
                                            Date
                                          </th>
                                          <th scope="col" className="px-3 py-3">
                                            Type
                                          </th>
                                          <th scope="col" className="px-3 py-3">
                                            Category
                                          </th>
                                          <th
                                            scope="col"
                                            className="px-3 py-3 text-right"
                                          >
                                            Amount
                                          </th>
                                          <th scope="col" className="px-3 py-3">
                                            Note
                                          </th>
                                          <th scope="col" className="px-3 py-3">
                                            Review
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {previewRows.map((row) => {
                                          const invalid = row.errors.length > 0;
                                          const included =
                                            !invalid &&
                                            (includedRows[row.lineNumber] ??
                                              !row.possibleDuplicate);
                                          return (
                                            <tr
                                              key={row.lineNumber}
                                              data-testid={`row-csv-preview-${row.lineNumber}`}
                                              className={
                                                invalid
                                                  ? "bg-destructive/[0.035]"
                                                  : row.possibleDuplicate
                                                    ? "bg-amber-500/[0.035]"
                                                    : "bg-card"
                                              }
                                            >
                                              <td className="px-3 py-3 align-top">
                                                <input
                                                  type="checkbox"
                                                  checked={included}
                                                  disabled={
                                                    invalid || isImporting
                                                  }
                                                  onChange={(event) =>
                                                    toggleRow(
                                                      row,
                                                      event.target.checked,
                                                    )
                                                  }
                                                  aria-label={
                                                    invalid
                                                      ? `Row ${row.lineNumber} cannot be included`
                                                      : included
                                                        ? `Exclude row ${row.lineNumber}`
                                                        : `Include row ${row.lineNumber}`
                                                  }
                                                  data-testid={`checkbox-include-row-${row.lineNumber}`}
                                                  className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--primary))] disabled:opacity-40"
                                                />
                                              </td>
                                              <td className="whitespace-nowrap px-3 py-3 align-top tabular-nums text-foreground">
                                                {row.date ?? "—"}
                                              </td>
                                              <td className="px-3 py-3 align-top">
                                                {row.type ? (
                                                  <span
                                                    className={
                                                      row.type === "income"
                                                        ? "text-income"
                                                        : "text-expense"
                                                    }
                                                  >
                                                    {row.type === "income"
                                                      ? "Income"
                                                      : "Expense"}
                                                  </span>
                                                ) : (
                                                  "—"
                                                )}
                                              </td>
                                              <td
                                                className="max-w-44 truncate px-3 py-3 align-top"
                                                title={
                                                  row.categoryName ||
                                                  row.sourceCategory
                                                }
                                              >
                                                {row.categoryName ||
                                                  row.sourceCategory ||
                                                  "—"}
                                              </td>
                                              <td className="whitespace-nowrap px-3 py-3 text-right align-top tabular-nums font-medium">
                                                {row.amount === null
                                                  ? "—"
                                                  : row.amount.toLocaleString(
                                                      undefined,
                                                      {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                      },
                                                    )}
                                              </td>
                                              <td className="max-w-[14rem] px-3 py-3 align-top">
                                                <span
                                                  className="block truncate text-xs text-muted-foreground"
                                                  title={row.note}
                                                >
                                                  {row.note || "—"}
                                                </span>
                                              </td>
                                              <td className="max-w-[19rem] px-3 py-3 align-top">
                                                {invalid ? (
                                                  <div
                                                    role="alert"
                                                    data-testid={`status-invalid-row-${row.lineNumber}`}
                                                    className="space-y-1 text-xs text-destructive"
                                                  >
                                                    {row.errors.map((error) => (
                                                      <p
                                                        key={error}
                                                        className="flex items-start gap-1.5"
                                                      >
                                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                        <span>{error}</span>
                                                      </p>
                                                    ))}
                                                  </div>
                                                ) : row.possibleDuplicate ? (
                                                  <p
                                                    data-testid={`status-duplicate-row-${row.lineNumber}`}
                                                    className="flex items-start gap-1.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300"
                                                  >
                                                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                    <span>
                                                      {row.duplicateReason ??
                                                        "Possible duplicate."}
                                                      {included
                                                        ? " Included by choice."
                                                        : " Excluded by default."}
                                                    </span>
                                                  </p>
                                                ) : row.possibleDuplicate ? (
                                                  <p className="text-xs text-amber-700 dark:text-amber-300">
                                                    {row.duplicateReason ??
                                                      "Possible duplicate."}
                                                    {included
                                                      ? " Included."
                                                      : " Excluded by default."}
                                                  </p>
                                                ) : (
                                                  <span className="text-xs text-income">
                                                    Ready to import
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </section>
                          </>
                        )}

                        {budgetTable && (
                          <BudgetImportPreview
                            table={budgetTable}
                            mapping={budgetMapping}
                            rows={budgetPreviewRows}
                            selectedCount={selectedBudgetCount}
                            invalidCount={budgetInvalidCount}
                            isImporting={isImporting}
                            includedRows={includedRows}
                            categories={activeCategories}
                            categoryMappings={categoryMappings}
                            onMappingChange={updateBudgetMapping}
                            onCategoryMapping={(sourceCategory, value) => {
                              const key = categoryMappingKey(
                                "expense",
                                sourceCategory,
                              );
                              setCategoryMappings((current) => {
                                const next = { ...current };
                                if (value) next[key] = value;
                                else delete next[key];
                                return next;
                              });
                              setIncludedRows({});
                            }}
                            onToggle={toggleRow}
                          />
                        )}
                      </>
                    )}

                    {fileError && (table || budgetTable) && (
                      <p
                        role="alert"
                        data-testid="status-csv-file-error"
                        className="text-sm text-destructive"
                      >
                        {fileError}
                      </p>
                    )}

                    {importResult && (
                      <section
                        role={importResult.failures.length ? "alert" : "status"}
                        aria-live="polite"
                        data-testid="status-import-result"
                        className={`rounded-2xl border p-4 ${
                          importResult.failures.length
                            ? "border-amber-500/25 bg-amber-500/[0.06]"
                            : "border-primary/25 bg-primary/[0.06]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {importResult.failures.length ? (
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold">
                              {importResult.imported +
                                importResult.importedBudgets}{" "}
                              imported
                              {importResult.importedBudgets > 0 &&
                                ` (${importResult.imported} transactions, ${importResult.importedBudgets} budgets)`}
                              {importResult.failures.length > 0 &&
                                ` · ${importResult.failures.length} failed`}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {importResult.failures.length
                                ? "Successful rows were saved. Failed rows were left out; you can review their details below."
                                : "Your selected transactions and budgets are now in your ledger."}
                            </p>
                            {importResult.failures.length > 0 && (
                              <ul className="mt-3 space-y-1.5 text-xs text-foreground">
                                {importResult.failures.map((failure) => (
                                  <li
                                    key={`${failure.lineNumber}-${failure.message}`}
                                    data-testid={`text-import-failure-${failure.lineNumber}`}
                                  >
                                    CSV row {failure.lineNumber} ({failure.kind}
                                    ): {failure.message}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </section>
                    )}
                  </main>

                  <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                    <div className="rounded-2xl border border-primary/20 bg-primary/[0.055] p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <h3 className="text-sm font-bold">
                          Your ledger, unchanged until confirmed
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Selecting a file only creates this preview. Nothing is
                        saved before you choose to import.
                      </p>
                    </div>

                    {isImporting && importProgress && (
                      <p
                        role="status"
                        aria-live="polite"
                        data-testid="status-import-progress"
                        className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3 text-xs leading-relaxed text-foreground"
                      >
                        Saving {importProgress.processed} of{" "}
                        {importProgress.total}
                        {" · "}
                        {importProgress.imported} saved
                        {importProgress.failed > 0 &&
                          ` · ${importProgress.failed} failed`}
                      </p>
                    )}

                    {(table || budgetTable) && (
                      <div className="rounded-2xl border border-border bg-background/50 p-4 sm:p-5">
                        <h3 className="text-sm font-bold">Review summary</h3>
                        <dl className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">
                              Ready to import
                            </dt>
                            <dd
                              className="font-semibold tabular-nums"
                              data-testid="text-selected-count"
                            >
                              {selectedCount + selectedBudgetCount}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">
                              Invalid, blocked
                            </dt>
                            <dd
                              className={`font-semibold tabular-nums ${invalidCount ? "text-destructive" : ""}`}
                              data-testid="text-invalid-count"
                            >
                              {invalidCount + budgetInvalidCount}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">
                              Duplicates excluded
                            </dt>
                            <dd
                              className="font-semibold tabular-nums"
                              data-testid="text-duplicate-count"
                            >
                              {
                                [...previewRows, ...budgetPreviewRows].filter(
                                  (row) =>
                                    row.possibleDuplicate &&
                                    !(includedRows[row.lineNumber] ?? false),
                                ).length
                              }
                            </dd>
                          </div>
                        </dl>
                        {table && hasMissingRequiredMapping && (
                          <p
                            role="status"
                            data-testid="status-required-mapping"
                            className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300"
                          >
                            Map Date, Category, and Amount. Type can be omitted
                            only when expense amounts are negative.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="hidden rounded-2xl border border-border/70 p-4 text-xs leading-relaxed text-muted-foreground lg:block">
                      Invalid rows cannot be imported. Review each flagged row
                      above, then correct the file and choose it again if
                      needed.
                    </div>
                  </aside>
                </div>
              </div>

              <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card/95 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <Info className="h-3.5 w-3.5" />
                  You can close this review without importing anything.
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isImporting}
                    data-testid="button-cancel-csv-import"
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {importResult ? "Close" : "Cancel"}
                  </button>
                  {(table || budgetTable) && (
                    <button
                      type="button"
                      onClick={() => void handleImport()}
                      disabled={
                        isImporting ||
                        importResult !== null ||
                        selectedCount + selectedBudgetCount === 0
                      }
                      data-testid="button-confirm-csv-import"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {importProgress
                            ? `Importing ${importProgress.processed}/${importProgress.total}…`
                            : "Preparing import…"}
                        </>
                      ) : importResult ? (
                        <>
                          <Check className="h-4 w-4" />
                          Import complete
                        </>
                      ) : (
                        `Import ${selectedCount + selectedBudgetCount} selected`
                      )}
                    </button>
                  )}
                </div>
              </footer>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
