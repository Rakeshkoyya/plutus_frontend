"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Eye, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useYear } from "@/lib/year";
import { formatINR, cn } from "@/lib/utils";
import type { FeeStructure, InstallmentTemplate, StudentCategory } from "@/lib/types";
import { Button, Card, Input, Label, Select, PageLoader } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

export default function FeeStructurePage() {
  const { year } = useYear();
  const { canWrite } = useAuth();
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [open, setOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  const list = useQuery({
    queryKey: ["fee-structures", year],
    queryFn: () => api.get<FeeStructure[]>(`/api/fee-structures?academic_year=${year}`),
  });

  const openNew = () => {
    setEditing(null);
    setViewOnly(false);
    setOpen(true);
  };
  const openEdit = (fs: FeeStructure, ro: boolean) => {
    setEditing(fs);
    setViewOnly(ro);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fee Structure</h1>
          <p className="text-sm text-muted-foreground">Per-class fee templates for {year}</p>
        </div>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New Structure
          </Button>
        )}
      </div>

      {list.isLoading ? (
        <PageLoader />
      ) : list.data?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Receipt className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No fee structures for {year} yet.</p>
          {canWrite && (
            <Button onClick={openNew} variant="outline">
              <Plus className="h-4 w-4" /> Create the first one
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Academic Year</th>
                  <th className="px-5 py-3 font-medium">Total Fee</th>
                  <th className="px-5 py-3 font-medium">Installments</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.map((fs) => (
                  <tr key={fs.id} className="border-b border-border/60 transition-colors hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium text-foreground">{fs.class_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fs.category_name ?? "All"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fs.academic_year}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">
                      {formatINR(fs.total_amount)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{fs.num_installments}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(fs, true)}>
                          <Eye className="h-4 w-4" /> View
                        </Button>
                        {canWrite && (
                          <Button size="sm" variant="outline" onClick={() => openEdit(fs, false)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {open && (
        <FeeStructureDialog
          existing={editing}
          viewOnly={viewOnly}
          defaultYear={year}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function FeeStructureDialog({
  existing,
  viewOnly,
  defaultYear,
  onClose,
}: {
  existing: FeeStructure | null;
  viewOnly: boolean;
  defaultYear: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [className, setClassName] = useState(existing?.class_name ?? "Class 1");
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "");
  const [academicYear, setAcademicYear] = useState(existing?.academic_year ?? defaultYear);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<StudentCategory[]>("/api/categories"),
  });
  const [total, setTotal] = useState(existing ? Number(existing.total_amount) : 0);
  const [count, setCount] = useState(existing?.num_installments ?? 3);
  const [rows, setRows] = useState<InstallmentTemplate[]>(
    existing?.templates.map((t) => ({ ...t })) ?? defaultRows(3),
  );

  function defaultRows(n: number, totalAmt = 0): InstallmentTemplate[] {
    const base = totalAmt ? Math.floor(totalAmt / n) : 0;
    return Array.from({ length: n }, (_, i) => ({
      installment_number: i + 1,
      label: null,
      amount: String(i === n - 1 ? totalAmt - base * (n - 1) : base),
      due_date: null,
    }));
  }

  const applyCount = (n: number) => {
    setCount(n);
    setRows((prev) => {
      const next = defaultRows(n, total);
      for (let i = 0; i < Math.min(n, prev.length); i++)
        next[i] = { ...next[i], ...prev[i], installment_number: i + 1 };
      return next;
    });
  };

  const sum = useMemo(() => rows.reduce((a, r) => a + (Number(r.amount) || 0), 0), [rows]);
  const diff = total - sum;

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        class_name: className,
        category_id: categoryId || null,
        academic_year: academicYear,
        total_amount: String(total),
        num_installments: count,
        installments: rows.map((r) => ({
          installment_number: r.installment_number,
          label: r.label ?? null,
          amount: String(r.amount || 0),
          due_date: r.due_date || null,
        })),
      };
      return existing
        ? api.put(`/api/fee-structures/${existing.id}`, payload)
        : api.post(`/api/fee-structures`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-structures"] });
      toast(existing ? "Fee structure updated" : "Fee structure created");
      onClose();
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const disabled = viewOnly;

  return (
    <Dialog
      open
      onClose={onClose}
      title={viewOnly ? "Fee Structure" : existing ? "Edit Fee Structure" : "New Fee Structure"}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Class</Label>
            <Select value={className} onChange={(e) => setClassName(e.target.value)} disabled={disabled}>
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={disabled}>
              <option value="">All categories</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Academic Year</Label>
            <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} disabled={disabled} />
          </div>
          <div>
            <Label>Total Fee (₹)</Label>
            <Input
              type="number"
              value={total || ""}
              onChange={(e) => setTotal(Number(e.target.value))}
              disabled={disabled}
            />
          </div>
          <div>
            <Label>No. of Installments</Label>
            <Select value={count} onChange={(e) => applyCount(Number(e.target.value))} disabled={disabled}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>Installment Schedule</Label>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Period</th>
                  <th className="px-3 py-2 text-left font-medium">Due Date</th>
                  <th className="px-3 py-2 text-left font-medium">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{r.installment_number}</td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8"
                        placeholder={`e.g. ${["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"][idx] ?? "Term"}`}
                        value={r.label ?? ""}
                        onChange={(e) =>
                          setRows((p) => p.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                        }
                        disabled={disabled}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        className="h-8"
                        value={r.due_date ?? ""}
                        onChange={(e) =>
                          setRows((p) =>
                            p.map((x, i) => (i === idx ? { ...x, due_date: e.target.value } : x)),
                          )
                        }
                        disabled={disabled}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        className="h-8"
                        value={r.amount}
                        onChange={(e) =>
                          setRows((p) =>
                            p.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)),
                          )
                        }
                        disabled={disabled}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className={cn(
              "mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm",
              diff === 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            <span>Sum of installments: {formatINR(sum)}</span>
            <span>{diff === 0 ? "✓ Matches total" : `Difference: ${formatINR(diff)}`}</span>
          </div>
        </div>

        {!viewOnly && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={diff !== 0 || save.isPending || total <= 0}>
              {save.isPending ? "Saving…" : existing ? "Save changes" : "Create"}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
