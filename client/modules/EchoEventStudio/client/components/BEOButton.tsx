import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEchoBuilderConfig } from "@/hooks/useEchoBuilderConfig";
import { toast } from "@/hooks/use-toast";

export interface BEOButtonProps {
  session: string;
  objects: any[];
  summary: { tables: number; buffets: number; seats: number };
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function BEOButton({ session, objects, summary }: BEOButtonProps) {
  const [exporting, setExporting] = useState(false);
  const cfg = useEchoBuilderConfig(session) as any;
  const defaults = cfg?.EchoBEO || { includeConsumables: true, notes: "" };

  const exportBEO = async () => {
    setExporting(true);
    try {
      const token = getAuthToken();
      const items = objects.map((o) => ({
        name: o.type,
        qty: o.seats || 1,
        glCode: o.glCode,
        unitCost: o.unitCost,
      }));

      const res = await fetch("/api/beo/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          eventName: cfg?.eventName || "Event",
          date: new Date().toISOString().slice(0, 10),
          covers: cfg?.covers ?? summary.seats,
          layoutSummary: summary,
          items: defaults.includeConsumables
            ? items
            : items.filter((i: any) => i.name !== "consumable"),
          includeConsumables: !!defaults.includeConsumables,
          notes: defaults.notes,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed: ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BEO_${session}_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "BEO exported successfully" });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Failed to export BEO",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={exportBEO}
      disabled={exporting}
      variant="outline"
      className="text-xs h-8"
    >
      {exporting ? "Exporting..." : "Export BEO"}
    </Button>
  );
}
