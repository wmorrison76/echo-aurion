import type {
  InvoiceExtractionResult,
  InvoiceHeader,
  VendorCodeMatch,
} from "@shared/api";

import { Store } from "@/lib/store";

const baseHeader = (): InvoiceHeader =>
  ({
    seller: {},
    customer: {},
    invoiceLabelPresent: false,
    payment: {},
  }) as any;

const normalizeKey = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const levenshtein = (a: string, b: string) => {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
};

const similarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length, 1);
};

type VendorResolution = {
  name: string;
  vendorId?: string;
  confidence: number;
  source: string;
};

export const ensureInvoiceHeader = (header?: InvoiceHeader): InvoiceHeader => {
  if (!header) return { ...baseHeader() };
  return {
    ...baseHeader(),
    ...header,
    seller: header.seller ?? {},
    customer: header.customer ?? {},
    payment: header.payment ?? {},
  };
};

function listVendorsSafe(): {
  id: string;
  name: string;
  defaultOutletId?: string | null;
}[] {
  try {
    return Store.listVendors?.() || [];
  } catch {
    return [];
  }
}

function listOutletsSafe(): { id: string; name: string }[] {
  try {
    return Store.listOutlets?.() || [];
  } catch {
    return [];
  }
}

function bestVendorFromStore(name: string) {
  const target = normalizeKey(name);
  if (!target) return null;
  let best: {
    vendor: { id: string; name: string; defaultOutletId?: string | null };
    score: number;
  } | null = null;
  for (const vendor of listVendorsSafe()) {
    const score = similarity(target, normalizeKey(vendor.name));
    if (!best || score > best.score) best = { vendor, score };
  }
  return best;
}

const vendorKeywordHints = [
  { keyword: "halpern", name: "Halperns" },
  { keyword: "us foods", name: "US Foods" },
  { keyword: "sysco", name: "Sysco" },
  { keyword: "gordon food", name: "Gordon Food Service" },
  { keyword: "mr greens", name: "Mr Greens" },
] as const;

function resolveVendor(
  header?: InvoiceHeader,
  fallback?: string,
  text?: string,
): VendorResolution {
  const candidates: { name: string; confidence: number; source: string }[] = [];
  const push = (
    name?: string | null,
    confidence = 0.4,
    source = "fallback",
  ) => {
    const key = normalizeKey(name);
    if (!key) return;
    const existingIndex = candidates.findIndex(
      (c) => normalizeKey(c.name) === key,
    );
    if (existingIndex >= 0) {
      if (confidence > candidates[existingIndex].confidence)
        candidates[existingIndex] = { name: name!.trim(), confidence, source };
      return;
    }
    candidates.push({ name: name!.trim(), confidence, source });
  };

  if (header) {
    push(header.seller?.name, 0.95, "header.seller.name");
    push(header.seller?.company, 0.9, "header.seller.company");
  }
  push(fallback, 0.6, "fallback");

  if (text) {
    const lowerLines = text
      .split(/[\r\n]+/)
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);

    for (const hint of vendorKeywordHints) {
      const matchIndex = lowerLines.findIndex((line) =>
        line.includes(hint.keyword),
      );
      if (matchIndex !== -1) {
        const confidence =
          matchIndex <= 2 ? 0.92 : matchIndex <= 6 ? 0.8 : 0.65;
        push(hint.name, confidence, `hint:${hint.keyword}:line${matchIndex}`);
      }
    }
  }

  if (!candidates.length)
    return { name: "Unknown Vendor", confidence: 0.2, source: "default" };

  let best: VendorResolution = {
    name: candidates[0].name,
    confidence: candidates[0].confidence,
    source: candidates[0].source,
  };

  for (const candidate of candidates) {
    const storeMatch = bestVendorFromStore(candidate.name);
    const matchScore = storeMatch?.score ?? 0;
    const useStore = Boolean(storeMatch && matchScore >= 0.45);
    const name = useStore ? storeMatch!.vendor.name : candidate.name;
    const vendorId = useStore ? storeMatch!.vendor.id : undefined;
    const combinedConfidence = useStore
      ? Math.max(
          candidate.confidence,
          candidate.confidence * 0.4 + matchScore * 0.6,
        )
      : candidate.confidence;
    if (combinedConfidence > best.confidence) {
      best = {
        name,
        vendorId,
        confidence: combinedConfidence,
        source: useStore ? `${candidate.source}:store` : candidate.source,
      };
    }
  }

  return best;
}

export const applyInvoiceVendorNormalization = (
  result: InvoiceExtractionResult,
  context?: { text?: string },
): { normalized: InvoiceExtractionResult; resolution: VendorResolution } => {
  const header = ensureInvoiceHeader(result.header);
  const resolution = resolveVendor(header, result.vendor, context?.text);

  const vendorName = resolution.name || "Unknown Vendor";
  let vendorCodeMatch: VendorCodeMatch | null = null;

  if (context?.text) {
    try {
      vendorCodeMatch =
        Store.matchOutletForVendor?.(
          resolution.vendorId ?? null,
          resolution.name,
          context.text,
        ) ?? null;
    } catch {
      vendorCodeMatch = null;
    }
  }

  if (!vendorCodeMatch) {
    try {
      const vendors = listVendorsSafe();
      const vendorRecord = resolution.vendorId
        ? vendors.find((v) => v.id === resolution.vendorId)
        : undefined;
      if (vendorRecord?.defaultOutletId) {
        const outlet = listOutletsSafe().find(
          (o) => o.id === vendorRecord.defaultOutletId,
        );
        if (outlet) {
          vendorCodeMatch = {
            code: "DEFAULT",
            outletId: outlet.id,
            outletName: outlet.name,
            confidence: 0.55,
            source: "vendor-default",
          };
        }
      }
    } catch {
      /* ignore */
    }
  }

  const suggestedOutletId =
    vendorCodeMatch?.outletId ?? (result as any).suggestedOutletId ?? null;
  const suggestedOutletName =
    vendorCodeMatch?.outletName ?? (result as any).suggestedOutletName ?? null;

  const normalizedHeader: InvoiceHeader = {
    ...header,
    seller: {
      ...header.seller,
      name: header.seller?.name || vendorName,
      company: header.seller?.company || vendorName,
    },
  };

  const normalized: InvoiceExtractionResult = {
    ...result,
    vendor: vendorName,
    header: normalizedHeader,
    standardized: Array.isArray(result.standardized)
      ? result.standardized.map((item: any) => ({
          ...item,
          vendor: vendorName,
        }))
      : [],
    suggestedOutletId,
    suggestedOutletName,
    vendorCodeMatch: vendorCodeMatch ?? null,
  } as any;

  return { normalized, resolution };
};
