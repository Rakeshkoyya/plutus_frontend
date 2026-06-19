"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Undo2, CheckCircle2, Plus, Percent } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatINR, formatDate, formatDateTime, cn } from "@/lib/utils";
import type { StudentFeeDetail, Transaction, Installment, Student } from "@/lib/types";
import { Badge, Button, Card, Input, Label, Select, PageLoader } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function StudentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { canWrite } = useAuth();
  const [tab, setTab] = useState<"installments" | "transactions">("installments");

  const detail = useQuery({
    queryKey: ["student-fee", id],
    queryFn: () => api.get<StudentFeeDetail>(`/api/student-fees/${id}`),
  });

  if (detail.isLoading) return <PageLoader />;
  if (detail.isError || !detail.data)
    return <p className="text-rose-600 dark:text-rose-400">Failed to load record.</p>;

  const d = detail.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{d.student_name}</h1>
              <Badge status={d.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {d.class_name ?? "—"}
              {d.category_name && ` · ${d.category_name}`} · Academic Year {d.academic_year}
            </p>
          </div>
          {canWrite && <DiscountButton detail={d} />}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total Fee" value={formatINR(d.total_fee)} />
          <Stat label="Discount" value={formatINR(d.discount)} />
          <Stat label="Net (year)" value={formatINR(d.net_fee)} />
          <Stat label="Prev. Dues" value={formatINR(d.opening_dues)} accent={Number(d.opening_dues) > 0 ? "rose" : undefined} />
          <Stat label="Total Payable" value={formatINR(d.total_payable)} accent="brand" />
          <Stat label="Balance" value={formatINR(d.balance)} accent={Number(d.balance) > 0 ? "rose" : "emerald"} />
        </div>
      </Card>

      <ContactCard studentId={d.student_id} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["installments", "transactions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "installments" ? (
        <InstallmentsTab detail={d} canWrite={canWrite} />
      ) : (
        <TransactionsTab id={id} />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "rose" | "emerald" }) {
  const color =
    accent === "brand"
      ? "text-primary"
      : accent === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : accent === "emerald"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-foreground";
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ContactCard({ studentId }: { studentId: string }) {
  const student = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => api.get<Student>(`/api/students/${studentId}`),
  });
  const s = student.data;
  if (!s) return null;
  const hasContacts = s.father_name || s.father_phone || s.mother_name || s.mother_phone || s.phone || s.admission_number;
  if (!hasContacts) return null;

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Student &amp; Guardian
      </h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {s.admission_number && <Field label="Admission / SR No." value={s.admission_number} />}
        {s.phone && <Field label="Primary Contact" value={s.phone} />}
        {s.father_name && <Field label="Father" value={s.father_name} />}
        {s.father_phone && <Field label="Father's Mobile" value={s.father_phone} />}
        {s.mother_name && <Field label="Mother" value={s.mother_name} />}
        {s.mother_phone && <Field label="Mother's Mobile" value={s.mother_phone} />}
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function InstallmentsTab({ detail, canWrite }: { detail: StudentFeeDetail; canWrite: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [payFor, setPayFor] = useState<Installment | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["student-fee", detail.id] });
    qc.invalidateQueries({ queryKey: ["transactions", detail.id] });
    qc.invalidateQueries({ queryKey: ["student-fees"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
    qc.invalidateQueries({ queryKey: ["overdue"] });
    qc.invalidateQueries({ queryKey: ["chart"] });
  };

  const act = useMutation({
    mutationFn: ({ path, body, method }: { path: string; body?: any; method?: "post" | "put" }) =>
      method === "put" ? api.put(path, body) : api.post(path, body),
    onSuccess: () => {
      invalidate();
      toast("Updated");
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Installment</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Paid</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {detail.installments.map((inst) => {
              const fullyPaid = inst.status === "paid";
              return (
                <tr key={inst.id} className="border-b border-border/60">
                  <td className="px-5 py-3 text-muted-foreground">{inst.label || `#${inst.installment_number}`}</td>
                  <td className="px-5 py-3">
                    {canWrite ? (
                      <Input
                        type="date"
                        className="h-8 w-40"
                        defaultValue={inst.due_date ?? ""}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== inst.due_date)
                            act.mutate({ path: `/api/installments/${inst.id}`, body: { due_date: e.target.value }, method: "put" });
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground">{formatDate(inst.due_date)}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">{formatINR(inst.amount)}</td>
                  <td className="px-5 py-3 text-emerald-600 dark:text-emerald-400">{formatINR(inst.paid_amount)}</td>
                  <td className="px-5 py-3">
                    <Badge status={inst.status} />
                  </td>
                  <td className="px-5 py-3">
                    {canWrite && (
                      <div className="flex justify-end gap-1.5">
                        {!fullyPaid && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => act.mutate({ path: `/api/installments/${inst.id}/mark-paid` })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setPayFor(inst)}>
                              <Plus className="h-3.5 w-3.5" /> Payment
                            </Button>
                          </>
                        )}
                        {Number(inst.paid_amount) > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => act.mutate({ path: `/api/installments/${inst.id}/undo` })}
                            title="Undo last payment"
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Undo
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {payFor && (
        <PaymentDialog
          installment={payFor}
          onClose={() => setPayFor(null)}
          onDone={() => {
            invalidate();
            setPayFor(null);
          }}
        />
      )}
    </Card>
  );
}

function PaymentDialog({
  installment,
  onClose,
  onDone,
}: {
  installment: Installment;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const remaining = Number(installment.amount) - Number(installment.paid_amount);
  const [amount, setAmount] = useState(remaining);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState("cash");
  const [receipt, setReceipt] = useState("");
  const [note, setNote] = useState("");

  const pay = useMutation({
    mutationFn: () =>
      api.post(`/api/installments/${installment.id}/pay`, {
        amount: String(amount),
        date,
        mode,
        receipt_number: receipt || null,
        note: note || null,
      }),
    onSuccess: () => {
      toast("Payment recorded");
      onDone();
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  return (
    <Dialog open onClose={onClose} title={`Add Payment · Installment #${installment.installment_number}`}>
      <div className="space-y-3">
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Remaining balance: <span className="font-semibold text-foreground">{formatINR(remaining)}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount</Label>
            <Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mode</Label>
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </Select>
          </div>
          <div>
            <Label>Receipt No.</Label>
            <Input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="e.g. FR-/2025-26/151" />
          </div>
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. partial payment" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => pay.mutate()} disabled={pay.isPending || amount <= 0 || amount > remaining}>
            {pay.isPending ? "Saving…" : "Record Payment"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DiscountButton({ detail }: { detail: StudentFeeDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [discount, setDiscount] = useState(Number(detail.discount));

  const save = useMutation({
    mutationFn: () => api.put(`/api/student-fees/${detail.id}`, { discount: String(discount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-fee", detail.id] });
      qc.invalidateQueries({ queryKey: ["student-fees"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      toast("Discount updated");
      setOpen(false);
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Percent className="h-3.5 w-3.5" /> Edit Discount
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Edit Discount">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Discount is applied at the fee level. Unpaid installments are re-scaled proportionally.
            </p>
            <div>
              <Label>Discount Amount (₹)</Label>
              <Input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <p className="text-sm text-muted-foreground">
              New net payable:{" "}
              <span className="font-semibold text-foreground">{formatINR(Number(detail.total_fee) - discount)}</span>
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

const TYPE_STYLES: Record<string, string> = {
  payment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  undo: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  discount: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  installment_edit: "bg-muted text-muted-foreground",
};

function TransactionsTab({ id }: { id: string }) {
  const txns = useQuery({
    queryKey: ["transactions", id],
    queryFn: () => api.get<Transaction[]>(`/api/student-fees/${id}/transactions`),
  });

  if (txns.isLoading) return <PageLoader />;

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Timestamp</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Mode</th>
              <th className="px-5 py-3 font-medium">Receipt</th>
              <th className="px-5 py-3 font-medium">Note</th>
              <th className="px-5 py-3 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {txns.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            )}
            {txns.data?.map((t) => (
              <tr key={t.id} className="border-b border-border/60">
                <td className="px-5 py-3 text-muted-foreground">{formatDateTime(t.created_at)}</td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      TYPE_STYLES[t.type] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.type.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-foreground">{formatINR(t.amount)}</td>
                <td className="px-5 py-3 capitalize text-muted-foreground">{t.mode ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{t.receipt_number ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{t.note ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{t.created_by_name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
