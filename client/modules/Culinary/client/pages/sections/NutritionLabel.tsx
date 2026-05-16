type MacroTotals = {
  calories: number;
  fat: number;
  saturatedFat: number;
  transFat: number;
  carbs: number;
  fiber: number;
  sugars: number;
  protein: number;
  sodium: number;
};

type NutritionAnalysis = {
  totals: MacroTotals;
  perServing: MacroTotals;
  per100g: MacroTotals;
  breakdown: Array<{
    original: string;
    normalized: string;
    matchKey: string | null;
    confidence: number;
    grams: number;
    macros: MacroTotals;
  }>;
  coverage: number;
  unknown: Array<{ original: string; suggestion: string }>;
};

type NutritionLabelProps = {
  data: NutritionAnalysis | null;
  servings: number;
  perServing: boolean;
};

const DAILY_VALUES: Record<keyof MacroTotals, number | null> = {
  calories: 2000,
  fat: 78,
  saturatedFat: 20,
  transFat: null,
  carbs: 275,
  fiber: 28,
  sugars: 50,
  protein: 50,
  sodium: 2300,
};

const LABEL_ROWS: Array<{ label: string; field: keyof MacroTotals; unit: "g" | "mg" }> = [
  { label: "Total Fat", field: "fat", unit: "g" },
  { label: "Saturated Fat", field: "saturatedFat", unit: "g" },
  { label: "Trans Fat", field: "transFat", unit: "g" },
  { label: "Total Carbohydrate", field: "carbs", unit: "g" },
  { label: "Dietary Fiber", field: "fiber", unit: "g" },
  { label: "Total Sugars", field: "sugars", unit: "g" },
  { label: "Protein", field: "protein", unit: "g" },
  { label: "Sodium", field: "sodium", unit: "mg" },
];

const formatValue = (value: number, unit: "g" | "mg") => {
  if (!Number.isFinite(value)) return "0";
  if (unit === "mg") return `${Math.round(value)} ${unit}`;
  if (value >= 10) return `${value.toFixed(1)} ${unit}`;
  return `${value.toFixed(2)} ${unit}`;
};

const computeDailyValue = (field: keyof MacroTotals, value: number) => {
  const dv = DAILY_VALUES[field];
  if (!dv || dv <= 0) return "";
  const percent = Math.round((Math.max(value, 0) / dv) * 100);
  return `${percent}%`;
};

export default function NutritionLabel({ data, servings, perServing }: NutritionLabelProps) {
  if (!data) return null;
  const portion = perServing && servings > 0 ? data.perServing : data.totals;
  const coveragePct = Math.round((data.coverage || 0) * 100);
  const noData =
    portion.calories === 0 &&
    portion.fat === 0 &&
    portion.carbs === 0 &&
    portion.protein === 0;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="w-[290px] rounded-2xl border border-white/40 bg-white p-4 text-slate-900 shadow-sm dark:border-[#c8a97e]/25 dark:bg-slate-950 dark:text-amber-50">
        <div className="border-b border-black pb-2 text-3xl font-black tracking-tight dark:border-[#c8a97e]/80">
          Nutrition Facts
        </div>
        <div className="mt-2 flex items-center justify-between text-sm font-medium">
          <span>{perServing ? "Per serving" : "Whole recipe"}</span>
          <span>
            Servings: {servings > 0 ? servings : "—"}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between text-base font-semibold">
          <span>Calories</span>
          <span className="text-3xl font-black">
            {Math.round(portion.calories || 0)}
          </span>
        </div>
        <div className="mt-3 border-t border-black pt-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          % Daily Value*
        </div>
        <div className="mt-2 space-y-1 text-sm">
          {LABEL_ROWS.map((row) => {
            const value = row.field === "sodium" ? portion[row.field] : portion[row.field];
            const formatted = formatValue(value, row.unit);
            const percent = computeDailyValue(row.field, row.field === "sodium" ? value : value);
            return (
              <div key={row.field} className="flex items-center justify-between">
                <span>{row.label}</span>
                <span className="font-medium">
                  {formatted}
                  {percent ? <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-[#c8a97e]">{percent}</span> : null}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          * Percent Daily Values are based on a 2,000 calorie diet. Adjust serving counts to match packaging requirements.
        </div>
        <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600 dark:bg-[#c8a97e]/30/30 dark:text-[#c8a97e]/80">
          Database coverage: <strong>{coveragePct}%</strong>
          {coveragePct < 95 ? " – review unknown ingredients below." : ""}
        </div>
        {noData ? (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
            No measurable quantities detected. Include units (oz, cup, g) for each ingredient or specify exact weights.
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-3">
        {data.unknown.length ? (
          <div className="rounded-xl border border-amber-400/50 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-300/40 dark:bg-amber-900/30 dark:text-amber-50">
            <div className="font-semibold uppercase tracking-[0.18em]">Unknown ingredients</div>
            <ul className="mt-2 space-y-1">
              {data.unknown.map((missing) => (
                <li key={missing.original}>
                  <span className="font-medium">{missing.original}</span>
                  {missing.suggestion ? (
                    <span className="text-muted-foreground"> — try mapping to <code>{missing.suggestion}</code></span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.breakdown.length ? (
          <div className="rounded-xl border border-white/40 bg-white/80 p-3 text-xs text-slate-800 shadow-sm dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-amber-50">
            <div className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Ingredient contribution
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full table-fixed border-separate border-spacing-y-1">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="w-6/12 text-left">Ingredient</th>
                    <th className="w-2/12 text-right">g</th>
                    <th className="w-2/12 text-right">kcal</th>
                    <th className="w-2/12 text-right">Protein</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((row, index) => (
                    <tr
                      key={`${row.original}-${index}`}
                      className={`rounded-lg ${row.matchKey ? "bg-white/70 dark:bg-[#c8a97e]/30/30" : "bg-red-50/70 text-red-800 dark:bg-red-900/30 dark:text-red-100"}`}
                    >
                      <td className="truncate px-2 py-1 align-middle">
                        <div className="font-medium">{row.original}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {row.matchKey ? `${row.matchKey}${row.confidence < 0.6 ? " (low confidence)" : ""}` : "Unmapped"}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-right align-middle">{Math.round(row.grams)}</td>
                      <td className="px-2 py-1 text-right align-middle">{Math.round(row.macros.calories)}</td>
                      <td className="px-2 py-1 text-right align-middle">{row.macros.protein.toFixed(1)} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
