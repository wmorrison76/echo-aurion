/**
 * iter209 · Code-split from EchoEventsPanel.tsx (audit recommendation FE-1).
 *
 * CRM tab content — groups the large CRM surface area into one file:
 *   - EchoEventsCrmView (tabs shell: Clients / Import / Forecast / Lifecycle Audit)
 *   - MlForecastMeta   (iter205)
 *   - LifecycleAuditView (iter207 P2)
 *   - CrmContactsTable
 *   - StatCard (shared locally)
 *
 * Re-exported through a single default for React.lazy loading.
 */
import React from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/glass";
import { get, post, put, del } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ClientImportWizard from "@/modules/ClientImport/client/pages/ClientImportWizard";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import CrmDetailPanel from "../components/dashboard/CrmDetailPanel";

export type CrmMetrics = {
  clientsCount: number;
  vipClientsCount: number;
  prospectsCount: number;
  openProspectsCount: number;
  rush72hCount: number;
  pipeline30d: number;
  weighted30d: number;
  pipeline18: number;
  weighted18: number;
};

export type CrmForecastMonth = {
  month: string;
  pipeline: number;
  weighted: number;
  goal: number;
  gap: number;
  byStage: Record<string, number>;
};

export type EchoEventsCrmViewProps = {
  crmLoading: boolean;
  crmMetrics: CrmMetrics | null;
  crmForecast: CrmForecastMonth[];
  onRefresh: () => Promise<void>;
  detailPanel?: string | null;
  onCloseDetail?: () => void;
};

