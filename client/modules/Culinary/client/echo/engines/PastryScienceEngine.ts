export type PastryCategory =
  | "lean_bread"
  | "enriched_bread"
  | "high_ratio_cake"
  | "sponge_cake"
  | "cookie"
  | "pate_a_choux"
  | "pate_brisée"
  | "pate_sucrée"
  | "pate_sablée"
  | "custard"
  | "mousse"
  | "frozen";

export interface BakersPercentageFormula {
  formulaId: string;
  category: PastryCategory;
  flourPercent: number;
  waterPercent: number;
  fatPercent: number;
  sugarPercent: number;
  eggPercent: number;
  saltPercent: number;
  leaveningPercent?: number;
  additionalSolidsPercent?: number;
}

export interface PastryTextureProfile {
  crumbOpenness: number;
  tenderness: number;
  moistness: number;
  crustCrispness: number;
  flakiness: number;
  chewiness: number;
  richness: number;
  airiness: number;
  notes: string[];
}

export interface PastryDefect {
  code: string;
  description: string;
  likelyCauses: string[];
  suggestedFixes: string[];
}

export interface ShelfLifeEstimate {
  roomTempHours: number;
  refrigeratedHours: number;
  frozenDays: number;
  primaryStalingRisk: string;
  glazingOrBarrierRecommended: boolean;
}

export class PastryScienceEngine {
  static predictTexture(
    formula: BakersPercentageFormula,
  ): PastryTextureProfile {
    const {
      category,
      waterPercent,
      fatPercent,
      sugarPercent,
      eggPercent,
      additionalSolidsPercent = 0,
    } = formula;

    const notes: string[] = [];

    let crumbOpenness = 0.3;
    let tenderness = 0.4;
    let moistness = 0.4;
    let crustCrispness = 0.3;
    let flakiness = 0.2;
    let chewiness = 0.3;
    let richness = 0.3;
    let airiness = 0.3;

    if (category === "lean_bread") {
      crumbOpenness = waterPercent > 70 ? 0.8 : 0.5;
      chewiness = 0.7;
      crustCrispness = 0.7;
      richness = 0.2;
      notes.push("Lean dough: chewy crumb, crisp crust.");
    }

    if (category === "high_ratio_cake") {
      tenderness = 0.8;
      moistness = 0.8;
      airiness = 0.7;
      crustCrispness = 0.1;
      richness = fatPercent > 30 ? 0.8 : 0.6;
      notes.push(
        "High-ratio cake: very tender, moist crumb with fine texture.",
      );
    }

    if (category === "pate_sablée" || category === "cookie") {
      flakiness = 0.3;
      crustCrispness = 0.7;
      tenderness = 0.7;
      chewiness = sugarPercent > 40 ? 0.5 : 0.2;
      notes.push(
        "High fat + sugar: sandy/tender texture, good snap if baked well.",
      );
    }

    if (sugarPercent > 80) {
      moistness += 0.1;
      richness += 0.1;
      notes.push("Very high sugar: increased moistness but risk of collapse.");
    }

    if (eggPercent > 40) {
      airiness += 0.1;
      richness += 0.1;
      notes.push(
        "High egg content: custardy richness and structure from proteins.",
      );
    }

    if (additionalSolidsPercent > 30) {
      crumbOpenness -= 0.1;
      notes.push("High solids (cocoa/nuts): denser crumb, more intensity.");
    }

    const clamp = (n: number) => Math.max(0, Math.min(1, n));

    return {
      crumbOpenness: clamp(crumbOpenness),
      tenderness: clamp(tenderness),
      moistness: clamp(moistness),
      crustCrispness: clamp(crustCrispness),
      flakiness: clamp(flakiness),
      chewiness: clamp(chewiness),
      richness: clamp(richness),
      airiness: clamp(airiness),
      notes,
    };
  }

  static diagnoseDefects(
    observations: string[],
    formula: BakersPercentageFormula,
  ): PastryDefect[] {
    const defects: PastryDefect[] = [];

    const obs = observations.join(" ").toLowerCase();

    if (/sank|collapsed|sunken/.test(obs)) {
      defects.push({
        code: "CAKE_COLLAPSE",
        description:
          "Cake or batter-based product collapsed or sank in the center.",
        likelyCauses: [
          "Excess sugar or leavening relative to structure.",
          "Underbaking (center not fully set).",
          "Overmixing leading to weakened structure.",
        ],
        suggestedFixes: [
          "Reduce sugar and/or chemical leavening slightly.",
          "Extend bake time or lower temp slightly and bake longer.",
          "Avoid overmixing after flour is added.",
        ],
      });
    }

    if (/tunnels|large holes/.test(obs)) {
      defects.push({
        code: "TUNNELING",
        description: "Tunnels or large holes in crumb.",
        likelyCauses: [
          "Overmixing in muffin/quick bread methods.",
          "Excess leavening.",
        ],
        suggestedFixes: [
          "Use gentle mixing; stop when dry ingredients are just incorporated.",
          "Reduce chemical leavening slightly.",
        ],
      });
    }

    if (/cracked.*custard|custard.*cracked|cheesecake.*cracked/.test(obs)) {
      defects.push({
        code: "CUSTARD_CRACK",
        description: "Baked custard or cheesecake cracked on surface.",
        likelyCauses: [
          "Oven temperature too high.",
          "Overbaking beyond set point.",
          "Rapid cooling or lack of water bath.",
        ],
        suggestedFixes: [
          "Bake at a lower temp with a water bath.",
          "Pull custards when they still have a slight jiggle.",
          "Cool gradually to avoid thermal shock.",
        ],
      });
    }

    return defects;
  }

  static estimateShelfLife(
    formula: BakersPercentageFormula,
  ): ShelfLifeEstimate {
    const { category, sugarPercent, fatPercent } = formula;

    let roomTempHours = 8;
    let refrigeratedHours = 48;
    let frozenDays = 30;
    let primaryStalingRisk = "starch_retrogradation";
    let glazingOrBarrierRecommended = false;

    if (category === "lean_bread") {
      roomTempHours = 24;
      refrigeratedHours = 24;
      frozenDays = 30;
      primaryStalingRisk = "crumb_firming";
    }

    if (category === "high_ratio_cake" || category === "sponge_cake") {
      roomTempHours = 24;
      refrigeratedHours = 72;
      frozenDays = 45;
      if (sugarPercent > 70 || fatPercent > 30) {
        roomTempHours = 36;
      }
    }

    if (category === "pate_sablée" || category === "cookie") {
      roomTempHours = 72;
      refrigeratedHours = 120;
      frozenDays = 90;
      primaryStalingRisk = "loss_of_crispness";
      glazingOrBarrierRecommended = true;
    }

    if (category === "custard" || category === "mousse") {
      roomTempHours = 4;
      refrigeratedHours = 48;
      frozenDays = 14;
      primaryStalingRisk = "syneresis_or_separation";
      glazingOrBarrierRecommended = true;
    }

    return {
      roomTempHours,
      refrigeratedHours,
      frozenDays,
      primaryStalingRisk,
      glazingOrBarrierRecommended,
    };
  }
}
