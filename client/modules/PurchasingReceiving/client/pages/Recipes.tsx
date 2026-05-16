import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { RecipeCosting } from "@/components/recipes/RecipeCosting";
import { useRecipeCatalog } from "@/hooks/use-recipe-catalog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
interface OutletOption {
  value: string;
  label: string;
  count: number;
}
export default function Recipes() {
  const { entries, outlets, status, error, refresh } = useRecipeCatalog();
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const loading = status === "loading";
  const outletOptions: OutletOption[] = useMemo(() => {
    const enriched = new Map<string, OutletOption>();
    for (const outlet of outlets) {
      enriched.set(outlet.id, {
        value: outlet.id,
        label: outlet.name,
        count: 0,
      });
    }
    let unassignedCount = 0;
    const unassignedNames = new Set<string>();
    for (const entry of entries) {
      if (entry.outletId && enriched.has(entry.outletId)) {
        const option = enriched.get(entry.outletId);
        if (option) option.count += 1;
      } else {
        unassignedCount += 1;
        if (entry.outletName) {
          unassignedNames.add(entry.outletName);
        }
      }
    }
    const sorted = Array.from(enriched.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    const options: OutletOption[] = [
      { value: "all", label: "All outlets", count: entries.length },
      ...sorted,
    ];
    if (unassignedCount) {
      const names = Array.from(unassignedNames);
      const label =
        names.length === 1
          ? `${names[0]} (Unassigned)`
          : "Needs outlet assignment";
      options.push({ value: "__unassigned__", label, count: unassignedCount });
    }
    return options;
  }, [entries, outlets]);
  useEffect(() => {
    if (!outletOptions.length) {
      if (selectedOutlet !== "all") {
        setSelectedOutlet("all");
      }
      return;
    }
    const isValid = outletOptions.some(
      (option) => option.value === selectedOutlet,
    );
    if (!isValid) {
      setSelectedOutlet(outletOptions[0].value);
    }
  }, [outletOptions, selectedOutlet]);
  const filteredCatalog = useMemo(() => {
    return entries
      .filter((entry) => {
        if (selectedOutlet === "all") return true;
        if (selectedOutlet === "__unassigned__") return !entry.outletId;
        return entry.outletId === selectedOutlet;
      })
      .map((entry) => entry.item);
  }, [entries, selectedOutlet]);
  const selectedMeta = outletOptions.find(
    (option) => option.value === selectedOutlet,
  );
  const selectedCount = selectedMeta?.count ?? filteredCatalog.length;
  const hasAnyCatalog = entries.length > 0;
  const showEmptyCatalog = !loading && !hasAnyCatalog;
  const showOutletGap = !loading && hasAnyCatalog && !filteredCatalog.length;
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div className="rounded-lg border bg-muted/40 p-4">
          {" "}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            {" "}
            <div className="sm:w-72">
              {" "}
              <Label htmlFor="recipe-outlet">Outlet</Label>{" "}
              <select
                id="recipe-outlet"
                className="mt-1 w-full rounded-md border bg-background p-2"
                value={selectedOutlet}
                onChange={(event) => setSelectedOutlet(event.target.value)}
              >
                {" "}
                {outletOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {" "}
                    {option.label}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {" "}
              <div className="text-sm text-muted-foreground">
                {" "}
                {loading
                  ? "Loading cost catalog…"
                  : `${selectedCount} cost ${selectedCount === 1 ? "entry" : "entries"} available${selectedOutlet !== "all" && selectedMeta ? ` for ${selectedMeta.label}` : ""}.`}{" "}
                {status === "error" ? " Using offline snapshot." : ""}{" "}
              </div>{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                {" "}
                {loading ? "Refreshing…" : "Refresh"}{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {status === "error" && error && (
          <Alert variant="destructive">
            {" "}
            <AlertTitle>Offline mode</AlertTitle>{" "}
            <AlertDescription>{error}</AlertDescription>{" "}
          </Alert>
        )}{" "}
        {showEmptyCatalog && (
          <Alert>
            {" "}
            <AlertTitle>No standardized costs yet</AlertTitle>{" "}
            <AlertDescription>
              {" "}
              Upload invoices under Purchasing → Invoice Drop to build your
              ingredient cost catalog. Once processed, costs will appear here
              automatically.{" "}
            </AlertDescription>{" "}
          </Alert>
        )}{" "}
        {showOutletGap && (
          <Alert className="border-dashed bg-muted/30">
            {" "}
            <AlertTitle>No costs for this outlet</AlertTitle>{" "}
            <AlertDescription>
              {" "}
              We haven&apos;t detected standardized costs for this outlet yet.
              Assign invoices to this outlet or review vendor codes to route
              them automatically.{" "}
            </AlertDescription>{" "}
          </Alert>
        )}{" "}
        <RecipeCosting catalog={filteredCatalog} />{" "}
      </div>{" "}
    </AppLayout>
  );
}
