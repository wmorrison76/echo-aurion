import React from "react";

export default function NutritionLabel({ data, servings, perServing }: { data: any; servings: number; perServing: boolean }) {
  if (!data) return null;
  const base = perServing && servings > 0 ? 1 / servings : 1;
  const fmt = (n: any) => typeof n === 'number' ? (n * base).toFixed(1) : n;
  const calories = fmt((data.calories as number) || (data?.totalNutrients?.ENERC_KCAL?.quantity as number) || 0);
  const fat = fmt(data?.totalNutrients?.FAT?.quantity || 0);
  const carbs = fmt(data?.totalNutrients?.CHOCDF?.quantity || 0);
  const protein = fmt(data?.totalNutrients?.PROCNT?.quantity || 0);
  const breakdown = Array.isArray((data as any)?.breakdown) ? (data as any).breakdown as any[] : [];
  const baseN = (x:number)=> perServing && servings>0 ? x/servings : x;
  // FDA reference values for 2,000 calorie diet
  const DV = { kcal: 2000, fat: 78, carbs: 275, protein: 50 };
  const pct = (val:number, ref:number)=> Math.round((Math.max(0,val)/ref)*100);
  const allZero = Number(calories) === 0 && Number(fat) === 0 && Number(carbs) === 0 && Number(protein) === 0;
  return (
    <div className="flex gap-4 items-start">
      <div className="border p-3 rounded-lg w-72 bg-white text-black">
        <div className="text-2xl font-extrabold border-b pb-1">Nutrition Facts</div>
        <div className="mt-2 text-sm">Calories <span className="float-right font-semibold">{calories}</span></div>
        <div className="mt-2 text-sm">Fat <span className="float-right">{fat} g • {pct(baseN(Number(data?.totalNutrients?.FAT?.quantity||0)), DV.fat)}%</span></div>
        <div className="mt-1 text-sm">Carbs <span className="float-right">{carbs} g • {pct(baseN(Number(data?.totalNutrients?.CHOCDF?.quantity||0)), DV.carbs)}%</span></div>
        <div className="mt-1 text-sm">Protein <span className="float-right">{protein} g • {pct(baseN(Number(data?.totalNutrients?.PROCNT?.quantity||0)), DV.protein)}%</span></div>
        <div className="mt-3 text-[10px] text-gray-600">% Daily Value based on a 2,000 calorie diet. Totals scaled {perServing? 'per serving' : 'for whole recipe'}.</div>
        {allZero && (<div className="mt-2 text-[10px] text-red-600">No measurable quantities detected. Add units (e.g., oz, cup) or include amounts in the ingredient text.</div>)}
      </div>
      {breakdown.length>0 && (
        <div className="text-xs bg-white text-black rounded-lg border p-3 max-h-64 overflow-auto w-72">
          <div className="font-semibold mb-2">Ingredient Breakdown</div>
          <table className="w-full text-[11px]">
            <thead><tr className="text-gray-600"><th className="text-left">Item</th><th className="text-right">g</th><th className="text-right">kcal</th><th className="text-right">F</th><th className="text-right">C</th><th className="text-right">P</th></tr></thead>
            <tbody>
              {breakdown.map((b:any,i:number)=> (
                <tr key={i}><td className="pr-2 truncate max-w-[8rem]">{b.item}</td><td className="text-right">{(b.grams||0).toFixed(0)}</td><td className="text-right">{(b.kcal||0).toFixed(1)}</td><td className="text-right">{(b.fat||0).toFixed(1)}</td><td className="text-right">{(b.carbs||0).toFixed(1)}</td><td className="text-right">{(b.protein||0).toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
