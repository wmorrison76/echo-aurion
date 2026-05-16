// EchoCoder Pro Color Theme
// All colors use CSS custom properties for easy customization

export const ECHOCODER_COLORS = {
  // Primary Colors
  primary: {
    deepSlate: "#0F172A",
    cyan: "#00D9FF",
    blue: "#3B82F6",
  },

  // Secondary Colors
  secondary: {
    lightBlue: "#0EA5E9",
    indigo: "#4F46E5",
    purple: "#A855F7",
  },

  // Status Colors
  status: {
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#06B6D4",
  },

  // Neutral/Grayscale
  neutral: {
    background: "#0D1117",
    surface: "#161B22",
    surfaceLight: "#21262D",
    border: "#30363D",
    text: "#E8EAED",
    textSecondary: "#8B949E",
    textMuted: "#6E7681",
  },

  // Semantic Colors
  semantic: {
    completed: "#10B981",
    inProgress: "#3B82F6",
    pending: "#F59E0B",
    error: "#EF4444",
    archived: "#6E7681",
  },

  // Tier Colors
  tier: {
    tier1: "#06B6D4", // Cyan - Quick wins
    tier2: "#3B82F6", // Blue - Strategic
    tier3: "#8B5CF6", // Purple - Security
    tier4: "#EC4899", // Pink - Advanced
  },
};

// CSS Custom Properties to inject into :root
export const CSS_VARIABLES = `
  /* Primary */
  --color-primary-deep-slate: ${ECHOCODER_COLORS.primary.deepSlate};
  --color-primary-cyan: ${ECHOCODER_COLORS.primary.cyan};
  --color-primary-blue: ${ECHOCODER_COLORS.primary.blue};

  /* Secondary */
  --color-secondary-light-blue: ${ECHOCODER_COLORS.secondary.lightBlue};
  --color-secondary-indigo: ${ECHOCODER_COLORS.secondary.indigo};
  --color-secondary-purple: ${ECHOCODER_COLORS.secondary.purple};

  /* Status */
  --color-success: ${ECHOCODER_COLORS.status.success};
  --color-warning: ${ECHOCODER_COLORS.status.warning};
  --color-error: ${ECHOCODER_COLORS.status.error};
  --color-info: ${ECHOCODER_COLORS.status.info};

  /* Neutral */
  --color-background: ${ECHOCODER_COLORS.neutral.background};
  --color-surface: ${ECHOCODER_COLORS.neutral.surface};
  --color-surface-light: ${ECHOCODER_COLORS.neutral.surfaceLight};
  --color-border: ${ECHOCODER_COLORS.neutral.border};
  --color-text: ${ECHOCODER_COLORS.neutral.text};
  --color-text-secondary: ${ECHOCODER_COLORS.neutral.textSecondary};
  --color-text-muted: ${ECHOCODER_COLORS.neutral.textMuted};

  /* Tiers */
  --color-tier-1: ${ECHOCODER_COLORS.tier.tier1};
  --color-tier-2: ${ECHOCODER_COLORS.tier.tier2};
  --color-tier-3: ${ECHOCODER_COLORS.tier.tier3};
  --color-tier-4: ${ECHOCODER_COLORS.tier.tier4};

  /* Semantic */
  --color-completed: ${ECHOCODER_COLORS.semantic.completed};
  --color-in-progress: ${ECHOCODER_COLORS.semantic.inProgress};
  --color-pending: ${ECHOCODER_COLORS.semantic.pending};
  --color-archived: ${ECHOCODER_COLORS.semantic.archived};

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, ${ECHOCODER_COLORS.primary.cyan}, ${ECHOCODER_COLORS.primary.blue});
  --gradient-tier: linear-gradient(135deg, ${ECHOCODER_COLORS.tier.tier1}, ${ECHOCODER_COLORS.tier.tier4});
`;

export function injectThemeVariables() {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    // Extract variables and set on root
    const variables = CSS_VARIABLES.split("\n")
      .filter((line) => line.includes("--"))
      .forEach((line) => {
        const [key, value] = line.split(":").map((s) => s.trim());
        if (key && value) {
          root.style.setProperty(key, value.replace(";", ""));
        }
      });
  }
}

// Utility functions
export function getTierColor(tier: 1 | 2 | 3 | 4): string {
  return ECHOCODER_COLORS.tier[`tier${tier}` as keyof typeof ECHOCODER_COLORS.tier];
}

export function getStatusColor(
  status: "completed" | "inProgress" | "pending" | "error" | "archived"
): string {
  return ECHOCODER_COLORS.semantic[status];
}

export function hexToRgb(hex: string): {
  r: number;
  g: number;
  b: number;
} {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToString(r: number, g: number, b: number): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function getColorWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}
