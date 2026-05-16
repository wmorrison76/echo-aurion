import React from "react";
import JSZip from "jszip";
import { Download, ExternalLink, FileText } from "lucide-react";
import { getBeo } from "@/lib/beo-store";
import { osBus } from "@/lib/os-bus";
import { cn } from "@/lib/glass";

function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadEchoLayoutById(layoutId: string) {
  try {
    const raw = localStorage.getItem("echo_layouts");
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return null;
    return arr.find((l: any) => String(l?.id) === String(layoutId)) ?? null;
  } catch {
    return null;
  }
}

export function BeoDocumentPack({
  beoId,
  layoutId,
  className,
}: {
  beoId: string;
  layoutId: string | null;
  className?: string;
}) {
  const doc = React.useMemo(() => (beoId ? getBeo(beoId) : null), [beoId]);
  const layout = React.useMemo(
    () => (layoutId ? loadEchoLayoutById(layoutId) : null),
    [layoutId],
  );

  if (!doc) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No BEO found for pack export.
      </div>
    );
  }

  const isApproved = doc.approvalStatus === "approved";

  const exportPdf = async () => {
    const res = await fetch("/api/beo/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: doc.title,
        date: doc.start?.slice(0, 10),
        covers: doc.gtd ?? doc.exp ?? doc.set,
        layoutSummary: layout?.metadata || {},
        layoutObjects: layout?.objects || [],
        items: (doc.menu?.sections || []).flatMap((section) =>
          section.items.map((item) => ({
            qty: doc.gtd ?? doc.exp ?? 0,
            name: item.itemName,
          })),
        ),
        includeConsumables: true,
        notes: doc.menu?.menuNotes || "",
        eventId: doc.eventId,
        outletId: doc.outletId,
        eventTypeCode:
          doc.documentType === "Banquet Event Order" ? "BAN" : "RES",
        departmentId:
          doc.documentType === "Banquet Event Order"
            ? "banquets"
            : "restaurant",
      }),
    });
    if (!res.ok) throw new Error(`PDF export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.beoNumber || doc.beoId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPackZip = async () => {
    const zip = new JSZip();
    zip.file(`BEO_${doc.beoId}.json`, JSON.stringify(pack, null, 2));
    try {
      const res = await fetch("/api/beo/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: doc.title,
          date: doc.start?.slice(0, 10),
          covers: doc.gtd ?? doc.exp ?? doc.set,
          layoutSummary: layout?.metadata || {},
          layoutObjects: layout?.objects || [],
          items: (doc.menu?.sections || []).flatMap((section) =>
            section.items.map((item) => ({
              qty: doc.gtd ?? doc.exp ?? 0,
              name: item.itemName,
            })),
          ),
          includeConsumables: true,
          notes: doc.menu?.menuNotes || "",
          eventId: doc.eventId,
          outletId: doc.outletId,
          eventTypeCode:
            doc.documentType === "Banquet Event Order" ? "BAN" : "RES",
          departmentId:
            doc.documentType === "Banquet Event Order"
              ? "banquets"
              : "restaurant",
        }),
      });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        zip.file(`BEO_${doc.beoId}.pdf`, arrayBuffer);
      }
    } catch {
      // ignore PDF errors for zip
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BEO_Pack_${doc.beoId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pack = {
    kind: "BEO_DOCUMENT_PACK_V1",
    generatedAt: new Date().toISOString(),
    beo: doc,
    layout: layoutId ? { layoutId, snapshot: layout } : null,
    notes: {
      phase: "phase-2",
      source: "EchoEventStudio",
    },
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            Document Pack
          </div>
          <div className="text-xs text-foreground/60 truncate">
            BEO + timeline + attached layout snapshot (if selected) • ready for
            downstream ops.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadJson(`BEO_Pack_${doc.beoId}.json`, pack)}
            className="h-9 px-3 rounded-md border border-border/30 bg-background/60 text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => exportPdf().catch((err) => console.error(err))}
            disabled={!isApproved}
            className="h-9 px-3 rounded-md border border-border/30 bg-background/60 text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex items-center gap-2 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Export PDF
          </button>
          <button
            type="button"
            onClick={() => downloadPackZip().catch((err) => console.error(err))}
            disabled={!isApproved}
            className="h-9 px-3 rounded-md border border-border/30 bg-background/60 text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Download Pack
          </button>
          <button
            type="button"
            onClick={() =>
              osBus.emit("ui:open_panel", {
                panelKey: "maestro-bqt",
                payload: {
                  eventId: doc.eventId,
                  source: "echoeventstudio:document_pack",
                },
                focus: true,
                source: "EchoEventStudio",
              })
            }
            className="h-9 px-3 rounded-md border border-border/30 bg-background/60 text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" /> Open MaestroBQT
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-border/20 bg-background/60 p-2">
          <div className="text-foreground/60">BEO</div>
          <div className="text-foreground font-semibold truncate">
            {doc.beoNumber || doc.beoId}
          </div>
        </div>
        <div className="rounded-md border border-border/20 bg-background/60 p-2">
          <div className="text-foreground/60">Event</div>
          <div className="text-foreground font-semibold truncate">
            {doc.title}
          </div>
        </div>
        <div className="rounded-md border border-border/20 bg-background/60 p-2">
          <div className="text-foreground/60">Layout</div>
          <div className="text-foreground font-semibold truncate">
            {layout ? layout.name : layoutId ? layoutId : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
