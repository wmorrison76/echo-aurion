#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const CHAIN_PATH = path.resolve(
  process.cwd(),
  "server/localdata/spine-chain.v1.json",
);
const TRACE_PATH = path.resolve(
  process.cwd(),
  "server/localdata/trace-ledger.v1.json",
);

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
};

const appendTrace = (entry) => {
  const ledger = readJson(TRACE_PATH, []);
  ledger.unshift(entry);
  writeJson(TRACE_PATH, ledger);
};

const orgId = "demo-org";
const chainStore = readJson(CHAIN_PATH, { version: 1, chains: {} });
if (!chainStore.chains[orgId]) chainStore.chains[orgId] = [];

const chain = {
  id: `spine_${Date.now()}`,
  orgId,
  nodes: [
    { id: "invoice-1", type: "invoice", label: "Vendor Invoice" },
    { id: "ingredient-1", type: "ingredient", label: "Truffle Butter" },
    { id: "storage-1", type: "storage", label: "Main Walk-in" },
    { id: "recipe-1", type: "recipe", label: "Truffle Mash" },
    { id: "dish-1", type: "dish", label: "Short Rib" },
    { id: "menu-1", type: "menu", label: "Winter Menu" },
    { id: "pos-1", type: "pos", label: "POS Item" },
    { id: "export-1", type: "export", label: "FOH Pack PDF" },
  ],
  links: [
    { fromId: "invoice-1", toId: "ingredient-1", relation: "billed_for" },
    { fromId: "ingredient-1", toId: "storage-1", relation: "stored_in" },
    { fromId: "storage-1", toId: "recipe-1", relation: "feeds" },
    { fromId: "recipe-1", toId: "dish-1", relation: "composes" },
    { fromId: "dish-1", toId: "menu-1", relation: "listed_in" },
    { fromId: "menu-1", toId: "pos-1", relation: "mapped_to" },
    { fromId: "pos-1", toId: "export-1", relation: "exported_as" },
  ],
  createdAt: new Date().toISOString(),
};

chainStore.chains[orgId].unshift(chain);
writeJson(CHAIN_PATH, chainStore);

appendTrace({
  id: `trace_${Date.now()}`,
  orgId,
  entityType: "spine-chain",
  entityId: chain.id,
  payload: { action: "SPINE_CHAIN_CREATED" },
  createdAt: new Date().toISOString(),
});
chain.links.forEach((link) =>
  appendTrace({
    id: `trace_${Date.now()}_${link.fromId}`,
    orgId,
    entityType: "spine-link",
    entityId: `${link.fromId}->${link.toId}`,
    payload: { action: "SPINE_LINK_CREATED" },
    createdAt: new Date().toISOString(),
  }),
);

const ledger = readJson(TRACE_PATH, []);
const actions = ledger.map((entry) => entry.payload?.action);
if (!actions.includes("SPINE_CHAIN_CREATED")) {
  throw new Error("Missing SPINE_CHAIN_CREATED action");
}
if (!actions.includes("SPINE_LINK_CREATED")) {
  throw new Error("Missing SPINE_LINK_CREATED action");
}

console.log("OK: spine chain smoke complete");
