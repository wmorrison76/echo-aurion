import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "scripts", "outputs", "phase6b");

const ensureOutputDir = () => {
  fs.mkdirSync(outputDir, { recursive: true });
};

const fixedNow = new Date("2026-01-23T12:00:00Z");

export const createMenu = () => ({
  menuId: "menu-demo-6b",
  title: "Investor Dinner Menu",
  items: [
    {
      id: "menu-demo-6b-dish-1",
      menuId: "menu-demo-6b",
      name: "Seared Scallop",
      recipeId: "dish-001",
      recipeName: "Seared Scallop",
      courseName: "Starter",
      yieldCount: 80,
      portionSize: "1 plate",
      dietaryNotes: ["pescatarian"],
      allergieWarnings: ["shellfish"],
      productionNote: "Hot line",
    },
    {
      id: "menu-demo-6b-dish-2",
      menuId: "menu-demo-6b",
      name: "Braised Short Rib",
      recipeId: "dish-002",
      recipeName: "Braised Short Rib",
      courseName: "Main",
      yieldCount: 80,
      portionSize: "8 oz",
      dietaryNotes: [],
      allergieWarnings: ["dairy"],
      productionNote: "Braised day prior",
    },
    {
      id: "menu-demo-6b-bev-1",
      menuId: "menu-demo-6b",
      name: "Citrus Spritz",
      recipeId: "bev-001",
      recipeName: "Citrus Spritz",
      courseName: "Beverage",
      yieldCount: 80,
      portionSize: "8 oz",
      dietaryNotes: [],
      allergieWarnings: [],
      productionNote: "Bar station",
    },
  ],
  eventId: "investor-demo",
  createdAtISO: fixedNow.toISOString(),
  updatedAtISO: fixedNow.toISOString(),
});

export const buildPacks = (menu, versionId, languages) => {
  const packs = [];
  languages.forEach((language) => {
    packs.push({
      id: `pack-foh-${language}`,
      menuId: menu.menuId,
      versionId,
      kind: "FOH_SERVER_NOTES",
      title: `FOH Server Notes (${language})`,
      language,
      createdAtISO: fixedNow.toISOString(),
      metadata: {
        season: "Winter 2026",
        effectiveFrom: "2026-02-01",
        effectiveTo: "2026-03-15",
      },
      items: menu.items,
      notes: [
        `Call out allergens for ${menu.items[0].name}.`,
        "Reinforce story-driven upsell on pairings.",
      ],
      sections: {
        allergens: ["Seared Scallop: shellfish", "Braised Short Rib: dairy"],
        upsell: ["Offer reserve wine pairing."],
        pairings: ["Seared Scallop → Sauvignon Blanc", "Short Rib → Cabernet"],
      },
    });
    packs.push({
      id: `pack-boh-${language}`,
      menuId: menu.menuId,
      versionId,
      kind: "BOH_PRODUCTION",
      title: `BOH Production Pack (${language})`,
      language,
      createdAtISO: fixedNow.toISOString(),
      metadata: {
        season: "Winter 2026",
        effectiveFrom: "2026-02-01",
        effectiveTo: "2026-03-15",
      },
      items: menu.items,
      notes: ["Confirm station assignments by 14:00.", "Stage hot holding."],
      sections: {
        prepList: ["Scallop mise prepped", "Short rib braised"],
        stationBreakdown: ["Hot line: scallop + rib", "Bar: spritz"],
        yieldScaling: ["80 covers target", "10% contingency prep"],
        costRollup: ["Food cost est $1,280", "Beverage cost est $320"],
      },
    });
  });
  return packs;
};

export const writeJson = (filename, payload) => {
  ensureOutputDir();
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
};

export const appendTrace = (entry) => {
  ensureOutputDir();
  const filePath = path.join(outputDir, "trace-ledger.json");
  const existing = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf8"))
    : [];
  existing.unshift(entry);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  return filePath;
};

export const exportPdf = (title, lines, filename) => {
  ensureOutputDir();
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  let y = margin;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 20;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(11);
  lines.forEach((line) => {
    doc.text(String(line), margin, y);
    y += 14;
    if (y > 720) {
      doc.addPage();
      y = margin;
    }
  });
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, Buffer.from(doc.output("arraybuffer")));
  return filePath;
};
