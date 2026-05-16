import { logger } from "../logger";
import type {
  InventoryItem,
  CountSession,
  StorageArea,
  StorageRack,
  StorageBin,
  QuickCountTemplate,
  ParSuggestion,
  StorageLayoutRect,
  StorageLayoutBox,
} from "@shared/inventory";
import { luccaSeedItems } from "@shared/data/lucca-seed";
import { deriveGLForName } from "../gl-utils";
import {
  LS,
  read,
  write,
  sanitizeString,
  sanitizeNumber,
  arrayShallowEqual,
  sanitizePositiveInt,
  normalizeDaysOfWeek,
  id,
} from "./shared";
import { purchasingStore } from "./purchasing";
const QUICK_COUNT_EVENT = "echo:inventory:quick-count";
const INVENTORY_LAYOUT_EVENT = "echo:inventory:layout";
export const QUICK_COUNT_EVENT_NAME = QUICK_COUNT_EVENT;
export const INVENTORY_LAYOUT_EVENT_NAME = INVENTORY_LAYOUT_EVENT;
type AnyRecord = Record<string, unknown>;
interface CountSnapshot {
  qty: number;
  at: number;
  unit: string;
  sessionId: string;
  outletId: string;
}
const buildCountSnapshots = (
  sessions: CountSession[],
): Map<string, CountSnapshot[]> => {
  const map = new Map<string, CountSnapshot[]>();
  for (const session of sessions) {
    const timestamp = new Date(
      session.completedAt ?? session.startedAt,
    ).getTime();
    for (const line of session.lines) {
      if (!line || typeof line.itemId !== "string") continue;
      const list = map.get(line.itemId) ?? [];
      list.push({
        qty: typeof line.qty === "number" ? line.qty : 0,
        at: timestamp,
        unit: line.unit,
        sessionId: session.id,
        outletId: session.outletId,
      });
      map.set(line.itemId, list);
    }
  }
  for (const [, list] of map) {
    list.sort((a, b) => b.at - a.at);
  }
  return map;
};

