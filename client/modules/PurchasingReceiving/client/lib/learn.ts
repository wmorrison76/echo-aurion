export interface LearnedCorrection {
  vendor: string;
  fromName: string;
  toName?: string;
  unit?: string;
  packSize?: string | null;
}
const KEY = "echo_learn";
function read(): LearnedCorrection[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LearnedCorrection[]) : [];
  } catch {
    return [];
  }
}
function write(list: LearnedCorrection[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
function norm(s?: string | null) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}
export const LearningStore = {
  list(): LearnedCorrection[] {
    return read();
  },
  record(c: LearnedCorrection) {
    const list = read();
    const keyVendor = norm(c.vendor);
    const keyFrom = norm(c.fromName);
    const idx = list.findIndex(
      (x) => norm(x.vendor) === keyVendor && norm(x.fromName) === keyFrom,
    );
    if (idx >= 0) list[idx] = { ...list[idx], ...c };
    else list.unshift(c);
    write(list);
  },
  applyToRawItems(rawItems: any[], vendor: string) {
    const list = read();
    const v = norm(vendor);
    const mappings = list.filter((x) => norm(x.vendor) === v);
    return rawItems.map((r) => {
      const key = norm(r.productName) || norm(r.rawText);
      const m = mappings.find((x) => norm(x.fromName) === key);
      if (!m) return r;
      return {
        ...r,
        productName: m.toName || r.productName,
        unit: m.unit || r.unit,
        packSize: m.packSize ?? r.packSize,
      };
    });
  },
};
