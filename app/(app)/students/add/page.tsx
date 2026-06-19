"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useYear } from "@/lib/year";
import { formatINR, cn } from "@/lib/utils";
import type { FeeStructure, Student, StudentCategory } from "@/lib/types";
import { Button, Card, Input, Label, Select, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

interface Row {
  installment_number: number;
  label: string | null;
  amount: string;
  due_date: string | null;
}

export default function AddStudentPage() {
  const { year } = useYear();
  const router = useRouter();
  const toast = useToast();

  // Student details
  const [nName, setNName] = useState("");
  const [nAdmission, setNAdmission] = useState("");
  const [nClass, setNClass] = useState("Class 1");
  const [nSection, setNSection] = useState("");
  const [nCategory, setNCategory] = useState("");
  const [nFather, setNFather] = useState("");
  const [nFatherPhone, setNFatherPhone] = useState("");
  const [nMother, setNMother] = useState("");
  const [nMotherPhone, setNMotherPhone] = useState("");
  const [nPhone, setNPhone] = useState("");

  // Fee configuration
  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [total, setTotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [openingDues, setOpeningDues] = useState(0);
  const [useCustom, setUseCustom] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [payNow, setPayNow] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState("cash");
  const [payReceipt, setPayReceipt] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<StudentCategory[]>("/api/categories"),
  });

  const net = Math.max(total - discount, 0);
  const totalPayable = net + Math.max(openingDues, 0);

  // Pull the fee structure for the chosen class so we can prefill amounts.
  const structures = useQuery({
    queryKey: ["fs-for-class", nClass, year],
    queryFn: () =>
      api.get<FeeStructure[]>(
        `/api/fee-structures?academic_year=${year}&class_name=${encodeURIComponent(nClass)}`,
      ),
    enabled: !!nClass,
  });

  useEffect(() => {
    const list = structures.data;
    if (!list) return;
    if (list.length === 0) {
      setFeeStructure(null);
      return;
    }
    // Pick the structure for the chosen category; fall back to one that applies
    // to all categories (no category set), then to whatever exists.
    const byCategory = nCategory ? list.find((x) => x.category_id === nCategory) : undefined;
    const general = list.find((x) => !x.category_id);
    const fs = byCategory ?? general ?? list[0];
    setFeeStructure(fs);
    setTotal(Number(fs.total_amount));
  }, [structures.data, nCategory]);

  const defaultSchedule: Row[] = useMemo(() => {
    if (feeStructure && feeStructure.templates.length > 0) {
      const gross = feeStructure.templates.reduce((a, t) => a + Number(t.amount), 0) || 1;
      let acc = 0;
      return feeStructure.templates.map((t, i, arr) => {
        let amt = Math.round((Number(t.amount) * net) / gross);
        if (i === arr.length - 1) amt = net - acc;
        acc += amt;
        return { installment_number: t.installment_number, label: t.label ?? null, amount: String(amt), due_date: t.due_date };
      });
    }
    return [{ installment_number: 1, label: null, amount: String(net), due_date: null }];
  }, [feeStructure, net]);

  useEffect(() => {
    if (useCustom && rows.length === 0) setRows(defaultSchedule.map((r) => ({ ...r })));
  }, [useCustom, defaultSchedule, rows.length]);

  const customSum = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const scheduleValid = !useCustom || customSum === net;

  async function submit() {
    if (!nName.trim()) {
      toast("Student name is required", "error");
      return;
    }
    setSaving(true);
    try {
      // Create the student, then enroll them for the selected year.
      const student = await api.post<Student>("/api/students", {
        name: nName.trim(),
        admission_number: nAdmission || null,
        class_name: nClass,
        section: nSection || null,
        category_id: nCategory || null,
        father_name: nFather || null,
        father_phone: nFatherPhone || null,
        mother_name: nMother || null,
        mother_phone: nMotherPhone || null,
        phone: nPhone || null,
      });

      const payload: any = {
        student_id: student.id,
        fee_structure_id: feeStructure?.id ?? null,
        academic_year: year,
        total_fee: String(total),
        discount: String(discount),
        opening_dues: String(Math.max(openingDues, 0)),
        use_custom_schedule: useCustom,
        installments: useCustom
          ? rows.map((r) => ({
              installment_number: r.installment_number,
              label: r.label ?? null,
              amount: String(r.amount || 0),
              due_date: r.due_date || null,
            }))
          : [],
      };
      if (payNow && payAmount > 0) {
        payload.first_payment = {
          amount: String(payAmount),
          date: payDate,
          mode: payMode,
          receipt_number: payReceipt || null,
          installment_number: 1,
        };
      }
      const res = await api.post<{ id: string }>("/api/student-fees", payload);
      toast("Student enrolled successfully");
      router.push(`/students/${res.id}`);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Enroll Student</h1>
        <p className="text-sm text-muted-foreground">Add a student to the fee system for {year}</p>
      </div>

      {/* Step 1 — Student details */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            1
          </span>
          <h2 className="font-semibold text-foreground">Student Details</h2>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Full name" autoFocus />
            </div>
            <div>
              <Label>Admission / SR No.</Label>
              <Input value={nAdmission} onChange={(e) => setNAdmission(e.target.value)} placeholder="e.g. 25/93" />
            </div>
            <div>
              <Label>Class</Label>
              <Select value={nClass} onChange={(e) => setNClass(e.target.value)}>
                {CLASSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Input value={nSection} onChange={(e) => setNSection(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={nCategory} onChange={(e) => setNCategory(e.target.value)}>
                <option value="">— None —</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Primary Contact No.</Label>
              <Input value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="Mobile" />
            </div>
            <div>
              <Label>Father&apos;s Name</Label>
              <Input value={nFather} onChange={(e) => setNFather(e.target.value)} />
            </div>
            <div>
              <Label>Father&apos;s Mobile</Label>
              <Input value={nFatherPhone} onChange={(e) => setNFatherPhone(e.target.value)} />
            </div>
            <div>
              <Label>Mother&apos;s Name</Label>
              <Input value={nMother} onChange={(e) => setNMother(e.target.value)} />
            </div>
            <div>
              <Label>Mother&apos;s Mobile</Label>
              <Input value={nMotherPhone} onChange={(e) => setNMotherPhone(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage the category list in Settings → Student Categories.
          </p>
        </div>
      </Card>

      {/* Step 2 — Fee configuration */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            2
          </span>
          <h2 className="font-semibold text-foreground">Fee Configuration</h2>
        </div>

        {structures.isLoading ? (
          <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Looking up fee structure…
          </p>
        ) : feeStructure ? (
          <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">
            ✓ Found fee structure for {nClass}
            {feeStructure.category_name ? ` · ${feeStructure.category_name}` : ""}:{" "}
            {formatINR(feeStructure.total_amount)} · {feeStructure.num_installments} installments
          </p>
        ) : (
          <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
            No fee structure for {nClass} ({year}). You can still set fees manually below.
          </p>
        )}

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Total Fee</Label>
              <Input
                type="number"
                className="h-9 w-44 text-right"
                value={total || ""}
                onChange={(e) => setTotal(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="mb-0">Discount</Label>
              <Input
                type="number"
                className="h-9 w-44 text-right"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="mb-0">Previous Year Dues</Label>
              <Input
                type="number"
                className="h-9 w-44 text-right"
                value={openingDues || ""}
                onChange={(e) => setOpeningDues(Number(e.target.value))}
                placeholder="Arrears"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="font-medium text-muted-foreground">Net (this year)</span>
              <span className="font-semibold text-foreground">{formatINR(net)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total Payable</span>
              <span className="text-lg font-bold text-primary">{formatINR(totalPayable)}</span>
            </div>
            {openingDues > 0 && (
              <p className="text-xs text-muted-foreground">
                Installments below cover this year&apos;s net fee. Arrears of {formatINR(openingDues)} are
                added to the outstanding balance.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Label>Installment Schedule</Label>
          <div className="flex gap-4 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input type="radio" checked={!useCustom} onChange={() => setUseCustom(false)} />
              Use default schedule
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={useCustom}
                onChange={() => {
                  setUseCustom(true);
                  setRows(defaultSchedule.map((r) => ({ ...r })));
                }}
              />
              Custom schedule
            </label>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Due Date</th>
                  <th className="px-3 py-2 text-left font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(useCustom ? rows : defaultSchedule).map((r, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{r.label || r.installment_number}</td>
                    <td className="px-3 py-2">
                      {useCustom ? (
                        <Input
                          type="date"
                          className="h-8"
                          value={r.due_date ?? ""}
                          onChange={(e) =>
                            setRows((p) => p.map((x, i) => (i === idx ? { ...x, due_date: e.target.value } : x)))
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">{r.due_date ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {useCustom ? (
                        <Input
                          type="number"
                          className="h-8 w-32"
                          value={r.amount}
                          onChange={(e) =>
                            setRows((p) => p.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)))
                          }
                        />
                      ) : (
                        <span className="font-medium text-foreground">{formatINR(r.amount)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {useCustom && (
            <div className="mt-2 flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setRows((p) => [...p, { installment_number: p.length + 1, label: null, amount: "0", due_date: null }])
                }
              >
                + Add installment
              </Button>
              <span className={cn("text-sm", scheduleValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                Sum {formatINR(customSum)} {scheduleValid ? "✓" : `(needs ${formatINR(net)})`}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-border p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} />
            Record first payment now
          </label>
          {payNow && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label>Amount Paid</Label>
                <Input type="number" value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <div>
                <Label>Mode</Label>
                <Select value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </Select>
              </div>
              <div>
                <Label>Receipt No.</Label>
                <Input value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} placeholder="e.g. FR-/2025-26/151" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Link href="/students">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={submit} disabled={saving || net <= 0 || !scheduleValid}>
            {saving ? "Saving…" : "Enroll Student"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
