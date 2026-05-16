import type { Item, ItemType } from "@/pages/Planner";

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

export function generateSerpentine(
  start: { x: number; y: number },
  count = 6,
  segmentW = 6,
  segmentH = 3,
  gap = 1,
): Item[] {
  const items: Item[] = [];

  for (let i = 0; i < count; i++) {
    const offset = i % 2 === 0 ? 0 : segmentH + gap; /* zig-zag vertically */
    items.push({
      id: makeId(),
      type: "serpentine" as ItemType,
      x: start.x + i * (segmentW + gap),
      y: start.y + offset,
      width: segmentW,
      height: segmentH,
      rotation: 0,
      label: "Serpentine",
      seats: 0,
      color: "#f59e0b",
    });
  }

  return items;
}
