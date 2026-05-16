import type { Database } from "../types/database";
type LayoutItem = Database["public"]["Tables"]["layout_items"]["Row"];
export interface LayoutTemplate {
  name: string;
  description: string;
  roomWidth: number;
  roomDepth: number;
  generateItems: () => Omit<
    LayoutItem,
    "id" | "layout_id" | "item_id" | "created_at" | "updated_at"
  >[];
}
const templates: LayoutTemplate[] = [
  {
    name: "Classroom Style",
    description: "Rows of tables with chairs facing forward",
    roomWidth: 50,
    roomDepth: 60,
    generateItems: () => {
      const items: Omit<
        LayoutItem,
        "id" | "layout_id" | "item_id" | "created_at" | "updated_at"
      >[] = [];
      const tableWidth = 6;
      const tableDepth = 2.5;
      const rowSpacing = 4;
      const colSpacing = 7;
      const rows = 4;
      const cols = 5;
      let idx = 0;
      const startX = 5;
      const startY = 5;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          items.push({
            item_type: "rect8x30",
            x_ft: startX + col * colSpacing,
            y_ft: startY + row * rowSpacing,
            width_ft: tableWidth,
            depth_ft: tableDepth,
            rotation_degrees: 0,
            seats: 4,
            label: `Table ${idx + 1}`,
            color: "#f59e0b",
          });
          idx++;
        }
      }
      return items;
    },
  },
  {
    name: "Banquet Round",
    description: "Round tables in a grid pattern",
    roomWidth: 60,
    roomDepth: 70,
    generateItems: () => {
      const items: Omit<
        LayoutItem,
        "id" | "layout_id" | "item_id" | "created_at" | "updated_at"
      >[] = [];
      const tableSize = 6;
      const spacing = 9;
      const rows = 4;
      const cols = 4;
      let idx = 0;
      const startX = 6;
      const startY = 7;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          items.push({
            item_type: "round72",
            x_ft: startX + col * spacing,
            y_ft: startY + row * spacing,
            width_ft: tableSize,
            depth_ft: tableSize,
            rotation_degrees: 0,
            seats: 8,
            label: `Table ${idx + 1}`,
            color: "#f59e0b",
          });
          idx++;
        }
      }
      return items;
    },
  },
  {
    name: "Reception Style",
    description: "Scattered high-top tables with cocktail setup",
    roomWidth: 50,
    roomDepth: 60,
    generateItems: () => {
      const items: Omit<
        LayoutItem,
        "id" | "layout_id" | "item_id" | "created_at" | "updated_at"
      >[] = [];
      const positions = [
        { x: 8, y: 8 },
        { x: 20, y: 10 },
        { x: 32, y: 7 },
        { x: 42, y: 12 },
        { x: 10, y: 25 },
        { x: 22, y: 28 },
        { x: 35, y: 25 },
        { x: 8, y: 42 },
        { x: 20, y: 45 },
        { x: 32, y: 42 },
        { x: 42, y: 48 },
      ];
      positions.forEach((pos, idx) => {
        items.push({
          item_type: "cocktail",
          x_ft: pos.x,
          y_ft: pos.y,
          width_ft: 3,
          depth_ft: 3,
          rotation_degrees: 0,
          seats: 2,
          label: `Cocktail Table ${idx + 1}`,
          color: "#06b6d4",
        });
      });
      items.push({
        item_type: "bar",
        x_ft: 25,
        y_ft: 56,
        width_ft: 12,
        depth_ft: 2.5,
        rotation_degrees: 0,
        seats: 0,
        label: "Bar",
        color: "#ef4444",
      });
      return items;
    },
  },
  {
    name: "U-Shape Conference",
    description: "U-shaped table arrangement with center seating",
    roomWidth: 50,
    roomDepth: 40,
    generateItems: () => {
      const items: Omit<
        LayoutItem,
        "id" | "layout_id" | "item_id" | "created_at" | "updated_at"
      >[] = [];
      items.push({
        item_type: "rect8x30",
        x_ft: 8,
        y_ft: 8,
        width_ft: 6,
        depth_ft: 3,
        rotation_degrees: 0,
        seats: 4,
        label: "Top Left",
        color: "#8b5cf6",
      });
      items.push({
        item_type: "rect8x30",
        x_ft: 22,
        y_ft: 8,
        width_ft: 6,
        depth_ft: 3,
        rotation_degrees: 0,
        seats: 4,
        label: "Top Right",
        color: "#8b5cf6",
      });
      items.push({
        item_type: "rect8x30",
        x_ft: 36,
        y_ft: 8,
        width_ft: 6,
        depth_ft: 3,
        rotation_degrees: 0,
        seats: 4,
        label: "Top Leg",
        color: "#8b5cf6",
      });
      items.push({
        item_type: "rect8x30",
        x_ft: 8,
        y_ft: 20,
        width_ft: 3,
        depth_ft: 6,
        rotation_degrees: 90,
        seats: 2,
        label: "Left Leg",
        color: "#8b5cf6",
      });
      items.push({
        item_type: "rect8x30",
        x_ft: 39,
        y_ft: 20,
        width_ft: 3,
        depth_ft: 6,
        rotation_degrees: 90,
        seats: 2,
        label: "Right Leg",
        color: "#8b5cf6",
      });
      return items;
    },
  },
  {
    name: "Buffet Service",
    description: "Buffet line with dining tables arranged around",
    roomWidth: 70,
    roomDepth: 60,
    generateItems: () => {
      const items: Omit<
        LayoutItem,
        "id" | "layout_id" | "item_id" | "created_at" | "updated_at"
      >[] = [];
      items.push({
        item_type: "buffet",
        x_ft: 5,
        y_ft: 10,
        width_ft: 20,
        depth_ft: 2.5,
        rotation_degrees: 0,
        seats: 0,
        label: "Main Buffet",
        color: "#ec4899",
      });
      items.push({
        item_type: "buffet",
        x_ft: 5,
        y_ft: 30,
        width_ft: 20,
        depth_ft: 2.5,
        rotation_degrees: 0,
        seats: 0,
        label: "Dessert Buffet",
        color: "#ec4899",
      });
      const tablePositions = [
        { x: 30, y: 10 },
        { x: 45, y: 10 },
        { x: 60, y: 10 },
        { x: 30, y: 25 },
        { x: 45, y: 25 },
        { x: 60, y: 25 },
        { x: 30, y: 40 },
        { x: 45, y: 40 },
        { x: 60, y: 40 },
      ];
      tablePositions.forEach((pos, idx) => {
        items.push({
          item_type: "round72",
          x_ft: pos.x,
          y_ft: pos.y,
          width_ft: 6,
          depth_ft: 6,
          rotation_degrees: 0,
          seats: 8,
          label: `Table ${idx + 1}`,
          color: "#f59e0b",
        });
      });
      return items;
    },
  },
];
export function getLayoutTemplates(): LayoutTemplate[] {
  return templates;
}
export function getTemplateByName(name: string): LayoutTemplate | undefined {
  return templates.find((t) => t.name === name);
}
export function applyTemplate(
  template: LayoutTemplate,
  layoutId: string,
): Omit<LayoutItem, "created_at" | "updated_at">[] {
  const items = template.generateItems();
  return items.map((item) => ({
    ...item,
    id: Math.random().toString(36).slice(2, 9),
    layout_id: layoutId,
    item_id: Math.random().toString(36).slice(2, 9),
  }));
}
