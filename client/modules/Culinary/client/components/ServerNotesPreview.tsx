import type { ColorScheme, LayoutPreset } from "../../shared/server-notes";

export type ServerNotesPreviewProps = {
  layout: LayoutPreset;
  color: ColorScheme;
  pageFormat: "standard" | "index-card";
  variant?: "full" | "mini" | "icon";
};

const baseCardClass =
  "relative rounded-lg border shadow-sm overflow-hidden bg-white dark:bg-slate-900";

const headingRule = (color: string) => ({ background: color });

export default function ServerNotesPreview({
  layout,
  color,
  pageFormat,
  variant = "full",
}: ServerNotesPreviewProps) {
  if (variant === "icon") {
    return (
      <div
        className="relative h-14 w-24 rounded-lg border bg-white dark:bg-slate-950"
        style={{ borderColor: color.primary }}
      >
        <div
          className="absolute inset-1 rounded-md"
          style={{
            border: `1px solid ${color.secondary}`,
            background: color.background,
          }}
        />
        <div
          className={`absolute ${layout.standardLayout.headerStyle === "centered" ? "left-1/2 -translate-x-1/2" : "left-2"} top-2 h-1 w-14 rounded-full`}
          style={headingRule(color.primary)}
        />
        <div className="absolute left-2 right-2 bottom-2 top-6 grid grid-cols-3 gap-1">
          {layout.standardLayout.includeImages && (
            <div
              className="rounded-sm border"
              style={{
                borderColor: color.secondary,
                background: color.background,
              }}
            />
          )}
          <div
            className={
              layout.standardLayout.includeImages ? "col-span-2" : "col-span-3"
            }
          >
            <div
              className="mb-1 h-1.5 w-3/4 rounded-full"
              style={headingRule(color.accent)}
            />
            <div className="space-y-1">
              <div
                className="h-1 w-full rounded-full"
                style={headingRule(color.secondary)}
              />
              <div
                className="h-1 w-5/6 rounded-full"
                style={headingRule(color.secondary)}
              />
              <div
                className="h-1 w-2/3 rounded-full"
                style={headingRule(color.secondary)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageFormat === "index-card") {
    const headerMinimal = layout.indexCardLayout.headerStyle === "minimal";
    const fontSize =
      layout.indexCardLayout.fontSize === "small"
        ? "text-[10px]"
        : "text-[12px]";
    const cardMaxWidth = variant === "mini" ? 280 : 320;
    const cardHeightClass = variant === "mini" ? "h-44" : "h-48";

    return (
      <div className="flex flex-col items-center gap-3">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className={`${baseCardClass} w-full border-[1.5px] ${cardHeightClass}`}
            style={{
              borderColor: color.secondary,
              background: color.background,
              maxWidth: cardMaxWidth,
            }}
          >
            {headerMinimal ? (
              <div className="px-3 pt-3">
                <div
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: color.secondary }}
                >
                  Signature Card
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: color.primary }}
                >
                  Pan-Roasted Salmon
                </div>
                <div
                  className="mt-2 h-[2px] w-full"
                  style={headingRule(color.accent)}
                />
              </div>
            ) : (
              <div
                className="border-b px-3 py-2 text-center text-white"
                style={{ background: color.primary, borderColor: color.accent }}
              >
                <div className="text-[10px] uppercase opacity-80">
                  Signature Card
                </div>
                <div className="text-sm font-semibold">Pan-Roasted Salmon</div>
              </div>
            )}
            <div
              className={`p-3 leading-tight ${fontSize}`}
              style={{ color: color.text }}
            >
              {layout.indexCardLayout.includeImages && (
                <div className="float-right ml-3">
                  <div
                    className="h-16 w-20 rounded border"
                    style={{ borderColor: color.secondary, background: "#fff" }}
                  />
                </div>
              )}
              {layout.indexCardLayout.contentPriority !== "instructions" && (
                <div className="space-y-1">
                  <div
                    className="font-semibold"
                    style={{ color: color.primary }}
                  >
                    Ingredients
                  </div>
                  <ul className="ml-4 list-disc space-y-0.5">
                    <li>6 oz salmon</li>
                    <li>Lemon butter</li>
                    <li>Sea salt</li>
                  </ul>
                </div>
              )}
              {layout.indexCardLayout.contentPriority !== "ingredients" && (
                <div className="mt-2 space-y-1">
                  <div
                    className="font-semibold"
                    style={{ color: color.primary }}
                  >
                    Steps
                  </div>
                  <ol className="ml-4 list-decimal space-y-0.5">
                    <li>Season and sear</li>
                    <li>Finish with butter</li>
                    <li>Plate elegantly</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const maxWidth = variant === "full" ? 520 : 420;
  const headerPadding = variant === "mini" ? "px-4 py-3" : "px-6 py-4";
  const mainPadding = variant === "mini" ? "p-4" : "p-6";
  const mainGap = variant === "mini" ? "gap-3" : "gap-4";
  const titleSize = variant === "mini" ? "text-lg" : "text-xl";
  const headerLogoPosition =
    variant === "mini" ? "right-4 top-3 h-8 w-8" : "right-6 top-4 h-10 w-10";
  const notePadding = variant === "mini" ? "p-2.5" : "p-3";
  const sectionGap = variant === "mini" ? "gap-3" : "gap-4";
  const footerText = variant === "mini" ? "text-[9px]" : "text-[10px]";

  return (
    <div className="flex w-full justify-center">
      <div
        className={`${baseCardClass} w-full`}
        style={{
          background: color.background,
          borderColor: color.primary,
          maxWidth,
          aspectRatio: "26 / 17",
        }}
      >
        <div
          className="absolute inset-[6px] rounded-md"
          style={{ border: `1px solid ${color.secondary}` }}
        />
        <div className="absolute left-4 -top-2 z-10">
          <div
            className={`rounded border ${
              variant === "mini"
                ? "px-1.5 py-0.5 text-[9px]"
                : "px-2 py-0.5 text-[10px]"
            }`}
            style={{
              background: color.background,
              borderColor: color.primary,
              color: color.primary,
            }}
          >
            {layout.name}
          </div>
        </div>
        <header
          className={`relative border-b ${headerPadding} ${layout.standardLayout.headerStyle === "centered" ? "text-center" : ""}`}
          style={{
            borderColor: color.primary,
            fontFamily: layout.standardLayout.fontFamily,
          }}
        >
          <div
            className={`absolute ${headerLogoPosition} rounded-sm border`}
            style={{ borderColor: color.secondary, background: "#fff" }}
          />
          <div
            className="text-[11px] uppercase tracking-wider"
            style={{ color: color.secondary }}
          >
            The Garden Bistro
          </div>
          <div className={`font-bold ${titleSize}`} style={{ color: color.primary }}>
            Roasted Chicken with Herbs
          </div>
        </header>
        <main
          className={`grid h-full grid-cols-12 ${mainGap} ${mainPadding}`}
          style={{ fontFamily: layout.standardLayout.fontFamily }}
        >
          {layout.standardLayout.includeImages && (
            <div className="col-span-4 hidden md:block">
              <div
                className="h-24 w-full rounded border"
                style={{ borderColor: color.secondary, background: "#fff" }}
              />
            </div>
          )}
          <div
            className={
              layout.standardLayout.includeImages ? "col-span-8" : "col-span-12"
            }
          >
            <div
              className={`rounded-md border bg-white/70 text-xs dark:bg-slate-900/40 ${notePadding}`}
              style={{ borderColor: color.accent }}
            >
              <div
                className="text-[11px] font-semibold"
                style={{ color: color.primary }}
              >
                Selling Notes
              </div>
              <p className="mt-1 text-xs" style={{ color: color.secondary }}>
                Classic, comforting, and aromatic—perfectly golden and juicy.
              </p>
            </div>
            <div className={`mt-3 grid grid-cols-2 ${sectionGap} text-[11px]`}>
              <div>
                <div className="font-semibold" style={{ color: color.primary }}>
                  Ingredients
                </div>
                <ul className="ml-4 list-disc space-y-0.5">
                  <li>Whole chicken</li>
                  <li>Fresh thyme</li>
                  <li>Garlic & lemon</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold" style={{ color: color.primary }}>
                  Preparation
                </div>
                <ol className="ml-4 list-decimal space-y-0.5">
                  <li>Season generously</li>
                  <li>Roast until crisp</li>
                  <li>Rest and carve</li>
                </ol>
              </div>
            </div>
            <div className={`mt-4 grid grid-cols-2 ${sectionGap} ${footerText}`}>
              <div
                className={`rounded-md border bg-white/70 dark:bg-slate-900/40 ${
                  variant === "mini" ? "p-2" : "p-2.5"
                }`}
                style={{ borderColor: color.accent }}
              >
                <div className="font-semibold" style={{ color: color.primary }}>
                  Beverage Suggestions
                </div>
                <ul className="ml-4 list-disc space-y-0.5">
                  <li>Chardonnay</li>
                  <li>Pinot Noir</li>
                </ul>
              </div>
              <div
                className={`rounded-md border bg-white/70 text-right dark:bg-slate-900/40 ${
                  variant === "mini" ? "p-2" : "p-2.5"
                }`}
                style={{ borderColor: color.accent, color: color.secondary }}
              >
                Dist Date: 06/01/2025
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
