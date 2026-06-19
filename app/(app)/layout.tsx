"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { YearProvider } from "@/lib/year";
import { AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { AuthConfig } from "@/lib/types";

function Guarded({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [defaultYear, setDefaultYear] = useState("2026-27");

  useEffect(() => {
    api
      .get<AuthConfig>("/api/auth/config")
      .then((c) => setDefaultYear(c.default_academic_year))
      .catch(() => {});
  }, []);

  if (loading) return <PageLoader />;
  if (!user) return <PageLoader />;

  return (
    <YearProvider defaultYear={defaultYear}>
      <AppShell>{children}</AppShell>
    </YearProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Guarded>{children}</Guarded>
    </AuthProvider>
  );
}
