import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Scale,
  NotebookPen,
  ArrowLeftRight,
  CircleDollarSign,
  HelpCircle,
  Save,
} from "lucide-react";

function TabLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = new URLSearchParams(loc.search).get("tab") ?? "search";
  const value = new URLSearchParams(to.split("?")[1] || "").get("tab") || "";
  const isActive = active === value;
  return (
    <Link
      to={to}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${isActive ? "bg-white text-black shadow" : "text-foreground/80 hover:text-foreground"} bg-muted`}
    >
      {label}
    </Link>
  );
}

export default function TopTabs() {
  const isAdd =
    new URLSearchParams(useLocation().search).get("tab") === "add-recipe";
  const [showHelp, setShowHelp] = React.useState(false);
  return (
    <header className="border-b backdrop-blur bg-transparent supports-[backdrop-filter]:bg-transparent">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4">
        <a
          href="/?tab=search"
          className="flex items-center gap-2"
          aria-label="Home"
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Faccc7891edf04665961a321335d9540b%2F3daeec161e9e466b9f19d163a3c58f71?format=webp&width=360"
            alt="Echo Recipe Pro"
            className="h-8 md:h-9"
          />
          <span className="sr-only">Echo Recipe Pro</span>
        </a>
        <nav className="flex items-center gap-2 rounded-xl bg-muted p-1">
          <TabLink to="/?tab=search" label="Recipe Search" />
          <TabLink to="/?tab=gallery" label="Gallery" />
          <TabLink to="/?tab=add-recipe" label="Add Recipe" />
          <TabLink to="/?tab=saas" label="SaaS" />
          <TabLink to="/?tab=production" label="Production" />
        </nav>
        <div className="flex items-center gap-1">
          <button
            title="Finalize & Clear"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("recipe:action", {
                  detail: { type: "finalizeImport" },
                }),
              );
            }}
            className="p-1 rounded hover:bg-black/10"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            title="Help"
            onClick={() => setShowHelp(true)}
            className="p-1 rounded hover:bg-black/10"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {isAdd && (
            <div className="flex items-center gap-1 pr-1">
              <button
                title="Convert Units"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("recipe:action", {
                      detail: { type: "convertUnits" },
                    }),
                  )
                }
                className="p-1 rounded hover:bg-black/10"
              >
                <Scale className="w-4 h-4" />
              </button>
              <button
                title="Save Snapshot"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("recipe:action", {
                      detail: { type: "saveVersion" },
                    }),
                  )
                }
                className="p-1 rounded hover:bg-black/10"
              >
                <NotebookPen className="w-4 h-4" />
              </button>
              <button
                title="Convert Units"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("recipe:action", {
                      detail: { type: "convertUnits" },
                    }),
                  )
                }
                className="p-1 rounded hover:bg-black/10"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <button
                title="Currency"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("recipe:action", {
                      detail: { type: "cycleCurrency" },
                    }),
                  )
                }
                className="p-1 rounded hover:bg-black/10"
              >
                <CircleDollarSign className="w-4 h-4" />
              </button>
              <button
                title="R&D Labs (Yield Lab)"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("recipe:action", {
                      detail: { type: "openYieldLab" },
                    }),
                  )
                }
                className="p-1 rounded hover:bg-black/10"
              >
                {/* Flask icon via SVG to avoid extra imports */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 2v3l-5 9a5 5 0 0 0 4.5 7h5a5 5 0 0 0 4.5-7l-5-9V2" />
                  <path d="M8 6h8" />
                </svg>
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Help & Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm leading-relaxed">
            <p className="font-medium">Keyboard shortcuts (hold Control/⌘):</p>
            <ul className="list-disc pl-5">
              <li>P=Pastry</li>
              <li>T=Technique</li>
              <li>C=Course</li>
              <li>A=Allergens</li>
              <li>D=Diets</li>
              <li>M=Meal Period</li>
              <li>U=Cuisine</li>
              <li>S=Service Style</li>
              <li>Y=Difficulty</li>
              <li>E=Equipment</li>
            </ul>
            <p className="font-medium mt-2">Adding recipes</p>
            <ul className="list-disc pl-5">
              <li>
                Use Add Recipe to type/paste. “Save” persists immediately. CSV
                export includes Directions; Share and SMS send a formatted
                recipe.
              </li>
              <li>
                Import from the web: paste a URL in the right sidebar. The
                importer reads JSON‑LD or page sections, pulls times/yield, and
                attaches the cover image to the gallery.
              </li>
            </ul>
            <p className="font-medium mt-2">Importing a Book PDF</p>
            <ul className="list-disc pl-5">
              <li>
                Select a PDF in Recipe Search → Library. We parse the appendix
                (recipe index) and show a selectable checklist with hidden
                scrollbar.
              </li>
              <li>
                Choose the recipes to import; each is processed one‑by‑one with
                page cross‑reference, metadata (prep/cook/total/yield/temp) and
                a photo when available.
              </li>
            </ul>
            <p className="font-medium mt-2">Gallery</p>
            <ul className="list-disc pl-5">
              <li>
                Grid or Masonry layout; choose thumbnail size
                (Small/Medium/Large). Hover to get a soft glow; click to open
                the lightbox.
              </li>
              <li>
                Use tags to group photos and create Look Books. Open a Look Book
                for a flipbook with click, swipe or arrow‑key navigation.
              </li>
            </ul>
            <p className="text-muted-foreground">
              Tip: Use “Link to recipes” to auto‑match images to recipes by
              filename.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
