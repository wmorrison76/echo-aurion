import { useCallback, useEffect, useMemo, useState } from "react";
import { Store } from "@/lib/store";
import type { StandardizedLineItem } from "@shared/api";
import type { Outlet } from "@shared/purchasing";
import type {
  RecipeCatalogApiEntry,
  RecipeCatalogResponse,
} from "@shared/recipes";
import { logger } from "@/lib/logger";
export interface RecipeCatalogEntry {
  key: string;
  item: StandardizedLineItem;
  outletId: string | null;
  outletName: string | null;
  capturedAt: string | null;
  sourceId: string | null;
  sourceInvoiceNumber: string | null;
  payload: Record<string, unknown> | null;
}
type CatalogStatus = "idle" | "loading" | "error";
const toTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};
const makeEntryKey = (
  outletId: string | null,
  item: StandardizedLineItem,
): string => {
  const outletKey = outletId ?? "__unassigned__";
  return `${outletKey}::${item.standardized.standardizedName.toLowerCase()}::${item.vendor.toLowerCase()}`;
};
const fromApiEntry = (entry: RecipeCatalogApiEntry): RecipeCatalogEntry => {
  const key = makeEntryKey(entry.outletId, entry.item);
  const capturedAt = entry.capturedAt ?? entry.item.date ?? null;
  return {
    key,
    item: entry.item,
    outletId: entry.outletId,
    outletName: entry.outletName,
    capturedAt,
    sourceId: entry.invoiceId,
    sourceInvoiceNumber: entry.invoiceNumber,
    payload: entry.payload,
  };
};
const buildLocalFallback = () => {
  const outlets = Store.listOutlets();
  const outletNameById = new Map(
    outlets.map((outlet) => [outlet.id, outlet.name]),
  );
  const scans = Store.listScans();
  const dedup = new Map<string, RecipeCatalogEntry>();
  for (const scan of scans) {
    const primaryOutletId =
      scan.outletId ?? scan.vendorCodeMatch?.outletId ?? null;
    const fallbackOutletName = scan.vendorCodeMatch?.outletName ?? null;
    const baseCapturedAt = scan.result.date ?? scan.createdAt ?? null;
    for (const line of scan.result.standardized) {
      const capturedAt = line.date ?? baseCapturedAt;
      const key = makeEntryKey(primaryOutletId, line);
      const outletName = primaryOutletId
        ? (outletNameById.get(primaryOutletId) ?? fallbackOutletName ?? null)
        : (fallbackOutletName ?? null);
      const entry: RecipeCatalogEntry = {
        key,
        item: line,
        outletId: primaryOutletId,
        outletName,
        capturedAt: capturedAt ?? null,
        sourceId: scan.id,
        sourceInvoiceNumber: scan.result.invoiceNumber ?? null,
        payload: null,
      };
      const existing = dedup.get(key);
      if (
        !existing ||
        toTimestamp(entry.capturedAt) >= toTimestamp(existing.capturedAt)
      ) {
        dedup.set(key, entry);
      }
    }
  }
  const entries = Array.from(dedup.values()).sort((a, b) => {
    const nameCompare = a.item.standardized.standardizedName.localeCompare(
      b.item.standardized.standardizedName,
    );
    if (nameCompare !== 0) return nameCompare;
    return a.item.vendor.localeCompare(b.item.vendor);
  });
  return { entries, outlets } as {
    entries: RecipeCatalogEntry[];
    outlets: Outlet[];
  };
};
export function useRecipeCatalog() {
  const [entries, setEntries] = useState<RecipeCatalogEntry[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [status, setStatus] = useState<CatalogStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/recipes/catalog", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`request_failed_${response.status}`);
      }
      const payload = (await response.json()) as RecipeCatalogResponse;
      const dedup = new Map<string, RecipeCatalogEntry>();
      for (const entry of payload.entries) {
        const normalized = fromApiEntry(entry);
        const existing = dedup.get(normalized.key);
        if (
          !existing ||
          toTimestamp(normalized.capturedAt) >= toTimestamp(existing.capturedAt)
        ) {
          dedup.set(normalized.key, normalized);
        }
      }
      const normalizedEntries = Array.from(dedup.values()).sort((a, b) => {
        const nameCompare = a.item.standardized.standardizedName.localeCompare(
          b.item.standardized.standardizedName,
        );
        if (nameCompare !== 0) return nameCompare;
        return a.item.vendor.localeCompare(b.item.vendor);
      });
      setEntries(normalizedEntries);
      setOutlets(payload.outlets);
      setStatus("idle");
    } catch (err) {
      logger.error("[useRecipeCatalog] falling back to local data", err);
      const fallback = buildLocalFallback();
      setEntries(fallback.entries);
      setOutlets(fallback.outlets);
      setStatus("error");
      setError("Showing cached device data. Supabase sync not reachable.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const trigger = () => load();
    window.addEventListener("echo:scan:save", trigger as EventListener);
    window.addEventListener("echo:outlet:save", trigger as EventListener);
    window.addEventListener("echo:vendor:save", trigger as EventListener);
    return () => {
      window.removeEventListener("echo:scan:save", trigger as EventListener);
      window.removeEventListener("echo:outlet:save", trigger as EventListener);
      window.removeEventListener("echo:vendor:save", trigger as EventListener);
    };
  }, [load]);
  return useMemo(
    () => ({ entries, outlets, status, error, refresh: load }),
    [entries, outlets, status, error, load],
  );
}
