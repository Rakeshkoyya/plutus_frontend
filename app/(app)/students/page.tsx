"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useYear } from "@/lib/year";
import { formatINR } from "@/lib/utils";
import type { StudentFeeListItem, StudentCategory } from "@/lib/types";
import { Badge, Button, Card, Input, Select, PageLoader } from "@/components/ui/primitives";

const CLASSES = ["", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const STATUSES = ["", "paid", "partial", "pending", "overdue"];

export default function StudentsPage() {
  const { year } = useYear();
  const { canWrite } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cls, setCls] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const list = useQuery({
    queryKey: ["student-fees", year],
    queryFn: () => api.get<StudentFeeListItem[]>(`/api/student-fees?academic_year=${year}`),
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<StudentCategory[]>("/api/categories"),
  });

  const filtered = (list.data ?? []).filter((r) => {
    if (cls && r.class_name !== cls) return false;
    if (status && r.status !== status) return false;
    if (category && r.category_name !== category) return false;
    if (search && !r.student_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">Enrolled fee records for {year}</p>
        </div>
        {canWrite && (
          <Link href="/students/add">
            <Button>
              <Plus className="h-4 w-4" /> Enroll Student
            </Button>
          </Link>
        )}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by student name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={cls} onChange={(e) => setCls(e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c || "All classes"}
              </option>
            ))}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s[0].toUpperCase() + s.slice(1) : "All statuses"}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {list.isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {list.data?.length === 0
              ? `No students enrolled for ${year}.`
              : "No students match your filters."}
          </p>
          {canWrite && list.data?.length === 0 && (
            <div className="flex gap-2">
              <Link href="/students/add">
                <Button variant="outline">
                  <Plus className="h-4 w-4" /> Enroll a student
                </Button>
              </Link>
              <Link href="/import">
                <Button variant="ghost">Import from xlsx</Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Discount</th>
                  <th className="px-5 py-3 font-medium">Net</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 font-medium">Pending</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/students/${r.id}`)}
                    className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">{r.student_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.class_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.category_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatINR(r.total_fee)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatINR(r.discount)}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{formatINR(r.net_fee)}</td>
                    <td className="px-5 py-3 text-emerald-600 dark:text-emerald-400">{formatINR(r.paid)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatINR(r.pending)}</td>
                    <td className="px-5 py-3">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
