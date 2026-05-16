#!/usr/bin/env node
import { appendTrace, buildPacks, createMenu, exportPdf } from "./phase6b-utils.mjs";

const menu = createMenu();
const packs = buildPacks(menu, "v1", ["en-US", "fr-FR"]);
const bohPacks = packs.filter((pack) => pack.kind === "BOH_PRODUCTION");

if (!bohPacks.length) {
  console.error("ERROR: BOH packs not generated.");
  process.exit(1);
}

bohPacks.forEach((bohPack) => {
  exportPdf(
    bohPack.title,
    [
      `Menu: ${menu.title}`,
      `Language: ${bohPack.language}`,
      ...Object.entries(bohPack.sections).flatMap(([section, values]) => [
        `${section.toUpperCase()}:`,
        ...values.map((value) => `• ${value}`),
      ]),
    ],
    `boh-pack-${bohPack.language}.pdf`,
  );

  appendTrace({
    id: `trace-boh-export-${bohPack.language}`,
    orgId: "demo-org",
    entityType: "menu-pack",
    entityId: bohPack.id,
    sourceRef: menu.menuId,
    payload: { action: "PACK_EXPORTED", kind: bohPack.kind, language: bohPack.language },
    createdAt: new Date().toISOString(),
  });
});

console.log("OK: BOH pack export smoke complete");
