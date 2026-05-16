// Shared types for CakeViewer module (iter151)
export interface Filling {
  name: string;
  color: string;
  height: number;
  cost_per_serving_usd?: number;
  // iter154 A++ · entremet element kind drives photoreal material + texture
  kind?: "sponge" | "genoise" | "joconde" | "dacquoise" | "streusel" | "feuilletine"
       | "praline" | "financier" | "cremeux" | "curd" | "gelee" | "compote"
       | "mousse" | "ganache" | "glaze";
  // optional aesthetic/flavor metadata
  flavor?: string;
  aeration?: number;        // 0–1 · mousse airiness
  inclusions?: string[];    // e.g., ["raspberry pieces", "praline crumbs"]
}

export interface Topper {
  kind: "bride" | "groom" | "monogram" | "number" | "candle" | "flower" | "figurine"
      | "crown" | "horn" | "star" | "dinosaur" | "tower_spire" | "balloon";
  label?: string;
  color: string;
  x: number;
  z: number;
  scale: number;
}

// iter153 A3 · flower arrangements applied at session level
export interface FlowerDeco {
  arrangement_id: string;   // matches CakeFlowers.FLOWER_ARRANGEMENTS[].id
  placement: "top" | "cascade" | "base" | "tier";
  tier_index?: number;      // for "tier" placement
  palette_override?: string[];
  scale?: number;
}

export interface Tier {
  height: number;
  radius: number;
  color: string;
  roughness: number;
  metalness: number;
  texture_url?: string | null;
  texture_repeat_x: number;
  texture_repeat_y: number;
  wrap_style: string;
  fillings?: Filling[];
  tilt_x: number;
  tilt_z: number;
  offset_x: number;
  offset_z: number;
  finish: "buttercream" | "fondant" | "drip" | "mirror" | "naked" | "semi-naked";
  // iter153 · tier shape library
  shape?: "round" | "square" | "heart" | "hex" | "sheet" | "mad_hatter" | "topsy_turvy";
  taper?: number;   // 0–0.6 · Mad Hatter top-vs-bottom ratio (1-taper)
  wave?: number;    // 0–0.25 · Topsy-turvy wave amplitude
  // iter153 A2 · Piping
  piping?: Array<{
    kind: "bead" | "shell" | "rope" | "rosette" | "basket_weave" | "drop_strings" | "cornelli_lace" | "ruffle" | "leaf" | "star" | "scroll" | "zigzag";
    band: "top" | "bottom" | "middle";
    color: string;
    scale?: number;
    density?: number;
  }>;
}

export interface Intake {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  event_date?: string;
  event_type?: string;
  guest_count?: number;
  slice_size?: "party" | "standard" | "wedding";
  allergens?: string[];
  theme?: string;
  inspiration_image_url?: string;
  beo_number?: string;
  delivery_required?: boolean;
  delivery_address?: string;
  delivery_time?: string;
  delivery_notes?: string;
  price_quote_usd?: number;
}

// Design tokens
export const ACCENT = "#c8a97e";
export const BORDER = "rgba(255,255,255,0.08)";
export const SURFACE = "rgba(255,255,255,0.025)";
export const GREEN = "#22c55e";
export const RED = "#ef4444";
export const AMBER = "#f59e0b";

export const DEFAULT_FILLINGS: Filling[] = [
  { name: "Sponge", color: "#f5d9a7", height: 0.18, cost_per_serving_usd: 0.55 },
  { name: "Raspberry", color: "#c73a5b", height: 0.04, cost_per_serving_usd: 0.22 },
  { name: "Sponge", color: "#f5d9a7", height: 0.18, cost_per_serving_usd: 0.55 },
  { name: "Vanilla Bean Cream", color: "#fff2d8", height: 0.06, cost_per_serving_usd: 0.40 },
  { name: "Sponge", color: "#f5d9a7", height: 0.14, cost_per_serving_usd: 0.55 },
];

export const blankTier = (overrides: Partial<Tier> = {}): Tier => ({
  height: 0.55,
  radius: 1.0,
  color: "#fff8f2",
  roughness: 0.7,
  metalness: 0,
  texture_repeat_x: 1,
  texture_repeat_y: 1,
  wrap_style: "cylinder",
  fillings: DEFAULT_FILLINGS,
  tilt_x: 0,
  tilt_z: 0,
  offset_x: 0,
  offset_z: 0,
  finish: "buttercream",
  shape: "round",
  taper: 0,
  wave: 0,
  ...overrides,
});

export const fmt = (n: any, d = 0) =>
  typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n ?? "—";
