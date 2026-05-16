export type TextureDescriptor = {
  id: string;
  family: string;
  descriptors: string[];
  idealPairings: string[];
  suggestedTechniques: string[];
  platingNotes?: string;
};

export const textureAtlas: TextureDescriptor[] = [
  {
    id: "crisp-bright",
    family: "Crisp",
    descriptors: ["snappy", "aerated", "glasslike"],
    idealPairings: ["yuzu gel", "compressed cucumber", "white tea vapor"],
    suggestedTechniques: ["isomalt tuile", "liquid nitrogen shatter", "rapid dehydrate"],
    platingNotes: "Offset with a single satin element to control perceived dryness.",
  },
  {
    id: "velvet-lush",
    family: "Velvet",
    descriptors: ["lush", "slow-melt", "rounded"],
    idealPairings: ["black garlic caramel", "toasted sesame praline", "maraschino cherry skin"],
    suggestedTechniques: ["thermostable ganache", "sous-vide custard", "whipped mascarpone"],
  },
  {
    id: "spark-tension",
    family: "Spark",
    descriptors: ["kinetic", "tingling", "volatile"],
    idealPairings: ["Sichuan pepper oil", "electric daisy", "citric snow"],
    suggestedTechniques: ["carbonic acid pearls", "nitrous espuma", "acidulated dust"],
    platingNotes: "Keep within 8 minute window for peak bloom.",
  },
  {
    id: "smoke-satin",
    family: "Satin",
    descriptors: ["glossy", "smoked", "silken"],
    idealPairings: ["roasted mushroom broth", "miso butterscotch", "charred leek ash"],
    suggestedTechniques: ["gelatin glaze", "smoked agar film", "pacotized parfait"],
  },
];

export type TrendSignal = {
  id: string;
  title: string;
  category: string;
  metric: string;
  delta: string;
  confidence: "low" | "medium" | "high";
  summary: string;
};

export const trendSignals: TrendSignal[] = [
  {
    id: "signal-ferment",
    title: "Koji Ferment x Citrus",
    category: "Flavor Systems",
    metric: "+18% menu adoption",
    delta: "▲ 6.2% vs last quarter",
    confidence: "high",
    summary: "Cross-pollinate dry-aged citrus peels with shiro koji for a bright umami core.",
  },
  {
    id: "signal-hyperlocal",
    title: "Hyperlocal Aromatics",
    category: "Sourcing",
    metric: "62 partner farms",
    delta: "▲ 4 new winemakers onboarded",
    confidence: "medium",
    summary: "Guests respond to micro lot pairings framed with origin cards at the pass.",
  },
  {
    id: "signal-ai",
    title: "AI Assisted Costing",
    category: "Operations",
    metric: "12.4h saved / week",
    delta: "▼ 1.5h vs previous sprint",
    confidence: "high",
    summary: "Recipe variants prioritized by real-time margin guardrails reduce waste 9%.",
  },
];

export const labPlaylists = [
  {
    id: "playlist-chroma",
    title: "Chroma Immersion",
    mood: "High-energy test kitchen",
    tracks: ["Chromatic Lift", "Spectral Drift", "Ultraviolet Baton"],
  },
  {
    id: "playlist-late-service",
    title: "Late Service Calm",
    mood: "After-hours refinement",
    tracks: ["Indigo Static", "Koan for Steam", "Slow Orbit"],
  },
];
