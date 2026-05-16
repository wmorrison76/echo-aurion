export interface BeverageComponent {
  name: string;
  ml: number;
  abvPercent?: number;
  sugarGPer100ml?: number;
  acidGPer100ml?: number;
  bitternessUnits?: number;
}

export interface BeverageProfile {
  totalVolumeMl: number;
  abvPercent: number;
  sugarGPerL: number;
  acidGPerL: number;
  bitternessIndex: number;
  dilutionPercent: number;
  sweetnessPerceived: "dry" | "off_dry" | "medium" | "sweet";
  balanceNotes: string[];
}

export class BeverageFlavorEngine {
  static computeProfile(
    components: BeverageComponent[],
    iceMeltMl: number = 0,
  ): BeverageProfile {
    let totalVolume = iceMeltMl;
    let alcoholMl = 0;
    let sugarG = 0;
    let acidG = 0;
    let bitterness = 0;

    for (const c of components) {
      totalVolume += c.ml;
      if (c.abvPercent) {
        alcoholMl += (c.abvPercent / 100) * c.ml;
      }
      if (c.sugarGPer100ml) {
        sugarG += (c.sugarGPer100ml / 100) * c.ml;
      }
      if (c.acidGPer100ml) {
        acidG += (c.acidGPer100ml / 100) * c.ml;
      }
      if (c.bitternessUnits) {
        bitterness += c.bitternessUnits * (c.ml / 100);
      }
    }

    const abvPercent = totalVolume > 0 ? (alcoholMl / totalVolume) * 100 : 0;
    const sugarGPerL = totalVolume > 0 ? sugarG / (totalVolume / 1000) : 0;
    const acidGPerL = totalVolume > 0 ? acidG / (totalVolume / 1000) : 0;
    const bitternessIndex =
      totalVolume > 0 ? bitterness / (totalVolume / 100) : 0;
    const dilutionPercent =
      totalVolume > 0 ? (iceMeltMl / (totalVolume - iceMeltMl)) * 100 : 0;

    let sweetnessPerceived: BeverageProfile["sweetnessPerceived"] = "dry";
    if (sugarGPerL > 5 && sugarGPerL <= 20) sweetnessPerceived = "off_dry";
    else if (sugarGPerL > 20 && sugarGPerL <= 60) sweetnessPerceived = "medium";
    else if (sugarGPerL > 60) sweetnessPerceived = "sweet";

    const balanceNotes: string[] = [];

    if (sweetnessPerceived === "dry" && acidGPerL < 2) {
      balanceNotes.push(
        "Very dry profile; consider adding sweetness or acidity.",
      );
    }

    if (sweetnessPerceived !== "dry" && acidGPerL < 3) {
      balanceNotes.push("Sweetness may feel flat without enough acidity.");
    }

    if (bitternessIndex > 20 && sweetnessPerceived === "dry") {
      balanceNotes.push(
        "Bitterness may dominate without sweetness or acid buffering.",
      );
    }

    if (dilutionPercent > 40) {
      balanceNotes.push("High dilution: flavors may taste washed out.");
    }

    return {
      totalVolumeMl: totalVolume,
      abvPercent: Number(abvPercent.toFixed(2)),
      sugarGPerL: Number(sugarGPerL.toFixed(1)),
      acidGPerL: Number(acidGPerL.toFixed(1)),
      bitternessIndex: Number(bitternessIndex.toFixed(1)),
      dilutionPercent: Number(dilutionPercent.toFixed(1)),
      sweetnessPerceived,
      balanceNotes,
    };
  }
}
