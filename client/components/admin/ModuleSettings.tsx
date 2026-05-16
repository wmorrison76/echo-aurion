/**
 * Module Settings (D8)
 *
 * Admin panel that fulfills the modular-architecture sales claim:
 * "any module can be turned off; competitor software plugs in via APIs."
 * The platform always had the storage (feature_flags) and a full
 * FeatureFlagService — what was missing was both an admin surface to
 * toggle modules and the consumer middleware that honors the flag.
 *
 * This panel renders one card per known module (server's
 * listKnownModules() is the source of truth) grouped by category, with
 * a switch to flip global state. Toggling calls
 * POST /api/modules/:name/toggle which writes a feature_flags row
 * "module:{name}" and invalidates the gate cache so subsequent route
 * hits return 503 immediately for disabled modules.
 *
 * The admin token is sent via x-admin-token header pulled from
 * localStorage("admin_token"); the page protects access at the route
 * layer and prompts for the token if absent. This is the same pattern
 * used by ModuleHealthDashboard's mutating actions.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import {
  ModuleStatus,
  invalidateModulesCache,
  useAllModules,
} from "@/lib/useModuleEnabled";

const CATEGORY_LABEL: Record<string, string> = {
  core: "Core",
  culinary: "Culinary",
  financial: "Financial",
  operations: "Operations",
  intelligence: "Intelligence",
  integrations: "Integrations",
};

function getAdminToken(): string {
  try {
    return localStorage.getItem("admin_token") || "";
  } catch {
    return "";
  }
}

async function toggleModule(name: string, enabled: boolean): Promise<void> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin token required");
  const res = await fetch(`/api/modules/${encodeURIComponent(name)}/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
    },
    body: JSON.stringify({ enabled, scope: "global" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Toggle failed: ${res.status}`);
  }
}

export default function ModuleSettings() {
  const { modules, loading, refresh } = useAllModules();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrompt, setTokenPrompt] = useState(!getAdminToken());

  // Group by category for display.
  const grouped = modules.reduce<Record<string, ModuleStatus[]>>((acc, m) => {
    (acc[m.category] ||= []).push(m);
    return acc;
  }, {});

  async function handleToggle(m: ModuleStatus, next: boolean) {
    setPending(m.name);
    setError(null);
    try {
      await toggleModule(m.name, next);
      invalidateModulesCache();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setPending(null);
    }
  }

  function saveToken(value: string) {
    try {
      if (value) localStorage.setItem("admin_token", value);
      setTokenPrompt(false);
    } catch {
      setError("Could not persist admin token");
    }
  }

  if (tokenPrompt) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Admin token required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Module Settings flips customer-visible modules on or off. Provide
            your <code>ADMIN_TOKEN</code> to continue. The token is stored in
            this browser only.
          </p>
          <input
            id="admin-token-input"
            type="password"
            placeholder="ADMIN_TOKEN"
            className="w-full rounded border px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveToken((e.target as HTMLInputElement).value);
              }
            }}
          />
          <Button
            onClick={() => {
              const el = document.getElementById(
                "admin-token-input",
              ) as HTMLInputElement | null;
              if (el?.value) saveToken(el.value);
            }}
          >
            Save token
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Module Settings</h2>
          <p className="text-sm text-muted-foreground">
            Turn modules on or off for this deployment. Disabled modules return
            503 to API callers and may be replaced by an external adapter
            (e.g. QuickBooks for EchoAurum, ADP for Schedule).
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {Object.keys(grouped)
        .sort()
        .map((category) => (
          <section key={category} className="space-y-2">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABEL[category] ?? category}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {grouped[category].map((m) => (
                <Card key={m.name} className={m.enabled ? "" : "opacity-70"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{m.label}</span>
                      <Badge variant={m.enabled ? "default" : "secondary"}>
                        {m.enabled ? "On" : "Off"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-start justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {m.description}
                    </p>
                    <Switch
                      checked={m.enabled}
                      disabled={pending === m.name}
                      onCheckedChange={(next) => handleToggle(m, next)}
                      aria-label={`Toggle ${m.label}`}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

      {!loading && modules.length === 0 && (
        <div className="rounded border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No modules registered.
        </div>
      )}
    </div>
  );
}
