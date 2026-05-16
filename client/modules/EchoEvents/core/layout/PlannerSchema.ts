export type AssetKind =
  | "roundTable"
  | "rectTable"
  | "chair"
  | "bar"
  | "buffet"
  | "serpentine"
  | "stage"
  | "zone";
export interface PlannerItem {
  id: string;
  kind: AssetKind;
  label?: string; // world units in meters x: number; y: number; z?: number; rotation?: number; // size for parametric primitives (fallback if model missing) w?: number; d?: number; h?: number; r?: number; // model path (optional GLB override) modelUrl?: string; meta?: Record<string, any>;
}
export interface PlannerScene {
  version: string;
  room: { name: string; w: number; d: number; h?: number };
  items: PlannerItem[];
  camera?: {
    x: number;
    y: number;
    z: number;
    tx?: number;
    ty?: number;
    tz?: number;
  };
  lighting?: { ambient?: number; point?: number };
}
export function isPlannerScene(value: unknown): value is PlannerScene {
  if (!value || typeof value !== "object") {
    return false;
  }
  const scene = value as Partial<PlannerScene> & {
    room?: Partial<PlannerScene["room"]>;
  };
  if (
    !scene.room ||
    typeof scene.room.w !== "number" ||
    typeof scene.room.d !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(scene.items)) {
    return false;
  }
  return true;
}
