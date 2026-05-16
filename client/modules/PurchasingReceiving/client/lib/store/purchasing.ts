import { logger } from "../logger";
import {
  PurchaseOrder,
  Receipt,
  UUID,
  ShortageNotice,
  PurchaseOrderVariance,
} from "@shared/purchasing";
import type {
  Vendor,
  Outlet,
  VendorOutletCode,
  VendorOrderingMode,
} from "@shared/purchasing";
import type { VendorCodeMatch } from "@shared/api";
import {
  LS,
  read,
  write,
  sanitizeString,
  arrayShallowEqual,
  id,
  escapeRegex,
} from "./shared";
const STATUS_SEQUENCE: PurchaseOrder["status"][] = [
  "created",
  "sent",
  "confirmed",
  "shipped",
  "delivered",
  "closed",
  "void",
];
const STATUS_RANK = STATUS_SEQUENCE.reduce<
  Record<PurchaseOrder["status"], number>
>((acc, status, index) => {
  acc[status] = index;
  return acc;
}, {} as any);
const VENDOR_ORDERING_MODE_ORDER: VendorOrderingMode[] = [
  "direct",
  "punchout",
  "email",
  "portal",
];
const VENDOR_ORDERING_MODE_SET = new Set(VENDOR_ORDERING_MODE_ORDER);
type AnyRecord = Record<string, unknown>;
const normalizeVendorOutletCode = (
  input: unknown,
): { value: VendorOutletCode | null; changed: boolean } => {
  if (!input || typeof input !== "object")
    return { value: null, changed: false };
  const raw = input as Partial<VendorOutletCode> & AnyRecord;
  let changed = false;
  const code = sanitizeString(raw.code);
  if (!code) return { value: null, changed: true };
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const outletId =
    typeof raw.outletId === "string" && raw.outletId ? raw.outletId : null;
  if (outletId !== (raw.outletId ?? null)) changed = true;
  const label = sanitizeString(raw.label);
  if (label !== (raw.label ?? null)) changed = true;
  const outletName = sanitizeString(raw.outletName);
  if (outletName !== (raw.outletName ?? null)) changed = true;
  const keywordsRaw = Array.isArray(raw.keywords) ? raw.keywords : [];
  const keywords = Array.from(
    new Set(
      keywordsRaw
        .map((keyword) => sanitizeString(keyword))
        .filter((keyword): keyword is string => !!keyword),
    ),
  );
  const normalizedKeywords = keywords.length ? keywords : null;
  if (
    !arrayShallowEqual(
      normalizedKeywords ?? [],
      keywordsRaw as string[] | undefined,
    )
  ) {
    changed = true;
  }
  const priority =
    typeof raw.priority === "number" && Number.isFinite(raw.priority)
      ? raw.priority
      : null;
  if (priority !== (raw.priority ?? null)) changed = true;
  const normalized: VendorOutletCode = {
    id: idValue,
    outletId,
    outletName,
    code,
    label,
    keywords: normalizedKeywords,
    priority,
  };
  return { value: normalized, changed };
};
const sortVendorCodes = (codes: VendorOutletCode[]): VendorOutletCode[] =>
  codes.slice().sort((a, b) => {
    const ap = a.priority ?? 0;
    const bp = b.priority ?? 0;
    if (ap !== bp) return bp - ap;
    return a.code.localeCompare(b.code);
  });
