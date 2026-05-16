import { Palette } from "lucide-react";

export default function ThemeToggle() {
  return (
    <button
      aria-label="Open appearance settings"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("open-settings", { detail: { tab: "appearance" } }),
        )
      }
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent"
    >
      <Palette className="h-4 w-4" />
    </button>
  );
}
