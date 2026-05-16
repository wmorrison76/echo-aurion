import {
  BeverageComponent,
  BeverageProfile,
  BeverageFlavorEngine,
} from "./BeverageFlavorEngine";

export type CocktailFamily =
  | "sour"
  | "old_fashioned"
  | "martini"
  | "collins"
  | "highball"
  | "flip"
  | "spritz"
  | "tiki";

export interface CocktailAnalysis {
  familyGuess: CocktailFamily | "unknown";
  profile: BeverageProfile;
  structureNotes: string[];
  improvementSuggestions: string[];
}

export class MixologyEngine {
  static analyzeCocktail(
    components: BeverageComponent[],
    iceMeltMl: number = 0,
  ): CocktailAnalysis {
    const profile = BeverageFlavorEngine.computeProfile(components, iceMeltMl);

    let familyGuess: CocktailFamily | "unknown" = "unknown";
    const abv = profile.abvPercent;
    const sweetness = profile.sweetnessPerceived;

    if (abv >= 18 && sweetness === "dry") familyGuess = "martini";
    if (abv >= 18 && sweetness !== "dry") familyGuess = "old_fashioned";
    if (abv < 18 && sweetness !== "dry" && profile.acidGPerL > 4)
      familyGuess = "sour";
    if (abv < 15 && profile.totalVolumeMl > 200) familyGuess = "highball";

    const structureNotes: string[] = [];
    const improvementSuggestions: string[] = [];

    structureNotes.push(`Estimated family: ${familyGuess}`);
    structureNotes.push(`ABV approximately ${profile.abvPercent}%`);

    if (profile.balanceNotes.length) {
      improvementSuggestions.push(...profile.balanceNotes);
    }

    if (familyGuess === "sour" && profile.acidGPerL < 3.5) {
      improvementSuggestions.push(
        "Increase acid component for a more defined sour profile.",
      );
    }

    if (familyGuess === "old_fashioned" && profile.sugarGPerL < 40) {
      improvementSuggestions.push(
        "Old Fashioned style may feel too dry; consider more sugar or syrup.",
      );
    }

    return { familyGuess, profile, structureNotes, improvementSuggestions };
  }
}
