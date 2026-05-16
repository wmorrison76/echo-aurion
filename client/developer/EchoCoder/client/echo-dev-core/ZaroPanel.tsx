import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type Snap = { name: string; mtime: number; size: number; label?: string };

export default function ZaroPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  async function refresh() {
    try {
      const r = await fetch("/api/zaro/snaps");
      const j = await r.json();
      if (r.ok && j.ok) {
        setSnaps(j.list || []);
        if (!sel && (j.list || []).length)
          setSel(j.list[j.list.length - 1].name);
      }
    } catch {}
  }
  useEffect(() => {
    refresh();
  }, []);
  const run = async (name: string, path: string, body?: any) => {
    if (busy) return;
    setBusy(name);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && (j.ok ?? true)) {
        if (name === "snapshot") {
          toast({
            title: "Snapshot saved",
            description: j.snapshotPath?.replace(/^.*\//, "") || "OK",
          });
          await refresh();
        } else if (name === "integrity")
          toast({
            title: "Integrity",
            description: (j.changes?.length || 0) + " change(s)",
          });
        else if (name === "restore") {
          toast({
            title: "Restored",
            description: `${j.restored || 0} files from ${j.snapshot || ""}`,
          });
          window.location.reload();
        }
      } else {
        toast({
          title: `${name} failed`,
          description: j.error || "Error",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: `${name} error`,
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle>ZARO • Guardian</CardTitle>
          <CardDescription>
            Snapshots, integrity check, and restore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-x-2">
          <Button
            disabled={!!busy}
            onClick={() => run("snapshot", "/api/zaro/snapshot")}
          >
            Snapshot
          </Button>
          <Button
            variant="secondary"
            disabled={!!busy}
            onClick={() => run("integrity", "/api/zaro/integrity")}
          >
            Integrity
          </Button>
          <Button
            variant="outline"
            disabled={!!busy}
            onClick={() => {
              if (
                confirm("Restore latest snapshot? This will overwrite files.")
              )
                run("restore", "/api/zaro/restore");
            }}
          >
            Restore
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restore points</CardTitle>
          <CardDescription>Choose a snapshot to restore.</CardDescription>
        </CardHeader>
        <CardContent>
          {snaps.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No snapshots yet.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={sel || ""}
                onChange={(e) => setSel(e.target.value)}
                className="rounded border bg-background px-2 py-1"
              >
                {snaps.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.label ? `[${s.label}] ` : ""}
                    {s.name} • {new Date(s.mtime).toLocaleString()} •{" "}
                    {(s.size / 1024 / 1024).toFixed(2)} MB
                  </option>
                ))}
              </select>
              <Button
                variant="default"
                disabled={!sel || !!busy}
                onClick={() => {
                  if (
                    sel &&
                    confirm(`Restore ${sel}? This will overwrite files.`)
                  )
                    run("restore", "/api/zaro/restore", { name: sel });
                }}
              >
                Restore selected
              </Button>
              <input
                placeholder="Label"
                className="rounded border bg-background px-2 py-1"
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && sel) {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v) {
                      const r = await fetch("/api/zaro/label", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: sel, label: v }),
                      });
                      if (r.ok) {
                        toast({ title: "Labeled", description: v });
                        (e.target as HTMLInputElement).value = "";
                        refresh();
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>Search recent operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="logq"
              placeholder="search logs"
              className="rounded border bg-background px-2 py-1"
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const q = (e.target as HTMLInputElement).value;
                  const r = await fetch(
                    `/api/logs/search?q=${encodeURIComponent(q)}`,
                  );
                  const j = await r.json();
                  if (r.ok && j.ok) {
                    alert((j.results || []).slice(-50).join("\n"));
                  }
                }
              }}
            />
            <Button
              variant="outline"
              onClick={async () => {
                await fetch("/api/logs/append", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ line: "manual log entry" }),
                });
                toast({ title: "Logged" });
              }}
            >
              Append test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