const sanitizeLayoutRect = (input: unknown): StorageLayoutRect | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const x = sanitizeNumber(raw.x);
  const y = sanitizeNumber(raw.y);
  const width = sanitizeNumber(raw.width);
  const depth = sanitizeNumber(raw.depth);
  const rotation = sanitizeNumber(raw.rotation);
  if (x == null || y == null || width == null || depth == null) return null;
  if (width <= 0 || depth <= 0) return null;
  return { x, y, width, depth, rotation: rotation ?? null };
};
const sanitizeLayoutBox = (input: unknown): StorageLayoutBox | null => {
  if (!input || typeof input !== "object") return null;
  const rect = sanitizeLayoutRect(input);
  if (!rect) return null;
  const height = sanitizeNumber((input as Record<string, unknown>).height);
  if (height == null || height <= 0) return null;
  return { ...rect, height };
};
const normalizeStorageArea = (
  input: unknown,
): { area: StorageArea | null; changed: boolean } => {
  if (!input || typeof input !== "object") return { area: null, changed: true };
  const raw = input as Partial<StorageArea> & AnyRecord;
  let changed = false;
  const outletId =
    typeof raw.outletId === "string" && raw.outletId ? raw.outletId : null;
  if (!outletId) return { area: null, changed: true };
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const name = sanitizeString(raw.name) ?? "Storage Area";
  if (name !== (raw.name ?? null)) changed = true;
  const type: StorageArea["type"] =
    raw.type === "dry" ||
    raw.type === "cooler" ||
    raw.type === "freezer" ||
    raw.type === "cage" ||
    raw.type === "bar"
      ? raw.type
      : "custom";
  if (type !== (raw.type ?? "custom")) changed = true;
  const description = sanitizeString(raw.description);
  if (description !== (raw.description ?? null)) changed = true;
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = Array.from(
    new Set(
      tagsRaw
        .map((tag) => sanitizeString(tag))
        .filter((tag): tag is string => !!tag),
    ),
  );
  if (!arrayShallowEqual(tags, tagsRaw as string[] | undefined)) changed = true;
  const layout = sanitizeLayoutRect(raw.layout);
  if (
    (raw.layout && !layout) ||
    (layout && JSON.stringify(layout) !== JSON.stringify(raw.layout))
  )
    changed = true;
  const locked = typeof raw.locked === "boolean" ? raw.locked : null;
  if ((raw.locked ?? null) !== locked) changed = true;
  const area: StorageArea = {
    id: idValue,
    outletId,
    name,
    type,
    description,
    tags: tags.length ? tags : null,
    layout,
    locked,
  };
  return { area, changed };
};
const normalizeStorageRack = (
  input: unknown,
  areaIds: Set<string>,
): { rack: StorageRack | null; changed: boolean } => {
  if (!input || typeof input !== "object") return { rack: null, changed: true };
  const raw = input as Partial<StorageRack> & AnyRecord;
  let changed = false;
  const areaId =
    typeof raw.areaId === "string" && raw.areaId ? raw.areaId : null;
  if (!areaId || !areaIds.has(areaId)) return { rack: null, changed: true };
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const name = sanitizeString(raw.name) ?? "Rack";
  if (name !== (raw.name ?? null)) changed = true;
  const type: StorageRack["type"] =
    raw.type === "rack" ||
    raw.type === "shelf" ||
    raw.type === "cage" ||
    raw.type === "freezer_basket"
      ? raw.type
      : "custom";
  if (type !== (raw.type ?? "custom")) changed = true;
  const levels = sanitizePositiveInt(raw.levels, 4, 1, 20);
  if (
    levels !== (typeof raw.levels === "number" ? raw.levels : (raw.levels ?? 4))
  )
    changed = true;
  const columns = sanitizePositiveInt(raw.columns, 4, 1, 20);
  if (
    columns !==
    (typeof raw.columns === "number" ? raw.columns : (raw.columns ?? 4))
  )
    changed = true;
  const notes = sanitizeString(raw.notes);
  if (notes !== (raw.notes ?? null)) changed = true;
  const layout = sanitizeLayoutBox(raw.layout);
  if (
    (raw.layout && !layout) ||
    (layout && JSON.stringify(layout) !== JSON.stringify(raw.layout))
  )
    changed = true;
  const rack: StorageRack = {
    id: idValue,
    areaId,
    name,
    type,
    levels,
    columns,
    notes,
    layout,
  };
  return { rack, changed };
};
const normalizeStorageBin = (
  input: unknown,
  rackIds: Set<string>,
): { bin: StorageBin | null; changed: boolean } => {
  if (!input || typeof input !== "object") return { bin: null, changed: true };
  const raw = input as Partial<StorageBin> & AnyRecord;
  let changed = false;
  const rackId =
    typeof raw.rackId === "string" && raw.rackId ? raw.rackId : null;
  if (!rackId || !rackIds.has(rackId)) return { bin: null, changed: true };
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const level = sanitizePositiveInt(raw.level, 1, 1, 20);
  if (level !== (typeof raw.level === "number" ? raw.level : (raw.level ?? 1)))
    changed = true;
  const column = sanitizePositiveInt(raw.column, 1, 1, 20);
  if (
    column !== (typeof raw.column === "number" ? raw.column : (raw.column ?? 1))
  )
    changed = true;
  const label = sanitizeString(raw.label) ?? `L${level}C${column}`;
  if (label !== (raw.label ?? null)) changed = true;
  const capacity = sanitizeString(raw.capacity);
  if (capacity !== (raw.capacity ?? null)) changed = true;
  const itemId =
    typeof raw.itemId === "string" && raw.itemId ? raw.itemId : null;
  if (itemId !== (raw.itemId ?? null)) changed = true;
  const parQtyNumber =
    raw.parQty !== undefined ? sanitizeNumber(raw.parQty) : null;
  const parQty =
    parQtyNumber != null && parQtyNumber >= 0 ? parQtyNumber : null;
  if (raw.parQty !== undefined && parQty !== parQtyNumber) changed = true;
  const notes = sanitizeString(raw.notes);
  if (notes !== (raw.notes ?? null)) changed = true;
  const layout = sanitizeLayoutRect(raw.layout);
  if (
    (raw.layout && !layout) ||
    (layout && JSON.stringify(layout) !== JSON.stringify(raw.layout))
  )
    changed = true;
  const bin: StorageBin = {
    id: idValue,
    rackId,
    level,
    column,
    label,
    capacity,
    itemId,
    parQty,
    notes,
    layout,
  };
  return { bin, changed };
};
const rackGridKey = (level: number, column: number) => `${level}:${column}`;
const normalizeQuickCountTemplate = (
  input: unknown,
  validItemIds: Set<string>,
  validBinIds: Set<string>,
): { template: QuickCountTemplate | null; changed: boolean } => {
  if (!input || typeof input !== "object")
    return { template: null, changed: true };
  const raw = input as Partial<QuickCountTemplate> & AnyRecord;
  let changed = false;
  const outletId =
    typeof raw.outletId === "string" && raw.outletId ? raw.outletId : null;
  if (!outletId) return { template: null, changed: true };
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const name = sanitizeString(raw.name) ?? "Quick Count";
  if (name !== (raw.name ?? null)) changed = true;
  const cadence: QuickCountTemplate["cadence"] =
    raw.cadence === "daily" ||
    raw.cadence === "weekly" ||
    raw.cadence === "monthly" ||
    raw.cadence === "event"
      ? raw.cadence
      : "weekly";
  if (cadence !== (raw.cadence ?? "weekly")) changed = true;
  const daysOfWeek =
    cadence === "daily"
      ? null
      : normalizeDaysOfWeek(raw.daysOfWeek ?? ["Mon", "Wed", "Fri"]);
  if (
    cadence !== "daily" &&
    !arrayShallowEqual(
      daysOfWeek ?? [],
      (raw.daysOfWeek as string[] | undefined) ?? [],
    )
  )
    changed = true;
  const notes = sanitizeString(raw.notes);
  if (notes !== (raw.notes ?? null)) changed = true;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const seenItems = new Set<string>();
  const items: QuickCountTemplate["items"] = [];
  for (const entry of itemsRaw) {
    if (!entry || typeof entry !== "object") {
      changed = true;
      continue;
    }
    const candidate = entry as unknown as AnyRecord;
    const itemId =
      typeof candidate.itemId === "string" && candidate.itemId
        ? candidate.itemId
        : null;
    if (!itemId || !validItemIds.has(itemId) || seenItems.has(itemId)) {
      changed = true;
      continue;
    }
    seenItems.add(itemId);
    const binId =
      typeof candidate.binId === "string" &&
      candidate.binId &&
      validBinIds.has(candidate.binId)
        ? candidate.binId
        : null;
    if (candidate.binId && !binId) changed = true;
    const parQty =
      candidate.parQty !== undefined && candidate.parQty !== null
        ? sanitizeNumber(candidate.parQty)
        : null;
    const normalizedPar = parQty != null && parQty >= 0 ? parQty : null;
    if (normalizedPar !== (candidate.parQty ?? null)) changed = true;
    items.push({ itemId, binId, parQty: normalizedPar });
  }
  if (items.length !== itemsRaw.length) changed = true;
  const lastRunAt = typeof raw.lastRunAt === "string" ? raw.lastRunAt : null;
  if (raw.lastRunAt !== undefined && raw.lastRunAt !== lastRunAt)
    changed = true;
  const template: QuickCountTemplate = {
    id: idValue,
    outletId,
    name,
    cadence,
    daysOfWeek,
    notes,
    items,
    lastRunAt,
  };
  return { template, changed };
};
export const inventoryStore = {
  listStorageAreas(): StorageArea[] {
    const raw = read(LS.storageAreas, [] as StorageArea[]);
    let changedAny = false;
    const normalized = raw
      .map((entry) => {
        const { area, changed } = normalizeStorageArea(entry);
        if (changed) changedAny = true;
        return area;
      })
      .filter((area): area is StorageArea => area !== null);
    if (changedAny) {
      write(LS.storageAreas, normalized);
    }
    return normalized;
  },
  saveStorageArea(area: StorageArea) {
    const { area: normalized } = normalizeStorageArea(area);
    if (!normalized) return;
    const list = this.listStorageAreas();
    const idx = list.findIndex((e) => e.id === normalized.id);
    if (idx >= 0) list[idx] = normalized;
    else list.unshift(normalized);
    write(LS.storageAreas, list);
    try {
      window.dispatchEvent(
        new CustomEvent(INVENTORY_LAYOUT_EVENT, { detail: normalized }),
      );
    } catch {}
  },
  removeStorageArea(areaId: string) {
    const areas = this.listStorageAreas();
    const filtered = areas.filter((e) => e.id !== areaId);
    write(LS.storageAreas, filtered);
  },
  listStorageRacks(): StorageRack[] {
    const areas = this.listStorageAreas();
    const areaIds = new Set(areas.map((a) => a.id));
    const raw = read(LS.storageRacks, [] as StorageRack[]);
    let changedAny = false;
    const normalized = raw
      .map((entry) => {
        const { rack, changed } = normalizeStorageRack(entry, areaIds);
        if (changed) changedAny = true;
        return rack;
      })
      .filter((rack): rack is StorageRack => rack !== null);
    if (changedAny) {
      write(LS.storageRacks, normalized);
    }
    return normalized;
  },
  saveStorageRack(rack: StorageRack) {
    const areas = this.listStorageAreas();
    const areaIds = new Set(areas.map((a) => a.id));
    const { rack: normalized } = normalizeStorageRack(rack, areaIds);
    if (!normalized) return;
    const list = this.listStorageRacks();
    const idx = list.findIndex((e) => e.id === normalized.id);
    if (idx >= 0) list[idx] = normalized;
    else list.unshift(normalized);
    write(LS.storageRacks, list);
    try {
      window.dispatchEvent(
        new CustomEvent(INVENTORY_LAYOUT_EVENT, { detail: normalized }),
      );
    } catch {}
  },
  removeStorageRack(rackId: string) {
    const racks = this.listStorageRacks();
    const filtered = racks.filter((e) => e.id !== rackId);
    write(LS.storageRacks, filtered);
  },
  listStorageBins(): StorageBin[] {
    const racks = this.listStorageRacks();
    const rackIds = new Set(racks.map((r) => r.id));
    const raw = read(LS.storageBins, [] as StorageBin[]);
    let changedAny = false;
    const normalized = raw
      .map((entry) => {
        const { bin, changed } = normalizeStorageBin(entry, rackIds);
        if (changed) changedAny = true;
        return bin;
      })
      .filter((bin): bin is StorageBin => bin !== null);
    if (changedAny) {
      write(LS.storageBins, normalized);
    }
    return normalized;
  },
  saveStorageBin(bin: StorageBin) {
    const racks = this.listStorageRacks();
    const rackIds = new Set(racks.map((r) => r.id));
    const { bin: normalized } = normalizeStorageBin(bin, rackIds);
    if (!normalized) return;
    const list = this.listStorageBins();
    const idx = list.findIndex((e) => e.id === normalized.id);
    if (idx >= 0) list[idx] = normalized;
    else list.unshift(normalized);
    write(LS.storageBins, list);
  },
  removeStorageBin(binId: string) {
    const bins = this.listStorageBins();
    const filtered = bins.filter((e) => e.id !== binId);
    write(LS.storageBins, filtered);
  },
  listQuickCountTemplates(): QuickCountTemplate[] {
    const items = this.listItems();
    const bins = this.listStorageBins();
    const itemIds = new Set(items.map((i) => i.id));
    const binIds = new Set(bins.map((b) => b.id));
    const raw = read(LS.quickCountTemplates, [] as QuickCountTemplate[]);
    let changedAny = false;
    const normalized = raw
      .map((entry) => {
        const { template, changed } = normalizeQuickCountTemplate(
          entry,
          itemIds,
          binIds,
        );
        if (changed) changedAny = true;
        return template;
      })
      .filter((t): t is QuickCountTemplate => t !== null);
    if (changedAny) {
      write(LS.quickCountTemplates, normalized);
    }
    return normalized;
  },
  saveQuickCountTemplate(template: QuickCountTemplate) {
    const items = inventoryStore.listItems();
    const bins = this.listStorageBins();
    const itemIds = new Set(items.map((i) => i.id));
    const binIds = new Set(bins.map((b) => b.id));
    const { template: normalized } = normalizeQuickCountTemplate(
      template,
      itemIds,
      binIds,
    );
    if (!normalized) return;
    const list = this.listQuickCountTemplates();
    const idx = list.findIndex((t) => t.id === normalized.id);
    if (idx >= 0) list[idx] = normalized;
    else list.unshift(normalized);
    write(LS.quickCountTemplates, list);
    try {
      window.dispatchEvent(
        new CustomEvent(QUICK_COUNT_EVENT, { detail: normalized }),
      );
    } catch {}
  },
  removeQuickCountTemplate(templateId: string) {
    const templates = this.listQuickCountTemplates();
    const filtered = templates.filter((t) => t.id !== templateId);
    write(LS.quickCountTemplates, filtered);
  },
  listItems(): InventoryItem[] {
    const raw = read(LS.items, [] as InventoryItem[]);
    if (!raw.length) {
      const outlet = purchasingStore.ensureOutletByName("Main Kitchen");
      const seeded: InventoryItem[] = luccaSeedItems.map((seed) => {
        const vendor = purchasingStore.ensureVendorByName(seed.vendor);
        const base: InventoryItem = {
          id: id(),
          name: seed.name,
          outletId: outlet.id,
          standardUnit: null,
          categories: null,
          glCode: seed.glCode ?? null,
          glName: seed.glName ?? null,
          glGroupId: null,
          glManualOverride: false,
          glOverrideSourceId: null,
          purchaseUnits: [
            {
              vendorId: vendor.id,
              unit: seed.unit,
              pack: seed.pack ?? null,
              lastUnitPrice: seed.lastUnitPrice ?? null,
              sku: null,
            },
          ],
          storage: [],
          lastReceiptDate: seed.lastReceiptDate ?? new Date().toISOString(),
          departments: [],
          lots: [],
          history: [],
        };
        return enrichInventoryItem(base).item;
      });
      write(LS.items, seeded);
      return seeded;
    }
    let changedAny = false;
    const upgraded = raw.map((item) => {
      const { item: enriched, changed } = enrichInventoryItem(item);
      if (changed) changedAny = true;
      return enriched;
    });
    if (changedAny) {
      write(LS.items, upgraded);
    }
    return upgraded;
  },
  saveItem(item: InventoryItem) {
    const { item: enriched } = enrichInventoryItem(item);
    const list = read(LS.items, [] as InventoryItem[]);
    const idx = list.findIndex((x) => x.id === enriched.id);
    if (idx >= 0) list[idx] = enriched;
    else list.unshift(enriched);
    write(LS.items, list);
    try {
      window.dispatchEvent(
        new CustomEvent("echo:item:save", { detail: enriched }),
      );
    } catch {}
  },
  ensureItem(outletId: string, name: string): InventoryItem {
    const n = name.trim();
    const list = this.listItems();
    let it = list.find(
      (x) =>
        x.outletId === outletId && x.name.toLowerCase() === n.toLowerCase(),
    );
    if (!it) {
      const base: InventoryItem = {
        id: id(),
        name: n,
        outletId,
        standardUnit: null,
        categories: null,
        glCode: null,
        glName: null,
        glGroupId: null,
        glManualOverride: false,
        glOverrideSourceId: null,
        purchaseUnits: [],
        storage: [],
        departments: [],
        history: [],
        lastReceiptDate: null,
        lots: [],
      };
      const enriched = enrichInventoryItem(base).item;
      this.saveItem(enriched);
      it = enriched;
    }
    return it;
  },
  upsertItemFromReceipt(
    outletId: string | null | undefined,
    vendorId: string | null | undefined,
    line: { productName: string; qty: number; unit: string; totalCost: number },
    receiptId: string,
    date: string,
    pack: string | null = null,
  ) {
    if (!outletId) return;
    const it = this.ensureItem(outletId, line.productName);
    const unitPrice = line.qty ? line.totalCost / line.qty : null;
    const puIdx = it.purchaseUnits.findIndex(
      (p) => p.vendorId === (vendorId as any) && p.unit === line.unit,
    );
    if (puIdx >= 0) {
      it.purchaseUnits[puIdx].lastUnitPrice = unitPrice;
      if (pack) it.purchaseUnits[puIdx].pack = pack;
    } else {
      it.purchaseUnits.push({
        vendorId: vendorId as any,
        unit: line.unit,
        lastUnitPrice: unitPrice,
        sku: null,
        pack: pack || null,
      });
    }
    it.lastReceiptDate = date;
    it.history.unshift({
      id: id(),
      type: "receipt",
      date,
      qty: line.qty,
      unit: line.unit,
      referenceId: receiptId as any,
      notes: null,
    });
    this.saveItem(it as any);
  },
  listCounts(): CountSession[] {
    return read(LS.items + ":counts", [] as CountSession[]);
  },
  saveCount(c: CountSession) {
    const list = this.listCounts();
    const idx = list.findIndex((x) => x.id === c.id);
    if (idx >= 0) list[idx] = c;
    else list.unshift(c);
    write(LS.items + ":counts", list);
    try {
      window.dispatchEvent(new CustomEvent("echo:count:save", { detail: c }));
    } catch {}
  },
  applyCountSession(session: CountSession) {
    this.saveCount(session);
    const completedAt = session.completedAt ?? new Date().toISOString();
    const itemsById = new Map(
      this.listItems().map((item) => [
        item.id,
        {
          ...item,
          purchaseUnits: item.purchaseUnits.slice(),
          storage: item.storage.slice(),
          history: item.history.slice(),
        },
      ]),
    );
    const makeLocationKey = (
      outletId: string,
      name: string,
      bin?: string | null,
    ) =>
      `${outletId}:${name.toLowerCase().trim()}:${(bin || "").toLowerCase().trim()}`;
    for (const line of session.lines) {
      if (!line.itemId) continue;
      const item = itemsById.get(line.itemId);
      if (!item) continue;
      if (line.location) {
        const key = makeLocationKey(session.outletId, line.location, line.bin);
        const existing = item.storage.find(
          (loc) => makeLocationKey(loc.outletId, loc.name, loc.bin) === key,
        );
        if (!existing) {
          item.storage.push({
            outletId: session.outletId,
            name: line.location,
            bin: line.bin ?? null,
          });
        }
      }
      item.history.unshift({
        id: id(),
        type: "count",
        date: completedAt,
        qty: line.qty,
        unit: line.unit,
        referenceId: session.id,
        location: line.location ?? null,
        bin: line.bin ?? null,
        notes: null,
      });
      itemsById.set(item.id, item);
    }
    for (const item of itemsById.values()) {
      this.saveItem(item as any);
    }
  },
  getParSuggestions(outletId: string): ParSuggestion[] {
    const items = this.listItems();
    const suggestions: ParSuggestion[] = [];
    for (const item of items) {
      const binItems = this.listStorageBins().filter(
        (bin) => bin.itemId === item.id,
      );
      for (const bin of binItems) {
        const storedLocation = item.storage.find(
          (s) => s.outletId === outletId,
        );
        if (storedLocation && (bin.parQty ?? 0) > 0) {
          suggestions.push({
            itemId: item.id,
            itemName: item.name,
            currentQty: 0,
            parQty: bin.parQty ?? 0,
            location: storedLocation.name,
            bin: bin.label,
            variance: bin.parQty ?? 0,
          });
        }
      }
    }
    return suggestions;
  },
};
const removeBinsOutsideRack = (rack: StorageRack) => {
  const bins = inventoryStore.listStorageBins();
  const toRemove = bins.filter(
    (bin) =>
      bin.rackId === rack.id &&
      (bin.level > rack.levels || bin.column > rack.columns),
  );
  if (!toRemove.length) return false;
  for (const bin of toRemove) {
    inventoryStore.removeStorageBin(bin.id);
  }
  return true;
};
const fillMissingBinsForRack = (rack: StorageRack, template?: string) => {
  const bins = inventoryStore
    .listStorageBins()
    .filter((bin) => bin.rackId === rack.id);
  const existing = new Set(
    bins.map((bin) => rackGridKey(bin.level, bin.column)),
  );
  let created = false;
  for (let level = 1; level <= rack.levels; level += 1) {
    for (let column = 1; column <= rack.columns; column += 1) {
      const key = rackGridKey(level, column);
      if (existing.has(key)) continue;
      const label = template
        ? template
            .replace(/\{level\}/g, String(level))
            .replace(/\{column\}/g, String(column))
        : `L${level}C${column}`;
      inventoryStore.saveStorageBin({
        id: id(),
        rackId: rack.id,
        level,
        column,
        label,
        capacity: null,
        itemId: null,
        parQty: null,
        notes: null,
      });
      created = true;
    }
  }
  return created;
};
function enrichInventoryItem(base: InventoryItem): {
  item: InventoryItem;
  changed: boolean;
} {
  let changed = false;
  const item = { ...base };
  if (!item.id) {
    item.id = id();
    changed = true;
  }
  if (!item.glCode && item.name) {
    const derived = deriveGLForName(item.name);
    if (derived) {
      item.glCode = derived.code;
      item.glName = derived.name;
      changed = true;
    }
  }
  return { item, changed };
}
