"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Sparkles, FileSpreadsheet, ArrowRight, CalendarDays, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useYear } from "@/lib/year";
import { cn } from "@/lib/utils";
import type { AuthConfig, ImportAnalyze, ImportSheet } from "@/lib/types";
import { Button, Card, Label, Select, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

const ENTITY_FIELDS: Record<string, string[]> = {
  students_fees: [
    // identity + contacts
    "name", "admission_number", "roll_number", "class_name", "section", "category",
    "father_name", "father_phone", "mother_name", "mother_phone", "phone",
    // fees
    "total_fee", "fee_after_discount", "discount", "opening_dues",
    // per-quarter installment amounts (the schedule, e.g. "1st QTR Due")
    "q1_amount", "q2_amount", "q3_amount", "q4_amount",
    // collections: a single paid amount, the outstanding balance, or per-quarter paid
    "total_due", "paid_amount", "q1_paid", "q2_paid", "q3_paid", "q4_paid",
    "receipt_number",
  ],
  fee_structures: ["class_name", "academic_year", "total_amount", "num_installments"],
};
// Friendly labels for the mapping dropdowns; falls back to the field name otherwise.
const FIELD_LABELS: Record<string, string> = {
  name: "Student name",
  admission_number: "Admission / SR no.",
  roll_number: "Roll no.",
  class_name: "Class",
  section: "Section",
  category: "Category",
  phone: "Contact phone",
  total_fee: "Total fee",
  discount: "Discount",
  father_name: "Father's name",
  father_phone: "Father's phone",
  mother_name: "Mother's name",
  mother_phone: "Mother's phone",
  fee_after_discount: "Fee after discount",
  opening_dues: "Opening dues (last yr)",
  q1_amount: "1st Qtr — amount",
  q2_amount: "2nd Qtr — amount",
  q3_amount: "3rd Qtr — amount",
  q4_amount: "4th Qtr — amount",
  total_due: "Total due (balance)",
  paid_amount: "Total paid",
  q1_paid: "1st Qtr — paid",
  q2_paid: "2nd Qtr — paid",
  q3_paid: "3rd Qtr — paid",
  q4_paid: "4th Qtr — paid",
  receipt_number: "Receipt no.",
  total_amount: "Total amount",
  num_installments: "No. of installments",
  academic_year: "Academic year",
};
const ENTITY_LABELS: Record<string, string> = {
  students_fees: "Students + Fees",
  fee_structures: "Fee Structure Templates",
  skip: "Skip this sheet",
};
const SOURCE_LABELS: Record<string, string> = {
  sheet: "from sheet name",
  filename: "from file name",
  column: "from a column",
};

interface SheetState {
  entity: string;
  mapping: Record<string, string>;
}

export default function ImportPage() {
  const { canWrite } = useAuth();
  const { year, years: pickerYears } = useYear();
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<ImportAnalyze | null>(null);
  const [states, setStates] = useState<SheetState[]>([]);
  const [years, setYears] = useState<Record<string, string>>({});
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    api.get<AuthConfig>("/api/auth/config").then((c) => setAiEnabled(c.ai_enabled)).catch(() => {});
  }, []);

  if (!canWrite) {
    return <p className="text-muted-foreground">You need an admin role to import data.</p>;
  }

  async function handleFile(file: File) {
    setAnalyzing(true);
    setResult(null);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<ImportAnalyze>("/api/imports/analyze", fd);
      setResult(res);
      setStates(
        res.sheets.map((s) => ({
          entity: s.suggested_entity in ENTITY_FIELDS ? s.suggested_entity : "skip",
          mapping: { ...s.suggested_mapping },
        })),
      );
      // Pre-fill each sheet's academic year from what we detected; fall back to the
      // currently-selected year. Sheets with no detected year stay "unanswered" so
      // the clarification panel asks the user about them.
      setYears(Object.fromEntries(res.sheets.map((s) => [s.sheet_name, s.detected_academic_year ?? year])));
      setAnswered(Object.fromEntries(res.sheets.map((s) => [s.sheet_name, s.detected_academic_year != null])));
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setAnalyzing(false);
    }
  }

  function setSheetYear(sheetName: string, value: string) {
    setYears((p) => ({ ...p, [sheetName]: value }));
    setAnswered((p) => ({ ...p, [sheetName]: true }));
  }

  async function commit() {
    if (!result) return;
    setCommitting(true);
    try {
      const payload = {
        file_token: result.file_token,
        sheets: result.sheets.map((s, i) => ({
          sheet_name: s.sheet_name,
          entity: states[i].entity,
          mapping: states[i].mapping,
          academic_year: years[s.sheet_name] ?? year,
        })),
      };
      const res = await api.post<{
        students_created: number;
        student_fees_created: number;
        fee_structures_created: number;
        skipped: number;
        errors: string[];
      }>("/api/imports/commit", payload);
      qc.invalidateQueries();
      toast(
        `Imported ${res.students_created} students, ${res.student_fees_created} fee records, ${res.fee_structures_created} structures`,
      );
      if (res.errors.length) res.errors.forEach((er) => toast(er, "error"));
      router.push("/students");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setCommitting(false);
    }
  }

  const yearOptions = result?.year_options?.length ? result.year_options : pickerYears;
  // Sheets we'll actually import but couldn't pin a year on — these need a human answer.
  const unresolved =
    result?.sheets.filter((s, i) => states[i]?.entity !== "skip" && !answered[s.sheet_name]) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import from Excel</h1>
        <p className="text-sm text-muted-foreground">
          Upload any .xlsx — {aiEnabled ? "AI maps the columns" : "columns are auto-matched"} to our schema, then you confirm.
        </p>
      </div>

      <Card className="flex items-center gap-2 p-4">
        <Sparkles className={`h-4 w-4 ${aiEnabled ? "text-violet-500" : "text-muted-foreground"}`} />
        <span className="text-sm text-muted-foreground">
          {aiEnabled ? (
            <>AI mapping is <b className="text-violet-600 dark:text-violet-400">enabled</b> (OpenRouter).</>
          ) : (
            <>AI mapping is <b className="text-foreground">off</b> — set <code className="rounded bg-muted px-1">OPENROUTER_API_KEY</code> in backend env to enable. Heuristic matching is used meanwhile.</>
          )}
        </span>
      </Card>

      {/* Upload zone */}
      <Card
        className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-border p-12 text-center transition-colors hover:border-primary hover:bg-accent/40"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xlsm"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {analyzing ? (
          <>
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Analyzing {fileName}…</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Upload className="h-6 w-6 text-accent-foreground" />
            </div>
            <p className="font-medium text-foreground">
              {fileName || "Click to upload or drag an .xlsx file here"}
            </p>
            <p className="text-xs text-muted-foreground">Supports multiple sheets · Students &amp; Fee Structures</p>
          </>
        )}
      </Card>

      {/* Review */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            {result.ai_used ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                <Sparkles className="h-3.5 w-3.5" /> AI-mapped
              </span>
            ) : (
              <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
                Heuristic mapping
              </span>
            )}
            <span className="text-muted-foreground">Review &amp; adjust — each sheet imports into its own academic year</span>
          </div>

          {/* Clarification — Claude-Code-style questions for sheets whose year we
              couldn't determine. Picking an option resolves that sheet. */}
          {unresolved.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 border-b border-amber-200 px-5 py-3 dark:border-amber-500/30">
                <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-foreground">A couple of things to confirm before importing</span>
              </div>
              <div className="divide-y divide-amber-200/70 dark:divide-amber-500/20">
                {unresolved.map((s) => (
                  <div key={s.sheet_name} className="px-5 py-4">
                    <p className="text-sm font-medium text-foreground">
                      Which academic year is <span className="font-semibold">“{s.sheet_name}”</span> for?
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      We couldn&apos;t find a year in the file name, sheet tab, or its columns. Pick one to apply.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {yearOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSheetYear(s.sheet_name, opt)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                            years[s.sheet_name] === opt
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary hover:bg-accent",
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.sheets.map((sheet, i) => (
            <SheetCard
              key={sheet.sheet_name}
              sheet={sheet}
              state={states[i]}
              year={years[sheet.sheet_name] ?? year}
              yearOptions={yearOptions}
              needsYear={states[i]?.entity !== "skip" && !answered[sheet.sheet_name]}
              onYearChange={(y) => setSheetYear(sheet.sheet_name, y)}
              onChange={(st) => setStates((p) => p.map((x, idx) => (idx === i ? st : x)))}
            />
          ))}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResult(null)}>
              Cancel
            </Button>
            <Button onClick={commit} disabled={committing}>
              {committing ? "Importing…" : <>Import <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SheetCard({
  sheet,
  state,
  year,
  yearOptions,
  needsYear,
  onYearChange,
  onChange,
}: {
  sheet: ImportSheet;
  state: SheetState;
  year: string;
  yearOptions: string[];
  needsYear: boolean;
  onYearChange: (y: string) => void;
  onChange: (s: SheetState) => void;
}) {
  const fields = ENTITY_FIELDS[state.entity] ?? [];
  const sourceLabel = sheet.academic_year_source ? SOURCE_LABELS[sheet.academic_year_source] : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-foreground">{sheet.sheet_name}</span>
          <span className="text-xs text-muted-foreground">· {sheet.row_count} rows</span>
          {sheet.confidence && (
            <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
              {sheet.confidence} confidence
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label className="mb-0 text-xs">Import as</Label>
          <Select
            value={state.entity}
            onChange={(e) => onChange({ entity: e.target.value, mapping: e.target.value === state.entity ? state.mapping : {} })}
            className="h-9 w-56"
          >
            <option value="skip">{ENTITY_LABELS.skip}</option>
            <option value="students_fees">{ENTITY_LABELS.students_fees}</option>
            <option value="fee_structures">{ENTITY_LABELS.fee_structures}</option>
          </Select>
        </div>
      </div>

      {/* Per-sheet academic year */}
      {state.entity !== "skip" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-card px-5 py-2.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Label className="mb-0 text-xs">Academic year</Label>
          <Select
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="h-8 w-32"
          >
            {(yearOptions.includes(year) ? yearOptions : [year, ...yearOptions]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          {needsYear ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              needs confirmation
            </span>
          ) : sourceLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              <Check className="h-3 w-3" /> detected {sourceLabel}
            </span>
          ) : null}
        </div>
      )}

      {sheet.notes && (
        <p className="border-b border-border/60 px-5 py-2 text-xs text-muted-foreground">💡 {sheet.notes}</p>
      )}

      {state.entity !== "skip" && (
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {FIELD_LABELS[field] ?? field.replace(/_/g, " ")}
                {field === "name" && state.entity === "students_fees" && (
                  <span className="text-rose-500"> *</span>
                )}
              </span>
              <Select
                value={state.mapping[field] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...state,
                    mapping: { ...state.mapping, [field]: e.target.value },
                  })
                }
                className="h-8 w-44"
              >
                <option value="">— none —</option>
                {sheet.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      )}

      {sheet.sample_rows.length > 0 && state.entity !== "skip" && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {sheet.columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-1.5 text-left font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.sample_rows.slice(0, 3).map((row, ri) => (
                <tr key={ri} className="border-t border-border/60">
                  {sheet.columns.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                      {row[c] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
