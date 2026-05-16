import { classifyItem } from "../../shared/taxonomy";
import { classify as classifyGLRule } from "./gl-rules";

export type GLInfo = { code: string; name: string };

const TIER3_GL_MAP: Record<string, GLInfo> = {
  Beer: { code: "5110-Beer", name: "Beer" },
  Wine: { code: "5111-Wine", name: "Wine" },
  Spirits: { code: "5112-Spirits", name: "Spirits" },
  Mixers: { code: "5113-Mixers", name: "Mixers" },
  Juices: { code: "5114-Juices", name: "Juices & Non-Alcoholic" },
  Concentrates: { code: "5115-Concentrates", name: "Concentrates" },
  "Coffee & Tea": { code: "5114-Juices", name: "Coffee & Tea" },
};

const TIER1_GL_FALLBACK: Record<string, GLInfo> = {
  Produce: { code: "5010-Produce", name: "Produce" },
  Protein: { code: "5030-Proteins", name: "Proteins" },
  Seafood: { code: "5050-Seafood", name: "Seafood" },
  Dairy: { code: "5060-Dairy", name: "Dairy & Alternatives" },
  "Dry Goods": { code: "5070-DryGoods", name: "Dry Goods & Pantry" },
  Bakery: { code: "5120-Prepared", name: "Prepared & Processed" },
  Frozen: { code: "5200-Frozen", name: "Frozen Foods" },
  Beverage: { code: "5114-Juices", name: "Beverages" },
  "Non-Food": { code: "5030.110", name: "Paper & Disposables" },
};

export function glFromCategories(categories?: any | null): GLInfo | null {
  if (!categories) return null;
  if (categories.tier3 && TIER3_GL_MAP[categories.tier3])
    return TIER3_GL_MAP[categories.tier3];
  if (categories.tier1 && TIER1_GL_FALLBACK[categories.tier1])
    return TIER1_GL_FALLBACK[categories.tier1];
  return null;
}

export function deriveGLForName(name: string): {
  taxonomy: any;
  gl: GLInfo | null;
} {
  const taxonomy = classifyItem(name);
  const ruleMatch = classifyGLRule(name);
  if (ruleMatch) {
    return { taxonomy, gl: { code: ruleMatch.code, name: ruleMatch.name } };
  }
  return { taxonomy, gl: glFromCategories(taxonomy?.categories) };
}
