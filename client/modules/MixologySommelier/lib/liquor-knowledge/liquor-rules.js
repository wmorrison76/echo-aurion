/**
 * Liquor AI rules — heuristics for substitution and legality checks.
 */
const DB = {
  gin: { type:"spirit", abv:40, family:"juniper" },
  vodka:{ type:"spirit", abv:40, family:"neutral" },
  rum:{ type:"spirit", abv:40, family:"sugarcane" },
  whiskey:{ type:"spirit", abv:40, family:"grain" },
  tequila:{ type:"spirit", abv:40, family:"agave" }
};

export function suggestSubstitute(base) {
  const b = DB[base];
  if (!b) return [];
  return Object.keys(DB).filter(k => DB[k].family===b.family && k!==base);
}

export function checkLegality(sku, country="US") {
  if (country==="US" && DB[sku]?.abv>75) return { ok:false, reason:"ABV too high" };
  return { ok:true };
}

export default { suggestSubstitute, checkLegality };
