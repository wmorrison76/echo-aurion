import { currencySymbol } from "@shared/recipes";
import type {
  Menu,
  MenuItemBinding,
  MenuPack,
  MenuPackKind,
} from "@/domains/menu";
import type { LanguageCode } from "../i18n/config";
import { defaultLanguage } from "../i18n/config";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

type PackBuildInput = {
  menu: Menu;
  versionId: string;
  season?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  languages: LanguageCode[];
};

const translationHints: Record<string, Record<LanguageCode, string>> = {
  "Server Notes": {
    "fr-FR": "Notes de service",
    "it-IT": "Note di servizio",
    "es-ES": "Notas de servicio",
    "pt-BR": "Notas de serviço",
    "de-DE": "Servicehinweise",
    "en-US": "Server Notes",
  },
  "Production Notes": {
    "fr-FR": "Notes de production",
    "it-IT": "Note di produzione",
    "es-ES": "Notas de producción",
    "pt-BR": "Notas de produção",
    "de-DE": "Produktionshinweise",
    "en-US": "Production Notes",
  },
};

const translate = (value: string, language: LanguageCode) => {
  if (language === defaultLanguage) return value;
  const hit = translationHints[value]?.[language];
  if (hit) return hit;
  return `${value} (${language})`;
};

const joinList = (items: string[]) =>
  items.length <= 2
    ? items.join(" and ")
    : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;

const buildAllergenNotes = (items: MenuItemBinding[]) => {
  const entries: string[] = [];
  items.forEach((item) => {
    if (!item.allergieWarnings?.length) return;
    entries.push(`${item.name}: ${joinList(item.allergieWarnings)}`);
  });
  return entries.length
    ? entries
    : ["Confirm allergen matrix with chef and call out custom requests."];
};

const buildUpsellNotes = (items: MenuItemBinding[]) => {
  const cues = items.slice(0, 3).map((item) => `${item.name} pairing upgrade`);
  return cues.length
    ? cues.map((cue) => `Highlight ${cue}.`)
    : ["Emphasize chef story and premium sourcing details."];
};

const buildPairings = (items: MenuItemBinding[]) => {
  if (!items.length)
    return ["Seasonal sparkling pairing", "Reserve red option"];
  return items.slice(0, 3).map((item) => `${item.name} → reserve pairing`);
};

const buildPrepList = (items: MenuItemBinding[]) => {
  return items.map((item) => `${item.name}: prep ${item.yieldCount} portions`);
};

const buildStationBreakdown = (items: MenuItemBinding[]) => {
  const stations: Record<string, string[]> = {};
  items.forEach((item) => {
    const station = item.courseName
      ? `${item.courseName} station`
      : "core station";
    if (!stations[station]) stations[station] = [];
    stations[station]!.push(item.name);
  });
  return Object.entries(stations).map(
    ([station, names]) => `${station}: ${joinList(names)}`,
  );
};

const buildYieldScaling = (items: MenuItemBinding[]) => {
  return items.map(
    (item) =>
      `${item.name}: scale to ${item.yieldCount} servings (${item.portionSize ?? "standard"})`,
  );
};

const buildCostRollups = (items: MenuItemBinding[]) => {
  const total = items.reduce(
    (sum, item) => sum + (item.yieldCount || 0) * 5,
    0,
  );
  return [
    `Estimated food cost: ${currencySymbol("USD")}${total.toFixed(2)}`,
    "Validate with final recipe costing sheet.",
  ];
};

export const buildMenuPacks = ({
  menu,
  versionId,
  season,
  effectiveFrom,
  effectiveTo,
  languages,
}: PackBuildInput): MenuPack[] => {
  const createdAtISO = new Date().toISOString();
  const metadata = { season, effectiveFrom, effectiveTo };
  const packs: MenuPack[] = [];

  const basePacks: Array<{
    kind: MenuPackKind;
    title: string;
    sections: Record<string, string[]>;
    notes: string[];
  }> = [
    {
      kind: "FOH_SERVER_NOTES",
      title: "FOH Server Notes",
      sections: {
        allergens: buildAllergenNotes(menu.items),
        upsell: buildUpsellNotes(menu.items),
        pairings: buildPairings(menu.items),
      },
      notes: [
        "Call out key flavor stories and pacing cues at pre-service.",
        "Align table touchpoints with menu narrative and plating.",
      ],
    },
    {
      kind: "BOH_PRODUCTION",
      title: "BOH Production Pack",
      sections: {
        prepList: buildPrepList(menu.items),
        stationBreakdown: buildStationBreakdown(menu.items),
        yieldScaling: buildYieldScaling(menu.items),
        costRollup: buildCostRollups(menu.items),
      },
      notes: [
        "Confirm station assignments and expo cadence.",
        "Reconcile production counts at lineup.",
      ],
    },
  ];

  languages.forEach((language) => {
    basePacks.forEach((pack) => {
      packs.push({
        id: createId(),
        menuId: menu.menuId,
        versionId,
        kind: pack.kind,
        title: `${pack.title} (${language})`,
        language,
        createdAtISO,
        metadata,
        items: menu.items,
        notes: pack.notes.map((note) => translate(note, language)),
        sections: Object.fromEntries(
          Object.entries(pack.sections).map(([key, values]) => [
            key,
            values.map((value) => translate(value, language)),
          ]),
        ),
      });
    });
  });

  return packs;
};

export const generateMenuSummaryPdf = async (
  menu: Menu,
  languages: LanguageCode[],
  fileName: string,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  let y = margin;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.text(menu.title || "Menu Builder Export", margin, y);
  y += 22;

  menu.items.forEach((item) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text(item.name, margin, y);
    y += 14;
    languages.forEach((language) => {
      if (language === defaultLanguage) return;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(translate(item.name, language), margin + 16, y);
      y += 12;
    });
    y += 6;
    if (y > 700) {
      doc.addPage();
      y = margin;
    }
  });

  doc.save(fileName);
};

export const generatePackPdf = async (pack: MenuPack, fileName: string) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  let y = margin;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text(pack.title, margin, y);
  y += 20;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Menu: ${pack.menuId} • Version: ${pack.versionId}`, margin, y);
  y += 16;

  Object.entries(pack.sections).forEach(([section, values]) => {
    doc.setFont("Helvetica", "bold");
    doc.text(translate(section, pack.language as LanguageCode), margin, y);
    y += 14;
    doc.setFont("Helvetica", "normal");
    values.forEach((value) => {
      doc.text(`• ${value}`, margin + 12, y);
      y += 12;
      if (y > 720) {
        doc.addPage();
        y = margin;
      }
    });
    y += 8;
  });

  if (pack.notes.length) {
    doc.setFont("Helvetica", "bold");
    doc.text(
      translate("Server Notes", pack.language as LanguageCode),
      margin,
      y,
    );
    y += 14;
    doc.setFont("Helvetica", "normal");
    pack.notes.forEach((note) => {
      doc.text(`• ${note}`, margin + 12, y);
      y += 12;
    });
  }

  doc.save(fileName);
};
