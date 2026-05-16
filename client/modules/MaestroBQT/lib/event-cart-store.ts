import { id as makeId } from "@/modules/PurchasingReceiving/client/lib/store";

export type EventCartItem = {
  id: string;
  itemId?: string | null;
  itemName: string;
  requiredQty: number;
  unit: string;
  receivedQty: number;
  stagedQty: number;
  loadedQty: number;
  sources?: Array<{ recipeId?: string; menuPath?: string }>;
};

export type EventCart = {
  id: string;
  beoId: string;
  eventId: string;
  outletId?: string | null;
  updatedAt: string;
  items: EventCartItem[];
};

const CART_KEY = "maestro.event.carts.v1";

const readAll = (): EventCart[] => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (carts: EventCart[]) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(carts));
  } catch {
    // ignore write errors
  }
};

export const listEventCarts = () => readAll();

export const getEventCart = (beoId: string): EventCart | null => {
  return readAll().find((cart) => cart.beoId === beoId) ?? null;
};

export const upsertEventCart = (cart: EventCart): EventCart => {
  const carts = readAll();
  const idx = carts.findIndex((entry) => entry.id === cart.id);
  const next = { ...cart, updatedAt: new Date().toISOString() };
  if (idx >= 0) carts[idx] = next;
  else carts.unshift(next);
  writeAll(carts);
  return next;
};

export const seedEventCart = ({
  beoId,
  eventId,
  outletId,
  items,
}: {
  beoId: string;
  eventId: string;
  outletId?: string | null;
  items: Array<
    Pick<
      EventCartItem,
      "itemId" | "itemName" | "requiredQty" | "unit" | "sources"
    >
  >;
}): EventCart => {
  const existing = getEventCart(beoId);
  if (existing) {
    const merged = mergeCartItems(existing.items, items);
    return upsertEventCart({ ...existing, items: merged });
  }
  const cart: EventCart = {
    id: `cart-${makeId()}`,
    beoId,
    eventId,
    outletId: outletId ?? null,
    updatedAt: new Date().toISOString(),
    items: items.map((item) => ({
      id: `cart-item-${makeId()}`,
      itemId: item.itemId ?? null,
      itemName: item.itemName,
      requiredQty: item.requiredQty,
      unit: item.unit,
      receivedQty: 0,
      stagedQty: 0,
      loadedQty: 0,
      sources: item.sources ?? [],
    })),
  };
  return upsertEventCart(cart);
};

const mergeCartItems = (
  existing: EventCartItem[],
  incoming: Array<
    Pick<
      EventCartItem,
      "itemId" | "itemName" | "requiredQty" | "unit" | "sources"
    >
  >,
) => {
  const merged = existing.map((item) => ({ ...item }));
  incoming.forEach((next) => {
    const key = (next.itemId || next.itemName).toLowerCase();
    const match = merged.find(
      (item) => (item.itemId || item.itemName).toLowerCase() === key,
    );
    if (match) {
      match.requiredQty += next.requiredQty;
      match.sources = [...(match.sources || []), ...(next.sources || [])];
    } else {
      merged.push({
        id: `cart-item-${makeId()}`,
        itemId: next.itemId ?? null,
        itemName: next.itemName,
        requiredQty: next.requiredQty,
        unit: next.unit,
        receivedQty: 0,
        stagedQty: 0,
        loadedQty: 0,
        sources: next.sources ?? [],
      });
    }
  });
  return merged;
};

export const recordCartReceipt = ({
  beoId,
  itemId,
  itemName,
  qty,
}: {
  beoId: string;
  itemId?: string | null;
  itemName: string;
  qty: number;
}) => {
  const cart = getEventCart(beoId);
  if (!cart) return null;
  const key = (itemId || itemName).toLowerCase();
  const item = cart.items.find(
    (entry) => (entry.itemId || entry.itemName).toLowerCase() === key,
  );
  if (!item) return null;
  item.receivedQty += qty;
  return upsertEventCart(cart);
};

export const stageCartItem = ({
  beoId,
  itemId,
  qty,
}: {
  beoId: string;
  itemId: string;
  qty: number;
}) => {
  const cart = getEventCart(beoId);
  if (!cart) return null;
  const item = cart.items.find((entry) => entry.id === itemId);
  if (!item) return null;
  const remaining = Math.max(0, item.requiredQty - item.stagedQty);
  const increment = Math.min(remaining, qty);
  item.stagedQty += increment;
  return upsertEventCart(cart);
};

export const loadCartItem = ({
  beoId,
  itemId,
  qty,
}: {
  beoId: string;
  itemId: string;
  qty: number;
}) => {
  const cart = getEventCart(beoId);
  if (!cart) return null;
  const item = cart.items.find((entry) => entry.id === itemId);
  if (!item) return null;
  const remaining = Math.max(0, item.stagedQty - item.loadedQty);
  const increment = Math.min(remaining, qty);
  item.loadedQty += increment;
  return upsertEventCart(cart);
};
