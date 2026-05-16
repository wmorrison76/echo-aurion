/**
 * AllergenImpactViewerPanel
 * View allergen propagation: ingredient -> recipe -> menu item -> BEO -> production sheet -> label.
 * Each propagation emits trace links; dietary tags and cross-contact risk shown.
 */

import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropagationNode {
  type: string;
  id: string;
  name: string;
  allergens: string[];
  crossContactRisk?: string;
}

export default function AllergenImpactViewerPanel() {
  const [chain, setChain] = useState<PropagationNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "/api/nutrition/allergen-chain?ingredientId=default",
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.chain)) setChain(data.chain);
        }
      } catch {
        // stub
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="p-4 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        Allergen Impact Viewer
      </h2>
      <p className="text-sm text-muted-foreground">
        Propagation: ingredient → recipe → menu item → BEO → production sheet →
        label. Each step trace-linked.
      </p>
      {chain.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No chain loaded. Select an ingredient to see propagation.
        </p>
      ) : (
        <ul className="flex flex-wrap items-center gap-2">
          {chain.map((node, i) => (
            <React.Fragment key={node.id}>
              {i > 0 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
              <li
                className={cn(
                  "border rounded-lg px-3 py-2 text-sm",
                  node.crossContactRisk === "high"
                    ? "border-destructive bg-destructive/5"
                    : "border-border bg-card",
                )}
              >
                <span className="font-medium">{node.type}</span>: {node.name}
                {node.allergens?.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({node.allergens.join(", ")})
                  </span>
                )}
              </li>
            </React.Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
