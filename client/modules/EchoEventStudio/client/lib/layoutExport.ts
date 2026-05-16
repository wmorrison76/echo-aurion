import type { Database } from "../types/database";
type Venue = Database["public"]["Tables"]["venues"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Layout = Database["public"]["Tables"]["layouts"]["Row"];
type LayoutItem = Database["public"]["Tables"]["layout_items"]["Row"];
export interface ExportData {
  version: string;
  exportDate: string;
  venue: Venue;
  room: Room;
  layout: Layout;
  items: LayoutItem[];
}
export function exportLayoutAsJSON(
  venue: Venue | null,
  room: Room | null,
  layout: Layout | null,
  items: LayoutItem[],
): void {
  if (!venue || !room || !layout) {
    throw new Error("Venue, room, and layout are required");
  }
  const data: ExportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    venue,
    room,
    layout,
    items,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${venue.name}-${room.name}-${layout.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export function exportLayoutAsCSV(roomName: string, items: LayoutItem[]): void {
  const headers = [
    "Item Type",
    "Label",
    "X (ft)",
    "Y (ft)",
    "Width (ft)",
    "Depth (ft)",
    "Rotation (°)",
    "Seats",
    "Color",
  ];
  const rows = items.map((item) => [
    item.item_type,
    item.label || "",
    item.x_ft,
    item.y_ft,
    item.width_ft || 3,
    item.depth_ft || 3,
    item.rotation_degrees || 0,
    item.seats || 0,
    item.color || "",
  ]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          return str.includes(",") ? `"${str}"` : str;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${roomName}-layout.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
export function importLayoutFromJSON(jsonString: string): {
  venue: Venue;
  room: Room;
  layout: Layout;
  items: LayoutItem[];
} {
  const data: ExportData = JSON.parse(jsonString);
  if (!data.venue || !data.room || !data.layout || !data.items) {
    throw new Error("Invalid layout file format");
  }
  return {
    venue: data.venue,
    room: data.room,
    layout: data.layout,
    items: data.items,
  };
}
export function exportAsPDF(
  roomName: string,
  items: LayoutItem[],
  room: Room,
): void {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = 20;
  canvas.width = (room.width_ft || 50) * scale;
  canvas.height = (room.depth_ft || 50) * scale;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f59e0b";
  items.forEach((item) => {
    const x = item.x_ft * scale;
    const y = item.y_ft * scale;
    const w = (item.width_ft || 3) * scale;
    const h = (item.depth_ft || 3) * scale;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#999999";
    ctx.strokeRect(x, y, w, h);
    if (item.label) {
      ctx.fillStyle = "#000000";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(item.label, x + w / 2, y + h / 2);
    }
  });
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${roomName}-layout.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