export default function EchoEventsCrmView({
  crmLoading,
  crmMetrics,
  crmForecast,
  onRefresh,
  detailPanel,
  onCloseDetail,
}: EchoEventsCrmViewProps) {
  return (
    <div className="space-y-4">
      {detailPanel ? <CrmDetailPanel panel={detailPanel} onClose={onCloseDetail} /> : null}

      <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">CRM</div>
          <div className="text-xs text-foreground/60">Clients, import, and forecasting.</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void onRefresh()} disabled={crmLoading}>
          {crmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" /> Import
          </TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="lifecycle" data-testid="crm-tab-lifecycle">Lifecycle Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <CrmContactsTable />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Client Import</CardTitle>
              <CardDescription>
                CSV/Excel import with mapping, validation, dedupe, and session tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[calc(100vh-240px)] min-h-[560px]">
                <ClientImportWizard />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Forecast</CardTitle>
              <CardDescription>
                12‑month view · iter205 ML model (stage-weighted + exponential smoothing).
                Configure goals in EchoEventStudio → Forecast.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MlForecastMeta />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <StatCard label="Clients" value={String(crmMetrics?.clientsCount ?? 0)} />
                <StatCard label="Open prospects" value={String(crmMetrics?.openProspectsCount ?? 0)} />
                <StatCard label="Pipeline (18mo)" value={`$${Math.round(crmMetrics?.pipeline18 || 0).toLocaleString()}`} />
                <StatCard label="Weighted (18mo)" value={`$${Math.round(crmMetrics?.weighted18 || 0).toLocaleString()}`} />
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={crmForecast.map((m) => ({
                      month: String(m.month || "").slice(0, 7),
                      pipeline: Math.round(m.pipeline || 0),
                      weighted: Math.round(m.weighted || 0),
                      goal: Math.round(m.goal || 0),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="pipeline" stroke="#3b82f6" name="Pipeline" />
                    <Line type="monotone" dataKey="weighted" stroke="#10b981" name="Weighted" />
                    <Line type="monotone" dataKey="goal" stroke="#f59e0b" name="Goal" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-4" data-testid="crm-lifecycle-audit">
          <LifecycleAuditView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// iter205 · ML forecast meta — stage-probability matrix + trailing 6mo realized
// ───────────────────────────────────────────────────────────────────────────
function MlForecastMeta() {
  const [meta, setMeta] = React.useState<any>(null);
  React.useEffect(() => {
    get<any>("/api/crm/forecast/ml-meta")
      .then((j) => setMeta(j?.data || null))
      .catch(() => {});
  }, []);
  if (!meta) return null;
  const probs: Record<string, number> = meta.stage_probabilities || {};
  const realized: Array<{ month: string; realized: number }> = meta.trailing_6mo_realized || [];
  const realizedTotal = realized.reduce((s, r) => s + (r.realized || 0), 0);
  return (
    <div data-testid="ml-forecast-meta" className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Model</div>
        <div className="text-sm font-mono">{meta.model || "—"}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          window {meta.window_months}mo · trailing realized ${Math.round(realizedTotal).toLocaleString()}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Stage probabilities</div>
        <div className="flex flex-wrap gap-1" data-testid="stage-prob-chips">
          {Object.entries(probs).map(([stage, p]) => (
            <span key={stage} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/60 border border-border/40">
              {stage}: {(p * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Trailing 6mo realized</div>
        <div className="grid grid-cols-6 gap-1" data-testid="realized-sparkline">
          {realized.map((r) => {
            const max = Math.max(1, ...realized.map((x) => x.realized));
            const h = Math.max(4, Math.round((r.realized / max) * 40));
            return (
              <div key={r.month} className="flex flex-col items-center" title={`${r.month}: $${Math.round(r.realized).toLocaleString()}`}>
                <div style={{ height: `${h}px` }} className="w-full bg-primary/60 rounded-sm" />
                <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">{r.month.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// iter207 · P2 · Lifecycle Audit — BROKEN/WARN/OK verdict across lead→billing
// ───────────────────────────────────────────────────────────────────────────
function LifecycleAuditView() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [filter, setFilter] = React.useState<"all" | "BROKEN" | "WARN" | "OK">("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const j = await get<any>("/api/crm/lifecycle-audit");
      setRows((j?.data?.rows) || []);
      setSummary(j?.data?.summary || null);
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const filtered = React.useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.verdict === filter);
  }, [rows, filter]);

  const verdictColor: Record<string, string> = {
    OK: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    WARN: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    BROKEN: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Lifecycle Audit</CardTitle>
        <CardDescription>
          End-to-end validation: contact → event → BEO (GL + Maestro) → invoices.
          Rows with gaps surface at the top so ops can remediate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="lifecycle-summary">
            <StatCard label="Total" value={String(summary.total)} />
            <StatCard label="OK" value={String(summary.ok)} />
            <StatCard label="WARN" value={String(summary.warn)} />
            <StatCard label="BROKEN" value={String(summary.broken)} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {(["all", "BROKEN", "WARN", "OK"] as const).map((f) => (
            <button
              key={f}
              data-testid={`lifecycle-filter-${f}`}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                filter === f
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "border-border/40 text-foreground/60 hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
          <div className="flex-1" />
          <Button data-testid="lifecycle-refresh" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Running audit across the lifecycle…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No rows match this filter.</div>
        ) : (
          <div className="space-y-2" data-testid="lifecycle-rows">
            {filtered.map((r: any) => (
              <div
                key={r.contact_id}
                data-testid={`lifecycle-row-${r.contact_id}`}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/30 bg-background/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{r.name || "—"}</span>
                    {r.company && <span className="text-xs text-muted-foreground">· {r.company}</span>}
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border",
                        verdictColor[r.verdict] || "",
                      )}
                      data-testid={`verdict-${r.verdict}`}
                    >
                      {r.verdict}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{r.stage}</span>
                  </div>
                  {r.gaps && r.gaps.length > 0 && (
                    <ul className="mt-1.5 text-[11px] text-muted-foreground list-disc pl-5 space-y-0.5">
                      {r.gaps.map((g: string, i: number) => (
                        <li key={i} className="text-rose-600/80 dark:text-rose-300/80">{g}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                    event: {r.event_id || "—"} · beo: {r.beo_id || "—"} · invoices: {r.invoice_count}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono">${Math.round(r.expected_value || 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-xl font-semibold">{value}</CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Clients table (create / edit / delete)
// ───────────────────────────────────────────────────────────────────────────
type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
};

function CrmContactsTable() {
  const [search, setSearch] = React.useState("");
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<Contact | null>(null);
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", company: "" });

  const fetchContacts = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await get<{ contacts: Contact[] }>(
        `/api/crm/contacts?limit=50&offset=0&search=${encodeURIComponent(search)}`,
      );
      setContacts(Array.isArray(res?.contacts) ? res.contacts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clients");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  React.useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", company: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name || "", email: c.email || "", phone: c.phone || "", company: c.company || "" });
    setIsDialogOpen(true);
  };

  const onSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      if (editing) {
        await put(`/api/crm/contacts/${editing.id}`, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
        });
      } else {
        await post(`/api/crm/contacts`, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
        });
      }
      setIsDialogOpen(false);
      await fetchContacts();
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (c: Contact) => {
    await del(`/api/crm/contacts/${c.id}`);
    await fetchContacts();
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>CRM contacts (stored in `clients`).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchContacts} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Badge variant="secondary">{contacts.length}</Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : contacts.length === 0 ? (
          <div className="text-sm text-muted-foreground">No clients found.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.company || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void onDelete(c)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Client" : "New Client"}</DialogTitle>
            <DialogDescription>Saved immediately to CRM contacts.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={() => void onSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
