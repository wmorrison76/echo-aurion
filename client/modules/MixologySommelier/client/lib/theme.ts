export const lightTheme = {
  name: "light",
  colors: {
    background: "#FFFFFF",
    foreground: "#1D1D1F",
    primary: "#007AFF",
    secondary: "#5AC8FA",
    accent: "#FF3B30",
    muted: "#F5F5F7",
    border: "#E5E5E7",
    card: "#FFFFFF",
    cardForeground: "#1D1D1F",
  },
  text: { primary: "#1D1D1F", secondary: "#86868B", tertiary: "#A1A1A6" },
  wine: {
    red: "#8B0000",
    white: "#F5DEB3",
    rosé: "#E75480",
    sparkling: "#FFD700",
  },
  glow: {
    primary: "rgba(0, 122, 255, 0)",
    secondary: "rgba(90, 200, 250, 0)",
    accent: "rgba(255, 59, 48, 0)",
  },
};
export const darkTheme = {
  name: "dark",
  colors: {
    background: "#0A0E27",
    foreground: "#00FF9F",
    primary: "#00FF9F",
    secondary: "#FF006E",
    accent: "#00D9FF",
    muted: "#1A1F3A",
    border: "#00FF9F",
    card: "#111827",
    cardForeground: "#00FF9F",
  },
  text: { primary: "#00FF9F", secondary: "#00D9FF", tertiary: "#7B61FF" },
  wine: {
    red: "#FF006E",
    white: "#00FFD9",
    rosé: "#FF006E",
    sparkling: "#00D9FF",
  },
  glow: {
    primary: "rgba(0, 255, 159, 0.3)",
    secondary: "rgba(255, 0, 110, 0.3)",
    accent: "rgba(0, 217, 255, 0.3)",
  },
};
export type Theme = typeof lightTheme;
