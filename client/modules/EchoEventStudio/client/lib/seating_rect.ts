import type { Item, ItemType } from "@/pages/Planner";
function makeId() {
  return Math.random().toString(36).slice(2, 9);
}
export function generateChairsClassroom(table: Item): Item[] {
  // Chairs on one long edge (front) const chairs: Item[] = []; const spacing = 2; // ft between chairs const margin = 1; // ft from ends const count = Math.max(1, Math.floor((table.width - margin * 2) / spacing)); const start = -((count - 1) * spacing) / 2; for (let i = 0; i < count; i++) { const offset = start + i * spacing; const angle = (table.rotation * Math.PI) / 180; const dx = offset * Math.cos(angle); const dy = offset * Math.sin(angle); const normalX = Math.cos(angle + Math.PI / 2); const normalY = Math.sin(angle + Math.PI / 2); const x = table.x + dx + normalX * (table.height / 2 + 1); const y = table.y + dy + normalY * (table.height / 2 + 1); chairs.push({ id: makeId(), type:"chair" as ItemType, x, y, width: 1.5, height: 1.5, rotation: table.rotation, label:"Chair", seats: 1, color:"#111827", }); } return chairs;
}
export function generateChairsBanquet(table: Item): Item[] {
  // Chairs on both long edges const list: Item[] = []; list.push(...generateChairsClassroom(table)); const flip: Item = { ...table, rotation: table.rotation + 180 }; list.push(...generateChairsClassroom(flip)); return list;
}