const normalizeVendor = (
  input: unknown,
): { vendor: Vendor; changed: boolean } => {
  const raw = (
    input && typeof input === "object" ? input : {}
  ) as Partial<Vendor> & AnyRecord;
  let changed = false;
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const name = sanitizeString(raw.name) ?? "Unnamed Vendor";
  if (name !== raw.name) changed = true;
  const contactEmail = sanitizeString(raw.contactEmail);
  if (contactEmail !== (raw.contactEmail ?? null)) changed = true;
  const phone = sanitizeString(raw.phone);
  if (phone !== (raw.phone ?? null)) changed = true;
  const portalUrl = sanitizeString(raw.portalUrl);
  if (portalUrl !== (raw.portalUrl ?? null)) changed = true;
  const accountNumber = sanitizeString(raw.accountNumber);
  if (accountNumber !== (raw.accountNumber ?? null)) changed = true;
  const notes = sanitizeString(raw.notes);
  if (notes !== (raw.notes ?? null)) changed = true;
  const defaultOutletId =
    typeof raw.defaultOutletId === "string" && raw.defaultOutletId
      ? raw.defaultOutletId
      : null;
  if (defaultOutletId !== (raw.defaultOutletId ?? null)) changed = true;
  const orderingModesRaw = Array.isArray(raw.orderingModes)
    ? raw.orderingModes
    : [];
  const normalizedModes = Array.from(
    new Set(
      orderingModesRaw
        .map((mode) =>
          typeof mode === "string" ? mode.trim().toLowerCase() : "",
        )
        .filter((mode): mode is VendorOrderingMode =>
          VENDOR_ORDERING_MODE_SET.has(mode as VendorOrderingMode),
        ),
    ),
  );
  const orderedModes = normalizedModes.sort(
    (a, b) =>
      VENDOR_ORDERING_MODE_ORDER.indexOf(a) -
      VENDOR_ORDERING_MODE_ORDER.indexOf(b),
  );
  if (
    !arrayShallowEqual(
      orderedModes,
      orderingModesRaw as VendorOrderingMode[] | undefined,
    )
  ) {
    changed = true;
  }
  const codesRaw = Array.isArray(raw.codes) ? raw.codes : [];
  const normalizedCodes: VendorOutletCode[] = [];
  let codesChanged = false;
  for (const entry of codesRaw) {
    const { value, changed: entryChanged } = normalizeVendorOutletCode(entry);
    if (entryChanged) codesChanged = true;
    if (!value) continue;
    normalizedCodes.push(value);
  }
  if (codesRaw.length !== normalizedCodes.length) codesChanged = true;
  if (codesChanged) changed = true;
  const sortedCodes = sortVendorCodes(normalizedCodes);
  const vendor: Vendor = {
    id: idValue,
    name,
    contactEmail,
    phone,
    portalUrl,
    accountNumber,
    orderingModes: orderedModes,
    defaultOutletId,
    notes,
    codes: sortedCodes,
  };
  return { vendor, changed };
};
const normalizeOutlet = (
  input: unknown,
): { outlet: Outlet; changed: boolean } => {
  const raw = (
    input && typeof input === "object" ? input : {}
  ) as Partial<Outlet> & AnyRecord;
  let changed = false;
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const name = sanitizeString(raw.name) ?? "Outlet";
  if (name !== raw.name) changed = true;
  const shortCode = sanitizeString(raw.shortCode);
  if (shortCode !== (raw.shortCode ?? null)) changed = true;
  const contactEmail = sanitizeString(raw.contactEmail);
  if (contactEmail !== (raw.contactEmail ?? null)) changed = true;
  const phone = sanitizeString(raw.phone);
  if (phone !== (raw.phone ?? null)) changed = true;
  const address = sanitizeString(raw.address);
  if (address !== (raw.address ?? null)) changed = true;
  const defaultGlGroupId =
    typeof raw.defaultGlGroupId === "string" && raw.defaultGlGroupId
      ? raw.defaultGlGroupId
      : null;
  if (defaultGlGroupId !== (raw.defaultGlGroupId ?? null)) changed = true;
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = Array.from(
    new Set(
      tagsRaw
        .map((tag) => sanitizeString(tag))
        .filter((tag): tag is string => !!tag),
    ),
  );
  const normalizedTags = tags.length ? tags : null;
  if (!arrayShallowEqual(normalizedTags ?? [], tagsRaw as string[] | undefined))
    changed = true;
  const tagCommissary = tags.some((tag) =>
    tag.toLowerCase().includes("commissary"),
  );
  const isCommissary =
    typeof raw.isCommissary === "boolean" ? raw.isCommissary : tagCommissary;
  if (
    (raw.isCommissary ?? null) !== isCommissary &&
    raw.isCommissary !== undefined
  )
    changed = true;
  if (tagCommissary && raw.isCommissary === undefined) changed = true;
  const outlet: Outlet = {
    id: idValue,
    name,
    shortCode,
    contactEmail,
    phone,
    address,
    tags: normalizedTags ?? undefined,
    defaultGlGroupId,
    isCommissary: isCommissary ?? null,
  };
  return { outlet, changed };
};
const gatherVendorTokens = (entry: VendorOutletCode): string[] => {
  const tokens = new Set<string>();
  if (entry.code) tokens.add(entry.code);
  if (entry.label) tokens.add(entry.label);
  if (Array.isArray(entry.keywords)) {
    for (const keyword of entry.keywords) {
      if (keyword) tokens.add(keyword);
    }
  }
  return Array.from(tokens)
    .map((token) => token.trim())
    .filter(Boolean);
};
export const purchasingStore = {
  listVendors(): Vendor[] {
    const raw = read(LS.vendors, [] as Vendor[]);
    let changedAny = false;
    const normalized = raw.map((entry) => {
      const { vendor, changed } = normalizeVendor(entry);
      if (changed) changedAny = true;
      return vendor;
    });
    if (changedAny) {
      write(LS.vendors, normalized);
    }
    return normalized;
  },
  saveVendor(v: Vendor) {
    const { vendor } = normalizeVendor(v);
    const list = this.listVendors();
    const idx = list.findIndex((entry) => entry.id === vendor.id);
    if (idx >= 0) list[idx] = vendor;
    else list.unshift(vendor);
    write(LS.vendors, list);
    try {
      window.dispatchEvent(
        new CustomEvent("echo:vendor:save", { detail: vendor }),
      );
    } catch {}
  },
  ensureVendorByName(name: string) {
    const n = name.trim();
    if (!n) {
      return normalizeVendor({
        id: id(),
        name: "Unnamed Vendor",
        contactEmail: null,
      }).vendor;
    }
    const list = this.listVendors();
    let vendor = list.find(
      (entry) => entry.name.toLowerCase() === n.toLowerCase(),
    );
    if (!vendor) {
      vendor = normalizeVendor({
        id: id(),
        name: n,
        contactEmail: null,
        codes: [],
      }).vendor;
      this.saveVendor(vendor);
    }
    return vendor;
  },
  listOutlets(): Outlet[] {
    const raw = read(LS.outlets, [] as Outlet[]);
    let changedAny = false;
    const normalized = raw.map((entry) => {
      const { outlet, changed } = normalizeOutlet(entry);
      if (changed) changedAny = true;
      return outlet;
    });
    if (changedAny) {
      write(LS.outlets, normalized);
    }
    return normalized;
  },
  saveOutlet(o: Outlet) {
    const { outlet } = normalizeOutlet(o);
    const list = this.listOutlets();
    const idx = list.findIndex((entry) => entry.id === outlet.id);
    if (idx >= 0) list[idx] = outlet;
    else list.unshift(outlet);
    write(LS.outlets, list);
    try {
      window.dispatchEvent(
        new CustomEvent("echo:outlet:save", { detail: outlet }),
      );
    } catch {}
  },
  ensureOutletByName(name: string) {
    const n = name.trim();
    if (!n) {
      const { outlet } = normalizeOutlet({ id: id(), name: "Outlet" });
      this.saveOutlet(outlet);
      return outlet;
    }
    const list = this.listOutlets();
    let outlet = list.find(
      (entry) => entry.name.toLowerCase() === n.toLowerCase(),
    );
    if (!outlet) {
      outlet = normalizeOutlet({ id: id(), name: n }).outlet;
      this.saveOutlet(outlet);
    }
    return outlet;
  },
  matchOutletForVendor(
    vendorId: string | null | undefined,
    vendorName?: string | null,
    text?: string,
  ): VendorCodeMatch | null {
    if (!text) return null;
    const haystack = text.toLowerCase();
    if (!haystack.trim()) return null;
    const vendors = this.listVendors();
    let vendor = vendorId
      ? vendors.find((entry) => entry.id === vendorId)
      : undefined;
    if (!vendor && vendorName) {
      const key = vendorName.trim().toLowerCase();
      vendor = vendors.find((entry) => entry.name.trim().toLowerCase() === key);
    }
    if (!vendor) return null;
    const codes = Array.isArray(vendor.codes) ? vendor.codes : [];
    if (!codes.length) return null;
    const outlets = this.listOutlets();
    let best: {
      entry: VendorOutletCode;
      token: string;
      confidence: number;
      matchType: string;
    } | null = null;
    for (const entry of codes) {
      const tokens = gatherVendorTokens(entry);
      if (!tokens.length) continue;
      const priorityBoost =
        entry.priority != null ? Number(entry.priority) * 0.01 : 0;
      for (const token of tokens) {
        const normalizedToken = token.toLowerCase();
        if (!normalizedToken) continue;
        const regex = new RegExp(
          `(^|[^A-Za-z0-9])${escapeRegex(normalizedToken)}([^A-Za-z0-9]|$)`,
          "i",
        );
        let confidence = 0;
        let matchType = "partial";
        if (regex.test(text)) {
          confidence = 0.92 + priorityBoost;
          matchType = "word";
        } else if (haystack.includes(normalizedToken)) {
          confidence = 0.75 + priorityBoost;
        } else {
          continue;
        }
        confidence += Math.min(0.08, normalizedToken.length / 64);
        if (!best || confidence > best.confidence) {
          best = {
            entry,
            token,
            confidence: Math.min(0.99, confidence),
            matchType,
          };
        }
      }
    }
    if (!best) return null;
    const outlet = best.entry.outletId
      ? outlets.find((o) => o.id === best.entry.outletId)
      : null;
    const vendorCodeMatch: VendorCodeMatch = {
      code: best.token,
      outletId: best.entry.outletId ?? null,
      outletName: outlet?.name ?? best.entry.outletName ?? null,
      confidence: Number(best.confidence.toFixed(3)),
      source: `vendor-code:${best.matchType}`,
    };
    return vendorCodeMatch;
  },
  listPOs(): PurchaseOrder[] {
    return read(LS.po, [] as PurchaseOrder[]);
  },
  savePO(po: PurchaseOrder) {
    const list = this.listPOs();
    const idx = list.findIndex((entry) => entry.id === po.id);
    if (idx >= 0) list[idx] = po;
    else list.unshift(po);
    write(LS.po, list);
  },
  listReceipts(): Receipt[] {
    return read(LS.receipts, [] as Receipt[]);
  },
  saveReceipt(receipt: Receipt) {
    const list = this.listReceipts();
    const idx = list.findIndex((entry) => entry.id === receipt.id);
    if (idx >= 0) list[idx] = receipt;
    else list.unshift(receipt);
    write(LS.receipts, list);
  },
};
export function detectShortages(
  po: PurchaseOrder,
  receipt: Receipt,
): ShortageNotice[] {
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  const shortages: ShortageNotice[] = [];
  for (const item of po.items) {
    let receivedQty = receipt.lines
      .filter((l) => l.poItemId === item.id)
      .reduce((s, l) => s + l.qty, 0);
    if (receivedQty === 0) {
      const name = norm(item.productName);
      for (const l of receipt.lines) {
        const ln = norm(l.productName);
        if (!ln || !name) continue;
        if (ln.includes(name) || name.includes(ln)) receivedQty += l.qty;
      }
    }
    if (receivedQty < item.qty) {
      shortages.push({
        id: id(),
        poItemId: item.id,
        expectedQty: item.qty,
        receivedQty,
        productName: item.productName,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return shortages;
}
