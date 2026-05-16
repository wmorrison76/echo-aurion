import type { OpsTask } from "@shared/types/ops-gantt";

export type LinkedObjectKind =
  | "event"
  | "beo"
  | "menu_item"
  | "recipe"
  | "ingredient"
  | "purchase_order"
  | "receiving"
  | "production_sheet"
  | "station"
  | "staff";

export type LinkedObjectRef = {
  kind: LinkedObjectKind;
  id: string;
  label: string;
};

function short(id: string, n = 6): string {
  return String(id || "").slice(0, n);
}

export function buildLinkedObjectsForTask(params: {
  eventId: string;
  task: OpsTask;
}): LinkedObjectRef[] {
  const { eventId, task } = params;
  const out: LinkedObjectRef[] = [];

  out.push({ kind: "event", id: eventId, label: `Event ${short(eventId)}` });
  out.push({
    kind: "beo",
    id: `beo-${eventId}`,
    label: `BEO ${short(eventId)}`,
  });

  // Demo mapping rules (replace with real integrations later).
  const dept = String(task.department || "");
  const scope = String(task.scope || "");

  if (dept === "Culinary" || dept === "Pastry" || dept === "Bar") {
    out.push({
      kind: "recipe",
      id: `recipe-${short(task.taskId)}`,
      label: `Recipe ${short(task.taskId)}`,
    });
    out.push({
      kind: "ingredient",
      id: `ing-${short(task.taskId)}-a`,
      label: "Ingredient A",
    });
    out.push({
      kind: "ingredient",
      id: `ing-${short(task.taskId)}-b`,
      label: "Ingredient B",
    });
    out.push({
      kind: "menu_item",
      id: `menu-${short(task.taskId)}`,
      label: `Menu item ${short(task.taskId)}`,
    });
  }

  if (dept === "Purchasing") {
    out.push({
      kind: "purchase_order",
      id: `po-${short(task.taskId)}`,
      label: `PO ${short(task.taskId)}`,
    });
  }

  if (dept === "Receiving") {
    out.push({
      kind: "receiving",
      id: `recv-${short(task.taskId)}`,
      label: `Receiving ${short(task.taskId)}`,
    });
  }

  if (scope === "production") {
    out.push({
      kind: "production_sheet",
      id: `ps-${short(eventId)}`,
      label: `Production Sheet ${short(eventId)}`,
    });
    out.push({
      kind: "station",
      id: `station-hot`,
      label: "Station: Hot line",
    });
    out.push({
      kind: "staff",
      id: `staff-${short(task.taskId)}`,
      label: "Assigned staff",
    });
  }

  return out;
}
