"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sun, Moon, Monitor, ShieldCheck, Sparkles, Building2, Mail, BadgeCheck, Tags, Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useYear } from "@/lib/year";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { AuthConfig, StudentCategory } from "@/lib/types";
import { Button, Card, Input, Label, Select, Spinner, PageLoader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { year, setYear, years } = useYear();
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    api.get<AuthConfig>("/api/auth/config").then(setConfig).catch(() => {});
  }, []);

  if (!user) return <PageLoader />;

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Account */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-semibold text-white">
            {(user.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={BadgeCheck} label="Role" value={user.role} capitalize />
          <InfoRow icon={Mail} label="Sign-in method" value={user.auth_provider} capitalize />
          <InfoRow icon={Building2} label="Workspace" value={user.workspace_id.slice(0, 8) + "…"} />
          <InfoRow icon={ShieldCheck} label="Username" value={user.username || "—"} />
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Appearance
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Choose how the app looks.</p>
        <div className="grid max-w-md grid-cols-3 gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all",
                theme === opt.value
                  ? "border-primary bg-accent text-accent-foreground ring-2 ring-ring/30"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <opt.icon className="h-5 w-5" />
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Student categories */}
      <CategoriesCard />

      {/* Preferences */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Preferences
        </h2>
        <div className="max-w-xs">
          <Label>Default academic year</Label>
          <Select value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Controls which year the dashboard and lists show.
          </p>
        </div>
      </Card>

      {/* Integrations */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Integrations
        </h2>
        <div className="space-y-3">
          <IntegrationRow
            icon={Sparkles}
            label="AI Excel import (OpenRouter)"
            enabled={!!config?.ai_enabled}
            hint="Set OPENROUTER_API_KEY in the backend .env to enable"
          />
          <IntegrationRow
            icon={ShieldCheck}
            label="Google sign-in"
            enabled={!!config?.google_enabled}
            hint="Set GOOGLE_CLIENT_ID / SECRET in the backend .env to enable"
          />
        </div>
      </Card>
    </div>
  );
}

function CategoriesCard() {
  const { canWrite } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const list = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<StudentCategory[]>("/api/categories"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: (name: string) => api.post("/api/categories", { name }),
    onSuccess: () => {
      invalidate();
      setNewName("");
      toast("Category added");
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.put(`/api/categories/${id}`, { name }),
    onSuccess: () => {
      invalidate();
      setEditId(null);
      toast("Category renamed");
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del<{ deleted: boolean; deactivated: boolean; student_count: number }>(`/api/categories/${id}`),
    onSuccess: (res) => {
      invalidate();
      toast(res.deactivated ? `Category hidden (still used by ${res.student_count} students)` : "Category removed");
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <Tags className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Student Categories
        </h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Groups like Day Scholar or Hosteller. Fees can be set per category. Add or remove the ones your school uses.
      </p>

      {list.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {list.data?.length === 0 && (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              No categories yet. Add your first one below.
            </p>
          )}
          {list.data?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              {editId === c.id ? (
                <>
                  <Input
                    className="h-8"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editName.trim()) rename.mutate({ id: c.id, name: editName.trim() });
                      if (e.key === "Escape") setEditId(null);
                    }}
                  />
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => editName.trim() && rename.mutate({ id: c.id, name: editName.trim() })}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.student_count} {c.student_count === 1 ? "student" : "students"}
                    </span>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditId(c.id);
                          setEditName(c.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Remove category "${c.name}"?`)) remove.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {canWrite && (
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="New category name (e.g. EWS)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) create.mutate(newName.trim());
            }}
          />
          <Button onClick={() => newName.trim() && create.mutate(newName.trim())} disabled={create.isPending || !newName.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      )}
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-medium text-foreground", capitalize && "capitalize")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function IntegrationRow({
  icon: Icon,
  label,
  enabled,
  hint,
}: {
  icon: typeof Mail;
  label: string;
  enabled: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {!enabled && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-medium",
          enabled
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {enabled ? "Enabled" : "Off"}
      </span>
    </div>
  );
}
