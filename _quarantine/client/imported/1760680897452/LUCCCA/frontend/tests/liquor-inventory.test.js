import assert from 'assert';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function load(rel){
  const p = path.resolve(__dirname, '../src/modules/EchoMixologyAI/LiquorInventoryLogic.js');
  return await import(pathToFileURL(p).href);
}

(async ()=>{
  const { createLedger, reorderRecommendations } = await load('../src/modules/EchoMixologyAI/LiquorInventoryLogic.js');
  const catalog = {
    gin_750: { sku:'gin_750', name:'Gin', size_ml:750, abv:40, cost: 20 },
    vermouth_750: { sku:'vermouth_750', name:'Vermouth', size_ml:750, abv:16, cost: 10 },
  };
  const opening = { gin_750: 400, vermouth_750: 700 };
  const ledger = createLedger(catalog, opening);
  ledger.move({ sku:'gin_750', change_ml: -50, reason:'sale' });
  assert(ledger.level('gin_750') === 350, 'move should update level');
  const cost = ledger.costFor([{ sku:'gin_750', volume_ml:50 }]);
  assert(cost > 1 && cost < 5, 'costFor should compute sane value');

  const recs = reorderRecommendations(ledger.snapshot().levels, catalog, {gin_750:500, vermouth_750:300}, 7, {gin_750:100, vermouth_750:20});
  assert(Array.isArray(recs) && recs.length>=1, 'reorderRecommendations should return actionable list');
  console.log('liquor-inventory.test.js PASS');
})().catch(e=>{ console.error('liquor-inventory.test.js FAIL', e); process.exit(1); });
