#!/usr/bin/env node
import {
  appendTrace,
  buildPacks,
  createMenu,
  exportPdf,
  writeJson,
} from "./phase6b-utils.mjs";

const menu = createMenu();
const versionId = "v1";
const languages = ["en-US", "fr-FR"];
const packs = buildPacks(menu, versionId, languages);

const menuPath = writeJson("menu-publish.json", {
  menu,
  versionId,
  languages,
  packs: packs.map((pack) => ({ id: pack.id, kind: pack.kind, language: pack.language })),
});

appendTrace({
  id: "trace-menu-published",
  orgId: "demo-org",
  entityType: "menu",
  entityId: menu.menuId,
  sourceRef: versionId,
  payload: {
    action: "MENU_PUBLISHED",
    title: menu.title,
    itemCount: menu.items.length,
  },
  createdAt: new Date().toISOString(),
});

packs.forEach((pack) => {
  appendTrace({
    id: `trace-pack-${pack.id}`,
    orgId: "demo-org",
    entityType: "menu-pack",
    entityId: pack.id,
    sourceRef: menu.menuId,
    payload: {
      action: "PACK_GENERATED",
      kind: pack.kind,
      language: pack.language,
    },
    createdAt: new Date().toISOString(),
  });
});

exportPdf(
  "Menu Summary (Bilingual)",
  [
    `Menu: ${menu.title}`,
    `Languages: ${languages.join(", ")}`,
    ...menu.items.map((item) => `• ${item.name}`),
  ],
  "menu-summary.pdf",
);

console.log("OK: menu publish smoke complete");
console.log(`Menu output: ${menuPath}`);
