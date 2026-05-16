// ABV utility tests (Node ESM-compatible)
import assert from 'assert';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadModule(rel){
  const p = path.resolve(__dirname, '../src/modules/EchoMixologyAI/lib/abv.js');
  return await import(pathToFileURL(p).href);
}

(async ()=>{
  const ABV = await loadModule('../src/modules/EchoMixologyAI/lib/abv.js');
  const res = ABV.blendABV([
    { name:'Gin', abv:40, volume_ml:50 },
    { name:'Vermouth', abv:16, volume_ml:10 }
  ]);
  assert(Math.abs(res.abv - 35.714) < 0.5, 'blendABV should compute expected ABV');
  assert.equal(ABV.proofToABV(100), 50);
  assert.equal(ABV.abvToProof(47.3), 94.6);
  const d = ABV.dilute(40, 100, 25);
  assert(d > 30 && d < 33, 'dilution should drop ABV reasonably');
  console.log('abv.test.js PASS');
})().catch(e=>{ console.error('abv.test.js FAIL', e); process.exit(1); });
