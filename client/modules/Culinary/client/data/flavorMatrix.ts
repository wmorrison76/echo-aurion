export type FlavorConstellation = {
  id: string;
  name: string;
  textureHook: string;
  flavorDrivers: string[];
  balancingNotes: string[];
  futureAngle: string;
  applications: string[];
};

export const flavorConstellationLibrary: FlavorConstellation[] = [
  {
    id: "fermented-spark",
    name: "Fermented Spark Mesh",
    textureHook: "Carbonated citrus pearls suspended in alginate film",
    flavorDrivers: [
      "Yuzu curd cultured with jun tea",
      "Koji brine reduced with finger lime oil",
      "Electric daisy tincture for tingling lift",
    ],
    balancingNotes: [
      "Smoked salt honey shard for crunch",
      "Frozen coconut kefir snow to quench acidity",
      "Compressed Asian pear for linear sweetness",
    ],
    futureAngle: "Low-waste carbonation using reclaimed citrus fiber",
    applications: [
      "Welcome toast service amuse",
      "Shelf-stable retail kit with on-demand CO₂ charge",
    ],
  },
  {
    id: "velvet-brine",
    name: "Velvet Brine Cascade",
    textureHook: "Silken custard stabilized with koji whey and sea lettuce gel",
    flavorDrivers: [
      "Smoked maple lacto brine",
      "Braised kombu caramel",
      "Roasted koji oil for umami sheen",
    ],
    balancingNotes: [
      "Pickled spruce tips for brightness",
      "Fermented black apple vinegar",
      "Buckwheat cacao crumble for contrast",
    ],
    futureAngle: "Circular menu design using reclaimed whey streams",
    applications: [
      "Dessert course with warm-cold textural duel",
      "Retail jarred custard with reheat instructions",
    ],
  },
  {
    id: "osmanthus-aerogel",
    name: "Osmanthus Aerogel Bloom",
    textureHook: "Freeze-dried soy milk aerogel layered with hydroponic blossoms",
    flavorDrivers: [
      "Osmanthus blossom distillate",
      "Fermented apricot kernel milk",
      "Kombucha vinegar caramel",
    ],
    balancingNotes: [
      "Charred pine pollen dust",
      "Grapefruit segment cured in jasmine salt",
      "Szechuan peppercorn hydrosol mist",
    ],
    futureAngle: "Climate-adaptive aromatics grown in vertical farms",
    applications: [
      "Tasting menu intermezzo",
      "Retail confection highlighting botanical perfumery",
    ],
  },
  {
    id: "umami-nucleus",
    name: "Umami Nucleus",
    textureHook: "Layered gel terrine alternating broth gel and fibrous mycelium crouton",
    flavorDrivers: [
      "Black koji soy reduction",
      "Roasted seaweed oil infused with charred leek",
      "Cultured sunflower cream",
    ],
    balancingNotes: [
      "Green strawberry kosho",
      "Cold smoked kombu glass",
      "Sprouted barley koji crunch",
    ],
    futureAngle: "Fungi-forward center-of-plate replacing animal marrow",
    applications: [
      "Shareable bar snack",
      "Retail heat-and-eat center with broth concentrate",
    ],
  },
];

export type FutureFoodDriver = {
  id: string;
  theme: string;
  signal: string;
  insight: string;
  action: string;
};

export const futureFoodDrivers: FutureFoodDriver[] = [
  {
    id: "upcycled-streams",
    theme: "Upcycled Fermentation Streams",
    signal: "Koji whey export market up 28% YoY",
    insight: "Beverage brands want ready-to-infuse cultured concentrates for low-waste launches.",
    action: "Prototype shelf-stable koji whey reductions paired with sparkling acid bases.",
  },
  {
    id: "adaptive-aromatics",
    theme: "Adaptive Aromatics",
    signal: "Indoor blossom farms reporting 40% cost drop on osmanthus and jasmine",
    insight: "Vertical agriculture enables perfumed flavor layers previously cost prohibitive.",
    action: "Build aroma libraries that can be misted, spun, or freeze-dried into signature kits.",
  },
  {
    id: "mycelium-protein",
    theme: "Mycelium Protein Architecture",
    signal: "Fungi scaffolding patents growing 3× over two years",
    insight: "Texture innovation is the unlock for fungi-centric center-of-plate adoption.",
    action: "Model terrine-style builds that mimic marrow and foie gras mouthfeel.",
  },
  {
    id: "carbonated-textures",
    theme: "Carbonated Textures",
    signal: "Sparkling solids searches up 62% in global trend dashboards",
    insight: "Consumers seek effervescent bite experiences beyond beverages.",
    action: "Scale alginate-carbonated pearls with rapid pass QA testing protocols.",
  },
];
