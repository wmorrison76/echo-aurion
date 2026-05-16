/**
 * Validators for liquor data schema.
 */
export function validateEntry(e) {
  if (!e) return { ok:false, reason:"empty" };
  if (typeof e.abv!=="number" || e.abv<0 || e.abv>100) return { ok:false, reason:"invalid abv" };
  if (!e.origin) return { ok:false, reason:"missing origin" };
  return { ok:true };
}
