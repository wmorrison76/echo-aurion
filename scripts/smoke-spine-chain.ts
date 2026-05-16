import fs from "node:fs";
import path from "node:path";
import { appendTraceEvent } from "../server/services/trace-ledger-fallback";
import {
  createSpineChain,
  findSpinePath,
  type SpineNode,
  type SpineLink,
} from "../server/services/spine-chain-store";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const orgId = "demo-org";

const nodes: SpineNode[] = [
  { id: "invoice-1", type: "invoice", label: "Vendor Invoice" },
  { id: "ingredient-1", type: "ingredient", label: "Truffle Butter" },
  { id: "storage-1", type: "storage", label: "Main Walk-in" },
  { id: "recipe-1", type: "recipe", label: "Truffle Mash" },
  { id: "dish-1", type: "dish", label: "Short Rib" },
  { id: "menu-1", type: "menu", label: "Winter Menu" },
  { id: "pos-1", type: "pos", label: "POS Item" },
  { id: "export-1", type: "export", label: "FOH Pack PDF" },
];

const links: SpineLink[] = [
  { fromId: "invoice-1", toId: "ingredient-1", relation: "billed_for" },
  { fromId: "ingredient-1", toId: "storage-1", relation: "stored_in" },
  { fromId: "storage-1", toId: "recipe-1", relation: "feeds" },
  { fromId: "recipe-1", toId: "dish-1", relation: "composes" },
  { fromId: "dish-1", toId: "menu-1", relation: "listed_in" },
  { fromId: "menu-1", toId: "pos-1", relation: "mapped_to" },
  { fromId: "pos-1", toId: "export-1", relation: "exported_as" },
];

const run = async () => {
  const chain = await createSpineChain(orgId, nodes, links);
  const pathNodes = findSpinePath(chain, "invoice", "export");
  assert(pathNodes && pathNodes.length >= 8, "Expected full spine traversal path");

  await appendTraceEvent({
    orgId,
    entityType: "spine-chain",
    entityId: chain.id,
    sourceRef: "smoke",
    payload: { action: "SPINE_CHAIN_CREATED", nodes: nodes.length },
  });

  for (const link of links) {
    await appendTraceEvent({
      orgId,
      entityType: "spine-link",
      entityId: `${link.fromId}->${link.toId}`,
      sourceRef: chain.id,
      payload: { action: "SPINE_LINK_CREATED", relation: link.relation },
    });
  }

  const ledgerPath = path.resolve(
    process.cwd(),
    "server/localdata/trace-ledger.v1.json",
  );
  const ledger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, "utf8"))
    : [];
  const actions = ledger.map((entry: any) => entry.payload?.action);

  assert(actions.includes("SPINE_CHAIN_CREATED"), "Missing SPINE_CHAIN_CREATED action");
  assert(actions.includes("SPINE_LINK_CREATED"), "Missing SPINE_LINK_CREATED action");

  console.log("OK: spine chain smoke complete");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
