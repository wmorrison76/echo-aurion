import { useMemo, useState } from "react";
import grapeDb from "../../EchoSommelier/lib/grape-db.json";
import * as Pairing from "../../EchoSommelier/lib/pairing.js";
import { suggestCocktailPair } from "../../EchoSommelierMixologyBridge/pairing-bridge.js";

export function usePairingSession({ catalog, opening, limit=5 }={}){
  const wines = useMemo(()=> Object.entries(grapeDb).map(([id, w])=>({ id, ...w })), []);
  const [food, setFood] = useState({ salt:2, fat:2, spice:1, acid:1, sweet:0, umami:1, intensity:2, aromas:["citrus"] });
  const ranked = useMemo(()=> Pairing.rank(food, wines).slice(0, limit), [food, wines, limit]);
  const cocktails = useMemo(()=> {
    return ranked.map(r => ({ wineId:r.wine.id, cocktail: suggestCocktailPair(r.wine.id, catalog||{}, opening||{}) }));
  }, [ranked, catalog, opening]);

  return { food, setFood, ranked, cocktails, wines };
}

export default usePairingSession;
