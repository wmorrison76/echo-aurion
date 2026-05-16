#!/usr/bin/env node
import { appendTrace, buildPacks, createMenu, exportPdf } from "./phase6b-utils.mjs";

const menu = createMenu();
const packs = buildPacks(menu, "v1", ["en-US", "fr-FR"]);
const fohPacks = packs.filter((pack) => pack.kind === "FOH_SERVER_NOTES");

if (!fohPacks.length) {
  console.error("ERROR: FOH packs not generated.");
  process.exit(1);
}

fohPacks.forEach((fohPack) => {
  exportPdf(
    fohPack.title,
    [
      `Menu: ${menu.title}`,
      `Language: ${fohPack.language}`,
      ...Object.entries(fohPack.sections).flatMap(([section, values]) => [
        `${section.toUpperCase()}:`,
        ...values.map((value) => `• ${value}`),
      ]),
    ],
    `foh-pack-${fohPack.language}.pdf`,
  );

  appendTrace({
    id: `trace-foh-export-${fohPack.language}`,
    orgId: "demo-org",
    entityType: "menu-pack",
    entityId: fohPack.id,
    sourceRef: menu.menuId,
    payload: { action: "PACK_EXPORTED", kind: fohPack.kind, language: fohPack.language },
    createdAt: new Date().toISOString(),
  });
});

console.log("OK: FOH pack export smoke complete");
