import type { Item } from "@/pages/Planner";
function makeId() {
  return Math.random().toString(36).slice(2, 9);
}
export const TEMPLATES: { name: string; items: Item[] }[] = [
  {
    name: "Banquet A",
    items: [
      {
        id: makeId(),
        type: "stage",
        x: 10,
        y: 5,
        width: 12,
        height: 8,
        rotation: 0,
        label: "Stage",
        seats: 0,
        color: "#0ea5e9",
      },
      ...Array.from({ length: 8 }).map((_, i) => ({
        id: makeId(),
        type: "round60" as const,
        x: 10 + (i % 4) * 10,
        y: 15 + Math.floor(i / 4) * 10,
        width: 5,
        height: 5,
        rotation: 0,
        label: 'Round 60"',
        seats: 8,
        color: "#8b5cf6",
      })),
    ],
  },
  {
    name: "Classroom B",
    items: [
      ...Array.from({ length: 5 }).flatMap((_, r) =>
        Array.from({ length: 6 }).map((__, c) => ({
          id: makeId(),
          type: "rect8x30" as const,
          x: 8 + c * 9,
          y: 10 + r * 5,
          width: 8,
          height: 2.5,
          rotation: 0,
          label: "8×30",
          seats: 2,
          color: "#22c55e",
        })),
      ),
      {
        id: makeId(),
        type: "stage",
        x: 10,
        y: 5,
        width: 16,
        height: 8,
        rotation: 0,
        label: "Stage",
        seats: 0,
        color: "#0ea5e9",
      },
    ],
  },
  {
    name: "Theater C",
    items: [
      ...Array.from({ length: 12 }).flatMap((_, r) =>
        Array.from({ length: 14 }).map((__, c) => ({
          id: makeId(),
          type: "chair" as const,
          x: 8 + c * 2.5,
          y: 10 + r * 2.5,
          width: 1.5,
          height: 1.5,
          rotation: 0,
          label: "Chair",
          seats: 1,
          color: "#111827",
        })),
      ),
      {
        id: makeId(),
        type: "stage",
        x: 8 + 6 * 2.5,
        y: 7,
        width: 16,
        height: 6,
        rotation: 0,
        label: "Stage",
        seats: 0,
        color: "#0ea5e9",
      },
    ],
  },
];
