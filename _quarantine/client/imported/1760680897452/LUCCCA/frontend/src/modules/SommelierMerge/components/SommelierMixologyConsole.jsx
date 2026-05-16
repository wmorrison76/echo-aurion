/**
 * SommelierMixologyConsole.jsx
 * Side-by-side console: top wine matches + suggested cocktails + Mixology flavor wheel.
 */
import React from "react";
import { usePairingSession } from "../hooks/usePairingSession.js";
import { MixologyWheel } from "../../MixologyWheel/index.js";

export default function SommelierMixologyConsole({ catalog={}, opening={} }){
  const { food, setFood, ranked, cocktails } = usePairingSession({ catalog, opening, limit:5 });

  return (
    <div className="sommelier-merge grid gap-4" style={{gridTemplateColumns:"1fr 1fr"}}>
      <section className="p-4 rounded-2xl border border-white/10">
        <h3 className="font-semibold mb-2">Food Profile</h3>
        <div className="grid gap-2" style={{gridTemplateColumns:"repeat(6, minmax(0,1fr))"}}>
          {["salt","fat","spice","acid","sweet","umami"].map(key=> (
            <label key={key} className="text-xs">
              {key}: <input type="range" min="0" max="4" value={food[key]} onChange={e=>setFood(f=>({...f,[key]:Number(e.target.value)}))}/>
              <span className="ml-2">{food[key]}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <h4 className="font-medium text-sm mb-1">Top Wines</h4>
          <ol className="text-sm grid gap-1">
            {ranked.map(({wine, score})=> (
              <li key={wine.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                <span>{wine.id.replace(/_/g," ")}</span>
                <span className="opacity-80">{score}/100</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-3">
          <h4 className="font-medium text-sm mb-1">Suggested Cocktails</h4>
          <ul className="text-sm grid gap-1">
            {cocktails.map((c,i)=> (
              <li key={i} className="p-2 rounded bg-white/5">
                <div className="opacity-80 text-xs mb-1">{c.wineId.replace(/_/g," ")}</div>
                {c.cocktail ? (
                  <div className="flex items-center justify-between">
                    <span>{c.cocktail.recipe.map(x=>x.name).join(" + ")}</span>
                    <span className="opacity-80">{c.cocktail.abv.toFixed(1)}% ABV • ${c.cocktail.cost.toFixed(2)}</span>
                  </div>
                ) : <em className="opacity-60">No cocktail suggestion</em>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="p-4 rounded-2xl border border-white/10">
        <h3 className="font-semibold mb-2">Flavor Navigator</h3>
        <MixologyWheel onSelect={(cat)=>console.log("wheel.select", cat)} />
      </section>
    </div>
  );
}
