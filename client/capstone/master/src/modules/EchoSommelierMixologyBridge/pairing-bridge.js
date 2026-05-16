/**
 * Suggest cocktail pairings for a wine and compute approximate cost via Mixology ledger.
 */
import { blendABV } from "../EchoMixologyAI/lib/abv.js";
import { createLedger } from "../EchoMixologyAI/LiquorInventoryLogic.js";
import grapeDb from "../EchoSommelier/lib/grape-db.json";

export function suggestCocktailPair(wineId, catalog, opening){
  const wine = grapeDb[wineId];
  if (!wine) return null;
  // Simple rule: for red wines, suggest gin/vermouth martini; white, suggest gin+tonic.
  const isRed = ["cabernet_sauvignon","pinot_noir","syrah_shiraz"].includes(wineId);
  const recipe = isRed ? [
    { name:"Gin", abv:40, volume_ml:45, sku:"gin_750" },
    { name:"Vermouth", abv:16, volume_ml:15, sku:"vermouth_750" },
  ]:[
    { name:"Gin", abv:40, volume_ml:45, sku:"gin_750" },
    { name:"Tonic Water", abv:0, volume_ml:120, sku:"tonic_can" },
  ];
  const { abv, volume_ml } = blendABV(recipe);
  const ledger = createLedger(catalog, opening);
  const cost = ledger.costFor(recipe);
  return { wineId, recipe, abv, volume_ml, cost };
}
