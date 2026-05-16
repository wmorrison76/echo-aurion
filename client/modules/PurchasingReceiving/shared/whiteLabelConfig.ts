export interface WhiteLabelColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  text: string;
  textSecondary: string;
  border: string;
}
export interface WhiteLabelTypography {
  fontFamily: string;
  headingFont: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}
export interface WhiteLabelSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
}
export interface WhiteLabelBranding {
  appName: string;
  appDescription: string;
  logoUrl: string;
  logoUrlDark: string;
  faviconUrl: string;
  primaryEmail: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  socialLinks: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}
export interface WhiteLabelFeatureFlags {
  enableNotifications: boolean;
  enablePayments: boolean;
  enableReporting: boolean;
  enableMultiOutlet: boolean;
  enableMobileApp: boolean;
  enableAnalytics: boolean;
  enableAuditLogs: boolean;
  enableAdvancedAnalytics: boolean;
  enableMultiCurrency: boolean;
  enableWebhooks: boolean;
}
export interface WhiteLabelCustomization {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  colors: WhiteLabelColors;
  typography: WhiteLabelTypography;
  spacing: WhiteLabelSpacing;
  branding: WhiteLabelBranding;
  featureFlags: WhiteLabelFeatureFlags;
  customCSS?: string;
  customJavaScript?: string;
  metadata: { createdAt: string; updatedAt: string; createdBy: string };
}
export const DEFAULT_WHITE_LABEL_CONFIG: WhiteLabelCustomization = {
  id: "default",
  name: "Default Theme",
  domain: "default",
  isActive: true,
  colors: {
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    accent: "#EC4899",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    error: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#0EA5E9",
    text: "#1F2937",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    headingFont: "Inter, system-ui, sans-serif",
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  branding: {
    appName: "Lucca",
    appDescription: "Restaurant Management Platform",
    logoUrl: "/logo.svg",
    logoUrlDark: "/logo-dark.svg",
    faviconUrl: "/favicon.ico",
    primaryEmail: "hello@lucca.io",
    supportEmail: "support@lucca.io",
    supportPhone: "+1-800-LUCCA-APP",
    website: "https://lucca.io",
    socialLinks: {
      twitter: "https://twitter.com/lucca",
      facebook: "https://facebook.com/lucca",
      instagram: "https://instagram.com/lucca",
      linkedin: "https://linkedin.com/company/lucca",
    },
  },
  featureFlags: {
    enableNotifications: true,
    enablePayments: true,
    enableReporting: true,
    enableMultiOutlet: true,
    enableMobileApp: true,
    enableAnalytics: true,
    enableAuditLogs: true,
    enableAdvancedAnalytics: true,
    enableMultiCurrency: true,
    enableWebhooks: true,
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "system",
  },
};
export function generateCSSVariables(config: WhiteLabelCustomization): string {
  const { colors, typography, spacing } = config;
  let css = ":root {\n"; // Color variables Object.entries(colors).forEach(([key, value]) => { const varName = `--color-${key.replace(/([A-Z])/g,"-$1").toLowerCase()}`; css += ` ${varName}: ${value};\n`; }); // Typography variables Object.entries(typography.fontSize).forEach(([key, value]) => { css += ` --font-size-${key}: ${value};\n`; }); Object.entries(typography.fontWeight).forEach(([key, value]) => { css += ` --font-weight-${key}: ${value};\n`; }); css += ` --font-family: ${typography.fontFamily};\n`; css += ` --font-family-heading: ${typography.headingFont};\n`; // Spacing variables Object.entries(spacing).forEach(([key, value]) => { css += ` --spacing-${key}: ${value};\n`; }); css +="}\n"; return css;
}
export function validateWhiteLabelConfig(
  config: Partial<WhiteLabelCustomization>,
): string[] {
  const errors: string[] = [];
  if (!config.id) {
    errors.push("White-label ID is required");
  }
  if (!config.name) {
    errors.push("White-label name is required");
  }
  if (!config.domain) {
    errors.push("Domain is required");
  }
  if (config.colors) {
    const requiredColors = Object.keys(DEFAULT_WHITE_LABEL_CONFIG.colors);
    const providedColors = Object.keys(config.colors);
    const missingColors = requiredColors.filter(
      (c) => !providedColors.includes(c),
    );
    if (missingColors.length > 0) {
      errors.push(`Missing colors: ${missingColors.join(",")}`);
    }
  }
  if (config.branding) {
    if (!config.branding.appName) {
      errors.push("App name is required in branding");
    }
    if (!config.branding.logoUrl) {
      errors.push("Logo URL is required in branding");
    }
  }
  return errors;
}
export function mergeWhiteLabelConfig(
  baseConfig: WhiteLabelCustomization,
  customConfig: Partial<WhiteLabelCustomization>,
): WhiteLabelCustomization {
  return {
    ...baseConfig,
    ...customConfig,
    colors: { ...baseConfig.colors, ...(customConfig.colors || {}) },
    typography: {
      ...baseConfig.typography,
      ...(customConfig.typography || {}),
      fontSize: {
        ...baseConfig.typography.fontSize,
        ...(customConfig.typography?.fontSize || {}),
      },
      fontWeight: {
        ...baseConfig.typography.fontWeight,
        ...(customConfig.typography?.fontWeight || {}),
      },
    },
    spacing: { ...baseConfig.spacing, ...(customConfig.spacing || {}) },
    branding: {
      ...baseConfig.branding,
      ...(customConfig.branding || {}),
      socialLinks: {
        ...baseConfig.branding.socialLinks,
        ...(customConfig.branding?.socialLinks || {}),
      },
    },
    featureFlags: {
      ...baseConfig.featureFlags,
      ...(customConfig.featureFlags || {}),
    },
    metadata: { ...baseConfig.metadata, ...(customConfig.metadata || {}) },
  };
}
