"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Receipt,
  Wallet,
  Sparkles,
  ShieldCheck,
  Users,
  BarChart3,
  Check,
} from "lucide-react";
import { getToken } from "@/lib/api";
import { BrandMark } from "@/components/brand";

const FEATURES = [
  {
    icon: Receipt,
    title: "Fee structures",
    body: "Per-class, per-category templates with installment schedules that validate to the rupee.",
  },
  {
    icon: Wallet,
    title: "Payments & installments",
    body: "Record payments, mark installments paid, undo mistakes — balances recompute instantly.",
  },
  {
    icon: Sparkles,
    title: "AI spreadsheet import",
    body: "Drop in your existing .xlsx register; Plutus maps the columns and brings your data in.",
  },
  {
    icon: ShieldCheck,
    title: "Append-only audit trail",
    body: "Every payment, discount and edit is logged. Nothing is ever silently changed.",
  },
  {
    icon: Users,
    title: "Isolated workspaces",
    body: "Each account gets its own workspace. Your students and ledgers are yours alone.",
  },
  {
    icon: BarChart3,
    title: "Live dashboards",
    body: "Collection rate, pending and overdue at a glance, for any academic year.",
  },
];

export default function LandingPage() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(!!getToken()), []);

  const ctaHref = authed ? "/dashboard" : "/login";
  const ctaLabel = authed ? "Go to dashboard" : "Sign in";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* decorative gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -right-40 top-40 h-[28rem] w-[28rem] rounded-full bg-brand-700/20 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 lg:px-8">
        {/* Header */}
        <header className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight text-foreground">Plutus</span>
          </div>
          <Link
            href={ctaHref}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {ctaLabel}
          </Link>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-3xl py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Named for the Greek god of wealth
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Collect every fee.
            <br className="hidden sm:block" /> Account for every rupee.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Plutus brings your students, fee structures, installments and payments into one
            calm, fully-auditable workspace — so nothing slips through the cracks.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={ctaHref}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-pop transition-colors hover:bg-primary-hover sm:w-auto"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              Explore features
            </a>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="pb-20">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-pop"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="pb-24">
          <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-center shadow-pop sm:p-12">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to put your fee register in order?
            </h2>
            <ul className="mx-auto mt-5 flex max-w-xl flex-col gap-2 text-sm text-white/90 sm:flex-row sm:justify-center sm:gap-6">
              {["No spreadsheets to wrangle", "Import what you already have", "Audit-ready by default"].map(
                (item) => (
                  <li key={item} className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ),
              )}
            </ul>
            <Link
              href={ctaHref}
              className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-brand-700 transition-transform hover:scale-[1.02]"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <BrandMark className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
            <span>Plutus · School Fee Management</span>
          </div>
          <p>Plutus — named after the Greek god of wealth · {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}
