#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs';

const API_KEY = process.env.BUILDER_API_KEY;
const SPACE_ID = process.env.BUILDER_SPACE_ID;
if (!API_KEY || !SPACE_ID) {
  console.error('Please set BUILDER_API_KEY and BUILDER_SPACE_ID');
  process.exit(1);
}

const models = JSON.parse(fs.readFileSync('./builderio.models.json','utf8'));
const sample = JSON.parse(fs.readFileSync('./builderio.entries.sample.json','utf8'));

const baseUrl = 'https://builder.io/api/v3';
const headers = { 'Content-Type': 'application/json' };

async function http(method, path, body){
  const res = await fetch(`${baseUrl}${path}?apiKey=${API_KEY}&spaceId=${SPACE_ID}`, {
    method, headers, body: body? JSON.stringify(body): undefined,
  });
  const json = await res.json().catch(()=> ({}));
  if(!res.ok){ throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`); }
  return json;
}

async function createModel(model){
  try {
    const res = await http('POST','/models', { name:model.name, kind:model.kind||'data', public:!!model.public, fields:model.fields });
    console.log('Created model:', model.name);
    return res;
  } catch(err){
    if(String(err.message).includes('already exists')){ console.log('Model exists:', model.name); return null; }
    console.warn('Model create error (continuing):', model.name, String(err.message));
    return null;
  }
}

async function ensureModels(){
  for(const m of models){ await createModel(m); }
}

async function createEntry(modelName, entry){
  try {
    await http('POST','/content', { model: modelName, data: entry, published: true });
    console.log('  ↳ Added entry to', modelName);
  } catch(err){
    console.warn('  ↳ Entry error (continuing):', modelName, String(err.message));
  }
}

async function seedEntries(){
  for(const [modelName, entries] of Object.entries(sample)){
    if(!Array.isArray(entries)) continue;
    for(const e of entries){ await createEntry(modelName, e); }
  }
}

(async()=>{
  console.log('Seeding to Builder.io Space:', SPACE_ID);
  await ensureModels();
  await seedEntries();
  console.log('✅ Seed complete.');
})();
