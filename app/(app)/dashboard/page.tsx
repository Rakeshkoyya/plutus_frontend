"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Wallet,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useYear } from "@/lib/year";
import { formatINR, formatDate } from "@/lib/utils";
import type { DashboardSummary, OverdueStudent, ChartData } from "@/lib/types";
import { Card, PageLoader } from "@/components/ui/primitives";

export default function DashboardPage() {
  const { year } = useYear();

  const summary = useQuery({
    queryKey: ["summary", year],
    queryFn: () => api.get<DashboardSummary>(`/api/dashboard/summary?academic_year=${year}`),
  });
  const chart = useQuery({
    queryKey: ["chart", year],
    queryFn: () => api.get<ChartData>(`/api/dashboard/chart-data?academic_year=${year}`),
  });
  const overdue = useQuery({
    queryKey: ["overdue", year],
    queryFn: () =>
      api.get<OverdueStudent[]>(`/api/dashboard/overdue-students?academic_year=${year}`),
  });

  if (summary.isLoading) return <PageLoader />;

  const s = summary.data!;
  const c = chart.data ?? { collected: "0", pending: "0", overdue: "0" };
  const pieData = [
    { name: "Collected", value: Number(c.collected), color: "#10b981" },
    { name: "Pending", value: Number(c.pending), color: "#f59e0b" },
    { name: "Overdue", value: Number(c.overdue), color: "#f43f5e" },
  ];
  const totalPie = pieData.reduce((a, b) => a + b.value, 0);
  const collectionRate = Number(s.total_fee) > 0
    ? Math.round((Number(s.collected_fee) / Number(s.total_fee)) * 100)
    : 0;

  const cards = [
    {
      label: "Total Fee",
      value: formatINR(s.total_fee),
      icon: Wallet,
      tint: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
    },
    {
      label: "Collected",
      value: formatINR(s.collected_fee),
      sub: `${collectionRate}% of total`,
      icon: TrendingUp,
      tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending Installments",
      value: String(s.pending_installments),
      icon: Clock,
      tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Overdue Amount",
      value: formatINR(s.overdue_amount),
      icon: AlertTriangle,
      tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Financial health for {year}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5 transition-shadow hover:shadow-pop">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tint}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground">
              {card.label}
              {card.sub && <span className="ml-1 text-emerald-600 dark:text-emerald-400">· {card.sub}</span>}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-semibold text-foreground">Collection Breakdown</h2>
          {totalPie === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No fee data yet
            </div>
          ) : (
            <>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        color: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      formatter={(value: number) =>
                        `${formatINR(value)} (${((value / totalPie) * 100).toFixed(1)}%)`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{collectionRate}%</span>
                  <span className="text-xs text-muted-foreground">collected</span>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium text-foreground">{formatINR(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Overdue students */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="font-semibold text-foreground">Overdue Students</h2>
            <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              {overdue.data?.length ?? 0} flagged
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Overdue</th>
                  <th className="px-5 py-3 font-medium">Since</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {overdue.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {overdue.data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                      🎉 No overdue students for {year}
                    </td>
                  </tr>
                )}
                {overdue.data?.map((o) => (
                  <tr key={o.student_fee_id} className="border-b border-border/60 transition-colors hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium text-foreground">{o.student_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.class_name ?? "—"}</td>
                    <td className="px-5 py-3 font-semibold text-rose-600 dark:text-rose-400">
                      {formatINR(o.overdue_amount)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(o.earliest_due_date)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/students/${o.student_fee_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
