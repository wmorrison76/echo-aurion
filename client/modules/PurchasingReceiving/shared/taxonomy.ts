import type {
  Tier1Category,
  Tier2Category,
  Tier3Category,
  ProductStandardization,
} from "@shared/api";
import { normalizeUnit } from "@shared/api";
import { luccaBeverageCategories } from "./data/lucca-beverages";
const L = (xs: string[]) => xs.map((s) => s.toLowerCase()); // Produce
const citrus = L([
  "orange",
  "valencia",
  "navel",
  "blood orange",
  "mandarin",
  "seville",
  "lemon",
  "eureka",
  "lisbon",
  "meyer",
  "lime",
  "key lime",
  "persian",
  "kaffir",
  "grapefruit",
  "ruby red",
  "pomelo",
  "yuzu",
  "tangerine",
  "clementine",
]);
const berries = L([
  "strawberry",
  "blueberry",
  "raspberry",
  "blackberry",
  "cranberry",
  "gooseberry",
  "currant",
]);
const genericBerries = L(["berry", "berries", "berry mix", "mixed berry"]);
const pome = L(["apple", "pear", "quince"]);
const stone = L(["peach", "plum", "nectarine", "apricot", "cherry", "mango"]);
const melons = L([
  "watermelon",
  "cantaloupe",
  "honeydew",
  "galia",
  "charentais",
]);
const tropical = L([
  "pineapple",
  "banana",
  "papaya",
  "guava",
  "passionfruit",
  "lychee",
  "dragonfruit",
  "jackfruit",
  "taro",
  "cassava",
  "breadfruit",
  "soursop",
  "mangosteen",
  "durian",
  "lotus root",
  "bamboo shoot",
]);
const grapes = L([
  "grape",
  "cabernet",
  "chardonnay",
  "pinot",
  "merlot",
  "zinfandel",
]);
const leafy = L([
  "lettuce",
  "romaine",
  "iceberg",
  "butterhead",
  "spinach",
  "kale",
  "chard",
  "collard",
  "arugula",
  "microgreens",
]);
const brassicas = L([
  "broccoli",
  "cauliflower",
  "brussels",
  "cabbage",
  "bok choy",
]);
const roots = L(["carrot", "beet", "parsnip", "radish", "turnip", "rutabaga"]);
const tubers = L(["potato", "sweet potato", "yam", "cassava"]);
const alliums = L(["onion", "garlic", "shallot", "leek", "scallion", "chive"]);
const squash = L([
  "zucchini",
  "pumpkin",
  "butternut",
  "acorn",
  "spaghetti",
  "winter squash",
  "summer squash",
]);
const cucumbers = L(["cucumber", "gherkin"]);
const legumesFresh = L([
  "green bean",
  "snow pea",
  "sugar snap",
  "edamame",
  "fava",
]);
const fungi = L([
  "mushroom",
  "cremini",
  "portobello",
  "shiitake",
  "oyster",
  "enoki",
  "morel",
  "truffle",
]);
const preparedBrands = L([
  "tyson",
  "perdue",
  "smithfield",
  "oscar mayer",
  "hormel",
  "campbell",
  "hellmann",
  "heinz",
  "national brand",
  "deli salad",
  "sliced bread",
  "tortilla",
  "naan",
  "pita",
  "ketchup",
  "mustard",
  "mayonnaise",
  "pickle",
  "olive",
  "jam",
  "peanut butter",
  "granola bar",
  "pretzel",
  "cracker",
  "cookie",
  "soup",
  "chili",
]); // Beverages (LUCCCA splits)
const beveragesBeer = L([
  "beer",
  "ipa",
  "lager",
  "pilsner",
  "stout",
  "ale",
  "porter",
  "saison",
  "hefeweizen",
  "kolsch",
  "pale ale",
  "hard seltzer",
]);
const beveragesWine = L([
  "wine",
  "cabernet",
  "merlot",
  "pinot",
  "chardonnay",
  "riesling",
  "sauvignon",
  "malbec",
  "cava",
  "prosecco",
  "rose",
  "rosé",
  "tempranillo",
  "grenache",
]);
const beveragesSpirits = L([
  "vodka",
  "gin",
  "rum",
  "tequila",
  "bourbon",
  "whiskey",
  "whisky",
  "scotch",
  "mezcal",
  "brandy",
  "cognac",
  "liqueur",
  "amaro",
  "aperol",
  "campari",
]);
const beveragesMixers = L([
  "mixer",
  "tonic",
  "club soda",
  "ginger beer",
  "bitters",
  "grenadine",
  "simple syrup",
  "soda water",
  "seltzer",
  "bloody mary mix",
  "margarita mix",
]);
const beveragesCoffeeTea = L([
  "coffee",
  "espresso",
  "latte",
  "cappuccino",
  "cold brew",
  "americano",
  "matcha",
  "chai",
  "tea",
  "oolong",
  "frappe",
]);
const beveragesConcentrates = L([
  "concentrate",
  "concentrates",
  "puree",
  "purée",
  "cordial",
  "base",
  "fountain syrup",
  "frozen mix",
  "slush",
  "reducer",
  "syrup",
]);
const beveragesJuices = (() => {
  const keywords = new Set(
    L([
      "juice",
      "juices",
      "smoothie",
      "lemonade",
      "soft drink",
      "sparkling water",
      "kombucha",
      "mocktail",
      "fruit punch",
      "ready to drink",
      "non-alcoholic",
    ]),
  );
  for (const group of luccaBeverageCategories) {
    for (const keyword of group.keywords) {
      keywords.add(keyword.toLowerCase());
    }
  }
  return Array.from(keywords);
})(); // Proteins
const beef = L([
  "beef",
  "steak",
  "brisket",
  "short rib",
  "ribeye",
  "strip",
  "tenderloin",
]);
const pork = L(["pork", "bacon", "ham", "belly", "loin", "shoulder", "ribs"]);
const lamb = L(["lamb", "mutton"]);
const poultry = L([
  "chicken",
  "turkey",
  "duck",
  "goose",
  "quail",
  "pheasant",
  "cornish hen",
]);
const finfishWhite = L([
  "cod",
  "haddock",
  "halibut",
  "pollock",
  "flounder",
  "sole",
  "snapper",
  "grouper",
  "bass",
]);
const finfishOily = L([
  "salmon",
  "tuna",
  "mackerel",
  "sardine",
  "herring",
  "trout",
]);
const freshwater = L(["catfish", "perch", "pike", "tilapia"]);
const shellCrust = L(["shrimp", "lobster", "crab", "crawfish"]);
const shellMollusk = L(["clam", "mussel", "oyster", "scallop"]);
const cephalopod = L(["squid", "octopus", "cuttlefish"]); // Grains & starches
const rices = L([
  "rice",
  "arborio",
  "carnaroli",
  "vialone",
  "jasmine",
  "basmati",
  "calrose",
  "wild rice",
]);
const cereals = L([
  "wheat",
  "corn",
  "barley",
  "oat",
  "rye",
  "millet",
  "sorghum",
  "spelt",
  "farro",
  "kamut",
  "einkorn",
  "emmer",
  "teff",
]);
const pseudo = L(["quinoa", "buckwheat", "amaranth"]);
const pastas = L([
  "spaghetti",
  "penne",
  "fettuccine",
  "ramen",
  "udon",
  "soba",
  "noodle",
  "orzo",
  "macaroni",
]); // Pantry / spices / oils
const oils = L([
  "olive oil",
  "canola",
  "sunflower",
  "coconut oil",
  "avocado oil",
  "ghee",
  "lard",
  "butter",
]);
const sweeteners = L(["sugar", "honey", "maple", "agave", "molasses"]);
const vinegars = L([
  "balsamic",
  "red wine vinegar",
  "white wine vinegar",
  "apple cider vinegar",
  "rice vinegar",
  "malt vinegar",
]);
const condiments = L([
  "ketchup",
  "mustard",
  "mayonnaise",
  "soy sauce",
  "fish sauce",
  "hot sauce",
  "sriracha",
  "bbq",
]);
const driedSpices = L([
  "pepper",
  "cumin",
  "coriander",
  "turmeric",
  "paprika",
  "cinnamon",
  "clove",
  "cardamom",
  "star anise",
  "sumac",
  "zaatar",
  "garlic powder",
  "onion powder",
  "ginger",
]); // Dairy & eggs
const dairyCheeses = L([
  "cheddar",
  "parmesan",
  "gruyere",
  "manchego",
  "brie",
  "camembert",
  "mozzarella",
  "havarti",
  "fontina",
  "gorgonzola",
  "ricotta",
  "cottage",
  "cream cheese",
]);
function containsAny(name: string, list: string[]) {
  const n = name.toLowerCase();
  return list.some((k) => n.includes(k));
}
export function classifyItem(name: string): ProductStandardization {
  const n = name.toLowerCase();
  const mk = (
    tier1: Tier1Category,
    tier2?: Tier2Category,
    tier3?: Tier3Category,
    standardUnit: ProductStandardization["standardUnit"] = "oz",
  ): ProductStandardization => ({
    standardizedName: name.replace(/\s+/g, "").trim(),
    standardUnit,
    categories: { tier1, tier2, tier3 },
  });
  if (/(catch|case)\s+weight/.test(n)) {
    return {
      standardizedName: "Weight Adjustment",
      standardUnit: "lb",
      categories: { tier1: "Non-Food" },
    };
  } // Produce if (containsAny(n, citrus)) return mk("Produce","Fruits","Citrus"); if (containsAny(n, berries) || containsAny(n, genericBerries)) return mk("Produce","Fruits","Berries"); if (containsAny(n, pome)) return mk("Produce","Fruits","Pome Fruits"); if (containsAny(n, stone)) return mk("Produce","Fruits","Stone Fruits"); if (containsAny(n, melons)) return mk("Produce","Fruits","Melons"); if (containsAny(n, tropical)) return mk("Produce","Fruits","Tropical"); if (containsAny(n, grapes)) return mk("Produce","Fruits","Grapes"); if (containsAny(n, leafy)) return mk("Produce","Vegetables","Leafy Greens"); if (containsAny(n, brassicas)) return mk("Produce","Vegetables","Cruciferous"); if (containsAny(n, roots)) return mk("Produce","Vegetables","Root Vegetables"); if (containsAny(n, tubers)) return mk("Produce","Vegetables","Tubers"); if (containsAny(n, alliums)) return mk("Produce","Vegetables","Alliums"); if (containsAny(n, squash)) return mk("Produce","Vegetables","Squash & Gourds"); if (containsAny(n, cucumbers)) return mk("Produce","Vegetables","Cucumbers"); if (containsAny(n, legumesFresh)) return mk("Produce","Vegetables","Legumes"); if (containsAny(n, fungi)) return mk("Produce","Vegetables","Mushrooms"); // Proteins if (containsAny(n, beef)) return mk("Protein","Meat","Beef"); if (containsAny(n, pork)) return mk("Protein","Meat","Pork"); if (containsAny(n, lamb)) return mk("Protein","Meat","Lamb"); if (containsAny(n, poultry)) return mk("Protein","Poultry","Chicken"); if (containsAny(n, finfishWhite)) return mk("Seafood","Seafood","Finfish"); if (containsAny(n, finfishOily) || containsAny(n, freshwater)) return mk("Seafood","Seafood","Finfish"); if (containsAny(n, shellCrust) || containsAny(n, shellMollusk) || containsAny(n, cephalopod)) return mk("Seafood","Seafood","Shellfish"); // Dairy if (n.includes("milk") || n.includes("yogurt") || n.includes("kefir")) return mk("Dairy", undefined, undefined,"ml"); if (containsAny(n, dairyCheeses) || n.includes("cheese")) return mk("Dairy","Cheese", undefined); if (n.includes("egg")) return mk("Dairy", undefined, undefined,"each"); // Grains & starches if (containsAny(n, rices)) return mk("Dry Goods","Grains","Rice"); if (containsAny(n, cereals)) return mk("Dry Goods","Grains", undefined); if (containsAny(n, pseudo)) return mk("Dry Goods","Grains", undefined); if (containsAny(n, pastas)) return mk("Dry Goods","Grains","Pasta"); // Pantry if (containsAny(n, oils)) return mk("Non-Food", undefined, undefined,"ml"); if (containsAny(n, sweeteners)) return mk("Dry Goods", undefined, undefined); if (containsAny(n, vinegars)) return mk("Dry Goods", undefined, undefined,"ml"); if (containsAny(n, condiments)) return mk("Dry Goods", undefined, undefined); if (containsAny(n, driedSpices)) return mk("Dry Goods","Spices", undefined,"g"); // Beverages if (containsAny(n, beveragesBeer)) return mk("Beverage", undefined,"Beer"); if (containsAny(n, beveragesWine)) return mk("Beverage", undefined,"Wine"); if (containsAny(n, beveragesSpirits)) return mk("Beverage", undefined,"Spirits"); if (containsAny(n, beveragesMixers)) return mk("Beverage", undefined,"Mixers"); if (containsAny(n, beveragesConcentrates)) return mk("Beverage", undefined,"Concentrates"); if (containsAny(n, beveragesCoffeeTea)) return mk("Beverage", undefined,"Coffee & Tea"); if (containsAny(n, beveragesJuices)) return mk("Beverage", undefined,"Juices"); if (n.includes("coffee") || n.includes("tea") || n.includes("juice") || n.includes("soda") || n.includes("water")) return mk("Beverage"); // Prepared & processed if (containsAny(n, preparedBrands)) return mk("Dry Goods"); if (n.includes("frozen") || n.includes("canned") || n.includes("snack") || n.includes("soup")) return mk("Frozen"); return mk("Dry Goods");
}
