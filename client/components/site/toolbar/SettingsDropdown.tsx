/* iter253 · Topbar cleanup — Outlook/Teams/Gmail buttons removed (now in
 * Sidebar → Hotel Operations). Language picker moved into System Settings. */
import React from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/glass";

interface SettingsDropdownProps {
  lang: string;
  setLang: (lang: string) => void;
  isVertical: boolean;
}

const btnStyle =
  "h-7 w-7 rounded flex items-center justify-center transition-colors text-foreground/70 hover:text-foreground hover:bg-primary/15 active:bg-primary/25 cursor-pointer flex-shrink-0";
const iconSize = 14;

export function SettingsDropdown({ lang: _lang, setLang: _setLang, isVertical }: SettingsDropdownProps) {
  return (
    <div className={cn("flex gap-0 flex-shrink-0", isVertical ? "flex-col items-center mt-auto" : "items-center ml-auto")}>
      <button
        type="button"
        onClick={() => { window.dispatchEvent(new CustomEvent("open-settings")); }}
        className={btnStyle}
        title="System Settings"
        data-testid="topbar-settings-btn"
      >
        <Settings size={iconSize} />
      </button>
    </div>
  );
}
