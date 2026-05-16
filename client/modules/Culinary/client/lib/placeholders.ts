export const FALLBACK_GALLERY_IMAGE: { dataUrl: string; mime: string } = {
  dataUrl: `data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#4A8BFF'/><stop offset='100%' stop-color='#9A6BFF'/></linearGradient></defs><rect width='600' height='400' rx='40' fill='url(#g)'/><rect x='48' y='56' width='504' height='160' rx='28' fill='rgba(255,255,255,0.16)'/><circle cx='120' cy='260' r='36' fill='rgba(255,255,255,0.22)'/><circle cx='200' cy='300' r='52' fill='rgba(255,255,255,0.12)'/><text x='50%' y='55%' font-family=\"Inter,Arial,sans-serif\" font-size='48' font-weight='600' fill='white' text-anchor='middle'>LUCCCA</text></svg>"
  )}`,
  mime: "image/svg+xml",
};

export const createFoodPlaceholder = (
  title: string,
  emoji: string,
  from: string,
  to: string,
) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" rx="42" fill="url(#grad)" />
      <rect x="42" y="60" width="516" height="160" rx="28" fill="rgba(255,255,255,0.15)" />
      <rect x="78" y="96" width="180" height="108" rx="28" fill="rgba(255,255,255,0.2)" />
      <rect x="300" y="108" width="222" height="88" rx="24" fill="rgba(255,255,255,0.12)" />
      <text x="50%" y="62%" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="600" fill="white" text-anchor="middle">${emoji}</text>
      <text x="50%" y="77%" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="500" fill="white" text-anchor="middle">${title}</text>
    </svg>`
  )}`;

type DemoImagePreset = {
  name: string;
  title: string;
  emoji: string;
  from: string;
  to: string;
  tags: string[];
};

const DEMO_IMAGE_PRESETS: DemoImagePreset[] = [
  {
    name: "pizza.svg",
    title: "Wood-Fired Pizza",
    emoji: "🍕",
    from: "#f97316",
    to: "#ea580c",
    tags: ["food", "pizza", "demo"],
  },
  {
    name: "burger.svg",
    title: "Craft Burger",
    emoji: "🍔",
    from: "#ef4444",
    to: "#dc2626",
    tags: ["food", "burger", "demo"],
  },
  {
    name: "salad.svg",
    title: "Garden Salad",
    emoji: "🥗",
    from: "#22c55e",
    to: "#15803d",
    tags: ["food", "salad", "demo"],
  },
  {
    name: "pasta.svg",
    title: "Truffle Pasta",
    emoji: "🍝",
    from: "#facc15",
    to: "#eab308",
    tags: ["food", "pasta", "demo"],
  },
  {
    name: "steak.svg",
    title: "Seared Steak",
    emoji: "🥩",
    from: "#fb7185",
    to: "#be123c",
    tags: ["food", "steak", "demo"],
  },
  {
    name: "sushi.svg",
    title: "Sushi Board",
    emoji: "🍣",
    from: "#38bdf8",
    to: "#0ea5e9",
    tags: ["food", "sushi", "demo"],
  },
  {
    name: "dessert.svg",
    title: "Patisserie",
    emoji: "🧁",
    from: "#c084fc",
    to: "#8b5cf6",
    tags: ["food", "dessert", "demo"],
  },
  {
    name: "bread.svg",
    title: "Artisan Bread",
    emoji: "🥖",
    from: "#facc72",
    to: "#f59e0b",
    tags: ["food", "bread", "demo"],
  },
];

export const DEMO_PLACEHOLDERS = DEMO_IMAGE_PRESETS.map((preset) => ({
  name: preset.name,
  dataUrl: createFoodPlaceholder(
    preset.title,
    preset.emoji,
    preset.from,
    preset.to,
  ),
  tags: preset.tags,
  mime: "image/svg+xml",
}));
