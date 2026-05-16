export interface Settings {
  flavors: string[];
  frostings: string[];
  fillings: string[];
  cakeTypes?: string[];
  icings?: string[];
}

const DEFAULTS: Settings = {
  flavors: [
    "Vanilla Bean",
    "Chocolate Fudge",
    "Red Velvet",
    "Lemon Chiffon",
    "Carrot Cake",
  ],
  frostings: ["Buttercream", "Cream Cheese", "Ganache", "Whipped Cream"],
  fillings: [
    "Raspberry Jam",
    "Lemon Curd",
    "Chocolate Mousse",
    "Strawberry Compote",
  ],
  cakeTypes: [
    "Sponge Cake",
    "Pound Cake",
    "Chiffon Cake",
    "Carrot Cake",
    "Cheesecake",
    "Mousse Cake",
    "Tiramisu",
    "Red Velvet",
  ],
  icings: ["Buttercream", "Cream Cheese", "Ganache", "Whipped Cream", "Fondant", "Royal Icing"],
};

const KEY = "cake_studio_settings_v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Settings;
    return {
      flavors: parsed.flavors?.length ? parsed.flavors : DEFAULTS.flavors,
      frostings: parsed.frostings?.length ? parsed.frostings : DEFAULTS.frostings,
      fillings: parsed.fillings?.length ? parsed.fillings : DEFAULTS.fillings,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
