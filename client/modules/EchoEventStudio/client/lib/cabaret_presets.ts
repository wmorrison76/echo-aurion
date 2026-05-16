import type { Item, ItemType } from "@/pages/Planner";
import { generateRoundChairsCrescent } from "@/lib/seating";
function makeId() {
  return Math.random().toString(36).slice(2, 9);
}
export function createCabaret54(center: { x: number; y: number }): Item[] {
  const table: Item = {
    id: makeId(),
    type: "round60" as ItemType,
    x: center.x,
    y: center.y,
    width: 4.5,
    height: 4.5,
    rotation: 0,
    label: 'Cabaret 54"',
    seats: 5,
    color: "#8b5cf6",
  };
  const chairs = generateRoundChairsCrescent(table).slice(0, 5);
  return [table, ...(chairs as Item[])];
}
export function createCabaret60(center: { x: number; y: number }): Item[] {
  const table: Item = {
    id: makeId(),
    type: "round60" as ItemType,
    x: center.x,
    y: center.y,
    width: 5,
    height: 5,
    rotation: 0,
    label: 'Cabaret 60"',
    seats: 6,
    color: "#8b5cf6",
  };
  const chairs = generateRoundChairsCrescent(table).slice(0, 6);
  return [table, ...(chairs as Item[])];
}
export function createCabaret66(center: { x: number; y: number }): Item[] {
  const table: Item = {
    id: makeId(),
    type: "round72" as ItemType,
    x: center.x,
    y: center.y,
    width: 5.5,
    height: 5.5,
    rotation: 0,
    label: 'Cabaret 66"',
    seats: 7,
    color: "#8b5cf6",
  };
  const chairs = generateRoundChairsCrescent(table).slice(0, 7);
  return [table, ...(chairs as Item[])];
}
export function createCabaret72(center: { x: number; y: number }): Item[] {
  const table: Item = {
    id: makeId(),
    type: "round72" as ItemType,
    x: center.x,
    y: center.y,
    width: 6,
    height: 6,
    rotation: 0,
    label: 'Cabaret 72"',
    seats: 8,
    color: "#8b5cf6",
  };
  const chairs = generateRoundChairsCrescent(table).slice(0, 8);
  return [table, ...(chairs as Item[])];
}
