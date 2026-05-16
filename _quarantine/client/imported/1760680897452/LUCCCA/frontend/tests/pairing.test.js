import assert from 'assert';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadPairing(){
  const p = path.resolve(__dirname, '../src/modules/EchoSommelier/lib/pairing.js');
  return await import(pathToFileURL(p).href);
}
async function loadGrapes(){
  const p = path.resolve(__dirname, '../src/modules/EchoSommelier/lib/grape-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

(async ()=>{
  const Pairing = await loadPairing();
  const grapes = await loadGrapes();
  const wines = Object.entries(grapes).map(([id,w])=>({id, ...w}));
  const food = { salt:2, fat:2, spice:1, acid:1, sweet:0, umami:1, intensity:2, aromas:['citrus'] };
  const ranked = Pairing.rank(food, wines);
  assert(ranked.length === wines.length, 'rank should return same length');
  assert(ranked[0].score >= ranked.at(-1).score, 'rank should sort desc');
  console.log('pairing.test.js PASS');
})().catch(e=>{ console.error('pairing.test.js FAIL', e); process.exit(1); });
