const CAN_SIZES_OZ: Record<string, number> = {
  "#10": 109,
  "#5": 56,
  "#303": 16,
  "#300": 14.5,
  "#2.5": 29,
};
const OZ_PER_GAL = 128;
const KEG_GALLONS: Record<string, number> = {
  "1/6": 5.16,
  "1/4": 7.75,
  "1/2": 15.5,
};
function toOz(qty: number, unit: string) {
  const u = unit.toLowerCase();
  if (u === "oz") return qty;
  if (u === "lb" || u === "pound" || u === "lbs") return qty * 16;
  if (u === "g") return qty / 28.3495;
  if (u === "kg") return (qty * 1000) / 28.3495;
  if (u === "ml") return qty / 29.5735;
  if (u === "l" || u === "liter" || u === "litre")
    return (qty * 1000) / 29.5735;
  if (u === "gal" || u === "gallon") return qty * OZ_PER_GAL;
  return qty; // default to each
}
type PackParseResult = { totalOz?: number; display?: string };
type PackHandler = {
  name: string;
  regex: RegExp;
  process(match: RegExpMatchArray, original: string): PackParseResult | null;
};
const PACK_HANDLERS: PackHandler[] = [
  {
    name: "case_x_size_uom",
    regex: /^\s*(\d+)\s*[x/]\s*(\d+(?:\.\d+)?)\s*(oz|lb|g|kg|ml|l|gal)\b/i,
    process: (match) => {
      const packs = Number(match[1]);
      const size = Number(match[2]);
      const unit = match[3];
      return {
        totalOz: packs * toOz(size, unit),
        display: `${packs} x ${size}${unit}`,
      };
    },
  },
  {
    name: "can_number",
    regex: /^\s*(\d+)\s*#(10|5|2\.5|303)\s*(?:cans?)?\b/i,
    process: (match) => {
      const packs = Number(match[1] || 1);
      const sizeKey = `#${match[2]}`;
      const oz = CAN_SIZES_OZ[sizeKey];
      if (!oz) return null;
      return { totalOz: packs * oz, display: `${packs} ${sizeKey}` };
    },
  },
  {
    name: "each_with_weight",
    regex: /^\s*(\d+)\s*ea\s*(\d+(?:\.\d+)?)\s*(lb|oz|kg|g|gal|l|ml)\b/i,
    process: (match) => {
      const count = Number(match[1]);
      const size = Number(match[2]);
      const unit = match[3];
      return {
        totalOz: count * toOz(size, unit),
        display: `${count} ea ${size}${unit}`,
      };
    },
  },
  {
    name: "simple_weight_or_volume",
    regex: /^\s*(\d+(?:\.\d+)?)\s*(lb|oz|kg|g|gal|l|ml)\b/i,
    process: (match) => {
      const qty = Number(match[1]);
      const unit = match[2];
      return { totalOz: toOz(qty, unit), display: `${qty}${unit}` };
    },
  },
  {
    name: "count_only",
    regex: /^\s*(\d+)\s*(?:ea|each|ct|count)\b/i,
    process: (match, original) => ({
      display: match[0].trim() || original.trim(),
    }),
  },
  {
    name: "beer_packs",
    regex: /^\s*(\d+)\s*[x/]\s*(\d+(?:\.\d+)?)\s*(oz|ml)\s*(cans?|bottles?)\b/i,
    process: (match) => {
      const packs = Number(match[1]);
      const size = Number(match[2]);
      const unit = match[3];
      return { totalOz: packs * toOz(size, unit), display: match[0].trim() };
    },
  },
  {
    name: "kegs",
    regex: /^\s*(1\/6|1\/4|1\/2)\s*keg\b/i,
    process: (match) => {
      const fraction = match[1];
      const gallons = KEG_GALLONS[fraction];
      if (!gallons) return null;
      return { totalOz: gallons * OZ_PER_GAL, display: `${fraction} keg` };
    },
  },
  {
    name: "wine_case_750",
    regex: /^\s*(\d+)\s*x?\s*750\s*ml\b/i,
    process: (match) => {
      const bottles = Number(match[1]);
      return {
        totalOz: bottles * toOz(750, "ml"),
        display: `${bottles} x 750ml`,
      };
    },
  },
  {
    name: "spirits_liters",
    regex: /^\s*(\d+)\s*x?\s*(1\.75|1|0\.75)\s*l\b/i,
    process: (match) => {
      const count = Number(match[1]);
      const liters = Number(match[2]);
      return {
        totalOz: count * toOz(liters, "l"),
        display: `${count} x ${liters}L`,
      };
    },
  },
  {
    name: "juice_cartons",
    regex: /^\s*(\d+)\s*[x/]\s*(64|32)\s*oz\b/i,
    process: (match) => {
      const packs = Number(match[1]);
      const size = Number(match[2]);
      return { totalOz: packs * toOz(size, "oz"), display: match[0].trim() };
    },
  },
  {
    name: "concentrates_gal",
    regex:
      /^\s*(\d+)\s*[x/]\s*(\d+(?:\.\d+)?)\s*(gal|l)\s*(?:conc|concentrate)?\b/i,
    process: (match) => {
      const packs = Number(match[1]);
      const size = Number(match[2]);
      const unit = match[3];
      return { totalOz: packs * toOz(size, unit), display: match[0].trim() };
    },
  },
  {
    name: "pouch_pack",
    regex: /^\s*(\d+)\s*pouch(?:es)?\s*(\d+(?:\.\d+)?)\s*(oz|g|ml)\b/i,
    process: (match) => {
      const count = Number(match[1]);
      const size = Number(match[2]);
      const unit = match[3];
      return { totalOz: count * toOz(size, unit), display: match[0].trim() };
    },
  },
  {
    name: "squeeze_bottles",
    regex:
      /^\s*(\d+)\s*(?:sq|squeeze)\s*bottles?\s*(\d+(?:\.\d+)?)\s*(oz|ml)\b/i,
    process: (match) => {
      const count = Number(match[1]);
      const size = Number(match[2]);
      const unit = match[3];
      return { totalOz: count * toOz(size, unit), display: match[0].trim() };
    },
  },
  {
    name: "jug_gal",
    regex: /^\s*(\d+)\s*[x/]\s*(\d+(?:\.\d+)?)\s*gal\b/i,
    process: (match) => {
      const packs = Number(match[1]);
      const gallons = Number(match[2]);
      return {
        totalOz: packs * toOz(gallons, "gal"),
        display: match[0].trim(),
      };
    },
  },
  {
    name: "jib_tote",
    regex: /\b(jib|tote|container)\b\s*(\d+(?:\.\d+)?)\s*gal\b/i,
    process: (match) => {
      const gallons = Number(match[2]);
      return { totalOz: toOz(gallons, "gal"), display: match[0].trim() };
    },
  },
  {
    name: "bag_in_box",
    regex: /^\s*(\d+)\s*[x/]\s*(\d+(?:\.\d+)?)\s*lb\s*bag\b/i,
    process: (match) => {
      const packs = Number(match[1]);
      const pounds = Number(match[2]);
      return { totalOz: packs * toOz(pounds, "lb"), display: match[0].trim() };
    },
  },
  {
    name: "catch_weight",
    regex: /\b(?:avg|~)\s*(\d+(?:\.\d+)?)\s*lb\/ea\b/i,
    process: (match, original) => {
      const avgLb = Number(match[1]);
      return {
        totalOz: toOz(avgLb, "lb"),
        display: `${avgLb} lb per each (${original.trim()})`,
      };
    },
  },
  {
    name: "case_piece_count",
    regex: /^\s*(\d+)\s*cs\s*(\d+)\s*ea\b/i,
    process: (match, original) => ({
      display: match[0].trim() || original.trim(),
    }),
  },
];
export function parsePackString(text?: string | null): PackParseResult {
  const raw = (text || "").trim();
  if (!raw) return {};
  const normalized = raw.replace(/\s+/g, "").trim();
  for (const handler of PACK_HANDLERS) {
    const match = normalized.match(handler.regex);
    if (match) {
      const result = handler.process(match, normalized);
      if (result) {
        return {
          totalOz: result.totalOz,
          display: result.display ?? normalized,
        };
      }
    }
  }
  return { display: normalized };
}
export function pricePerOz(price: number, pack?: string | null) {
  const p = parsePackString(pack);
  if (!p.totalOz || p.totalOz <= 0) return null;
  return price / p.totalOz;
}
export function pricePerGram(price: number, pack?: string | null) {
  const perOz = pricePerOz(price, pack);
  if (perOz == null) return null;
  return perOz / 28.3495;
}
const G_PER_TSP: Record<string, number> = {
  sesame: 2.7,
  poppy: 2.6,
  "sunflower kernel": 3.0,
  pumpkin: 2.5,
  flax: 2.3,
  chia: 2.9,
  hemp: 2.5,
  nigella: 2.1,
  mustard: 2.9,
  coriander: 2.0,
  cumin: 2.1,
  fennel: 2.0,
  caraway: 2.0,
  fenugreek: 3.8,
  paprika: 2.3,
  cinnamon: 2.6,
  "garlic powder": 3.1,
  "onion powder": 2.4,
  pepper: 2.3,
  turmeric: 2.2,
};
export function pricePerTsp(name: string, price: number, pack?: string | null) {
  const gpt = Object.entries(G_PER_TSP).find(([k]) =>
    name.toLowerCase().includes(k),
  )?.[1];
  if (!gpt) return null;
  const perGram = pricePerGram(price, pack);
  if (perGram == null) return null;
  return gpt * perGram;
}
