import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Save,
  Settings,
  Sun,
  Moon,
} from "lucide-react";

export type RightSidebarProps = {
  /** Optional label to show what area is using this (e.g., "pastry") */
  context?: string;
  /** Called when Save is clicked. If not provided, we dispatch "recipe-save-request". */
  onSaveDraft?: () => void;
  /** Called when Publish is clicked. If not provided, we dispatch "recipe-publish-request". */
  onPublish?: () => void;
  /** Start collapsed */
  defaultCollapsed?: boolean;
};

const BTN =
  "w-full h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/90 text-sm flex items-center gap-2 justify-center transition";

function emit(name: string, detail?: Record<string, unknown>) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    /* noop for SSR */
  }
}

export default function RightSidebar({
  context = "pastry",
  onSaveDraft,
  onPublish,
  defaultCollapsed = false,
}: RightSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [dark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  // Keep <html class="dark"> in sync
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const widthClass = collapsed ? "w-[56px]" : "w-[320px]";
  const title = useMemo(
    () => (context ? `${context[0].toUpperCase()}${context.slice(1)}` : "Tools"),
    [context]
  );

  const handleSave = () => {
    if (onSaveDraft) onSaveDraft();
    else emit("recipe-save-request", { context });
  };

  const handlePublish = () => {
    if (onPublish) onPublish();
    else emit("recipe-publish-request", { context });
  };

  return (
    <aside
      className={[
        "h-full border-l border-black/10 dark:border-white/10 bg-slate-900/70 text-white/90",
        "backdrop-blur-xl shrink-0 transition-[width] duration-200",
        widthClass,
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2">
        {!collapsed && (
          <div className="px-2">
            <div className="text-[13px] uppercase tracking-wide opacity-80">
              {title}
            </div>
            <div className="text-[11px] opacity-60">Recipe tools & actions</div>
          </div>
        )}
        <button
          className="ml-auto mr-1 grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Body */}
      <div className={collapsed ? "px-1 pb-3" : "px-3 pb-3"}>
        {/* Quick actions */}
        <section className={collapsed ? "space-y-2" : ""}>
          {!collapsed ? (
            <div className="grid grid-cols-2 gap-2">
              <button className={BTN} onClick={handleSave}>
                <Save size={16} />
                <span>Save</span>
              </button>
              <button
                className={BTN}
                onClick={() => emit("pastry-open-settings")}
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 grid place-items-center"
                onClick={handleSave}
                title="Save"
                aria-label="Save"
              >
                <Save size={16} />
              </button>
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 grid place-items-center"
                onClick={() => emit("pastry-open-settings")}
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          )}
        </section>

        {/* Appearance */}
        <section className={collapsed ? "mt-3" : "mt-4"}>
          {!collapsed ? (
            <>
              <div className="mb-2 text-xs uppercase tracking-wide opacity-70">
                Appearance
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={BTN}
                  onClick={() => setDark(false)}
                  aria-pressed={!dark}
                >
                  <Sun size={16} />
                  <span>Light</span>
                </button>
                <button
                  className={BTN}
                  onClick={() => setDark(true)}
                  aria-pressed={dark}
                >
                  <Moon size={16} />
                  <span>Dark</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 grid place-items-center"
                onClick={() => setDark(false)}
                title="Light mode"
                aria-label="Light mode"
              >
                <Sun size={16} />
              </button>
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 grid place-items-center"
                onClick={() => setDark(true)}
                title="Dark mode"
                aria-label="Dark mode"
              >
                <Moon size={16} />
              </button>
            </div>
          )}
        </section>

        {/* Navigation helpers */}
        <section className={collapsed ? "mt-3" : "mt-4"}>
          {!collapsed ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                className={BTN}
                onClick={() => emit("pastry-home")}
                title="Go to Recipes"
              >
                <Home size={16} />
                <span>Home</span>
              </button>
              <button
                className={BTN}
                onClick={handlePublish}
                title="Publish"
              >
                <Save size={16} />
                <span>Publish</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 grid place-items-center"
                onClick={() => emit("pastry-home")}
                title="Home"
                aria-label="Home"
              >
                <Home size={16} />
              </button>
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 grid place-items-center"
                onClick={handlePublish}
                title="Publish"
                aria-label="Publish"
              >
                <Save size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
