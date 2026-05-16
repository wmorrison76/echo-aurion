import type { RequestHandler } from "express";

interface WinePairing {
  wine: string;
  region: string;
  grapeVariety: string;
  pricePerBottle: number;
  costPerGlass: number;
  retailPrice: number;
  margin: number;
  marginPercent: number;
  pairings: string[];
  flavorProfile: string;
  acidity: "Low" | "Medium" | "High";
  body: "Light" | "Medium" | "Full";
  recommendations: string[];
  score: number;
}

interface WinePairingAnalysis {
  pairings: WinePairing[];
  totalWines: number;
  averageMargin: number;
  highestMarginWine: string;
  topRecommendations: string[];
  pairedDishes: string[];
  revenue_potential: number;
}

const generateWinePairingsHandler: RequestHandler = async (req, res) => {
  try {
    const { menuDishes = [], budget = "all" } = req.body;

    const wineDatabase: WinePairing[] = [
      {
        wine: "Pinot Noir",
        region: "Burgundy, France",
        grapeVariety: "Pinot Noir",
        pricePerBottle: 35,
        costPerGlass: 5.83,
        retailPrice: 18,
        margin: 12.17,
        marginPercent: 65,
        pairings: ["Duck", "Lamb", "Salmon", "Mushroom risotto", "Beef"],
        flavorProfile: "Cherry, Earthy, Silky tannins",
        acidity: "Medium",
        body: "Medium",
        recommendations: [
          "Pairs excellently with lean meats",
          "Ideal for French cuisine",
          "Great for private events",
        ],
        score: 92,
      },
      {
        wine: "Sauvignon Blanc",
        region: "Loire Valley, France",
        grapeVariety: "Sauvignon Blanc",
        pricePerBottle: 28,
        costPerGlass: 4.67,
        retailPrice: 14,
        margin: 9.33,
        marginPercent: 72,
        pairings: ["Fish", "Goat cheese", "Asparagus", "Shellfish", "Salads"],
        flavorProfile: "Citrus, Herbaceous, Crisp",
        acidity: "High",
        body: "Light",
        recommendations: [
          "Perfect for seafood appetizers",
          "Highest profit margin in portfolio",
          "Excellent for summer service",
        ],
        score: 88,
      },
      {
        wine: "Cabernet Sauvignon",
        region: "Napa Valley, USA",
        grapeVariety: "Cabernet Sauvignon",
        pricePerBottle: 45,
        costPerGlass: 7.5,
        retailPrice: 22.5,
        margin: 15,
        marginPercent: 60,
        pairings: ["Steak", "Lamb", "Beef bourguignon", "Hard cheeses", "Game"],
        flavorProfile: "Blackberry, Tobacco, Bold tannins",
        acidity: "Medium",
        body: "Full",
        recommendations: [
          "Premium pairing for signature steaks",
          "Enhances fine dining experience",
          "High perceived value",
        ],
        score: 95,
      },
      {
        wine: "Chardonnay",
        region: "Chablis, France",
        grapeVariety: "Chardonnay",
        pricePerBottle: 32,
        costPerGlass: 5.33,
        retailPrice: 16,
        margin: 10.67,
        marginPercent: 68,
        pairings: [
          "Chicken",
          "Seafood pasta",
          "Butter sauces",
          "Mild cheeses",
          "Lobster",
        ],
        flavorProfile: "Apple, Butter, Vanilla",
        acidity: "Medium",
        body: "Medium",
        recommendations: [
          "Versatile pairing for chicken dishes",
          "Strong margin with broad appeal",
          "Excellent for business lunches",
        ],
        score: 90,
      },
      {
        wine: "Prosecco",
        region: "Veneto, Italy",
        grapeVariety: "Glera",
        pricePerBottle: 18,
        costPerGlass: 3,
        retailPrice: 9,
        margin: 6,
        marginPercent: 80,
        pairings: ["Appetizers", "Light seafood", "Fruit desserts", "Brunch"],
        flavorProfile: "Stone fruit, Honey, Effervescent",
        acidity: "High",
        body: "Light",
        recommendations: [
          "Highest profit margin - push for appetizers",
          "Perfect for brunch service",
          "Lowest cost of goods",
        ],
        score: 85,
      },
      {
        wine: "Riesling",
        region: "Mosel, Germany",
        grapeVariety: "Riesling",
        pricePerBottle: 24,
        costPerGlass: 4,
        retailPrice: 12,
        margin: 8,
        marginPercent: 75,
        pairings: ["Spicy foods", "Asian cuisine", "Pork", "Appetizers"],
        flavorProfile: "Peach, Floral, Balance of sweet & tart",
        acidity: "High",
        body: "Light",
        recommendations: [
          "Excellent for spicy cuisine pairings",
          "High margin specialty wine",
          "Growing customer demand",
        ],
        score: 87,
      },
    ];

    const selectedWines =
      budget === "premium"
        ? wineDatabase.filter((w) => w.pricePerBottle > 30)
        : budget === "value"
          ? wineDatabase.filter((w) => w.pricePerBottle < 25)
          : wineDatabase;

    const allPairings = new Set<string>();
    selectedWines.forEach((w) => {
      w.pairings.forEach((p) => allPairings.add(p));
    });

    const averageMargin =
      Math.round(
        (selectedWines.reduce((sum, w) => sum + w.marginPercent, 0) /
          selectedWines.length) *
          10,
      ) / 10;

    const highestMarginWine = selectedWines.reduce((prev, current) =>
      prev.marginPercent > current.marginPercent ? prev : current,
    ).wine;

    const topRecommendations = selectedWines
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .flatMap((w) => w.recommendations);

    const revenue_potential = selectedWines.reduce(
      (sum, w) => sum + w.margin,
      0,
    );

    const analysis: WinePairingAnalysis = {
      pairings: selectedWines,
      totalWines: selectedWines.length,
      averageMargin,
      highestMarginWine,
      topRecommendations: [...new Set(topRecommendations)].slice(0, 5),
      pairedDishes: Array.from(allPairings),
      revenue_potential,
    };

    res.json(analysis);
  } catch (error) {
    console.error("[WINE] Pairing error:", error);
    res.status(500).json({
      error: "Wine pairing generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default generateWinePairingsHandler;
