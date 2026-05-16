/**
 * iter176 · Appearance & Settings (panel wrapper)
 * Mounts EnhancedAppearanceSettings directly — the full theme/typography/
 * notifications/privacy/integrations surface. Theme persistence was fixed
 * via initializeTheme() in App.tsx and the font-family CSS var in
 * theme-manager.applyTheme.
 */
import React from "react";
import EnhancedAppearanceSettings from "../../components/site/EnhancedAppearanceSettings";

export default function AppearanceSettings() {
  return (
    <div data-testid="appearance-settings-panel" style={{ height: "100%", overflow: "auto", padding: "24px", background: "var(--background, #04060d)" }}>
      <EnhancedAppearanceSettings />
    </div>
  );
}
