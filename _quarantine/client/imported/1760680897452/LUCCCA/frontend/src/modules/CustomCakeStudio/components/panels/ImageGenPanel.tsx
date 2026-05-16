// frontend/src/modules/CustomCakeStudio/components/panels/ImageGenPanel.tsx
// EchoCanvas – Image generation panel (compact, scrollable, collapsible, sticky actions)

import React from "react";
import { readFileAsDataURL } from "../../utils/files";
import { useImageGen } from "../../engine/imagegen/useImageGen";
import {
  PROMPT_PRESETS_STR as PROMPT_PRESETS,
  STYLE_PRESETS_STR as STYLE_PRESETS,
} from "../../engine/imagegen/presetCompat";

/* ---------- helpers (normalize presets safely) ---------- */
type Triple = { id: string; title: string; value: string };
function toTriple(v: any, i: number, kind: "prompt" | "style"): Triple {
  if (typeof v === "string") {
    const [id = `${kind}-${i}`, title = "", rest = ""] = String(v).split("|");
    return { id: id.trim(), title: (title || id).trim(), value: (rest || "").trim() };
  }
  const id = (v?.id ?? `${kind}-${i}`).toString().trim();
  const title = (v?.title ?? id).toString().trim();
  const value = (kind === "prompt" ? v?.prompt : v?.token) ?? "";
  return { id, title, value: String(value).trim() };
}

const DEFAULT_PROMPTS: string[] = [
  "hero|Hero Cake|studio photo of a decorated custom cake on a cake stand, soft lighting, high detail, photorealistic",
  "grid|Cupcake Grid|grid of assorted cupcakes, frosting swirls, overhead shot",
  "wedding|Wedding Tiered Cake|three tier wedding cake, white fondant, floral accents, elegant",
  "kids|Kids Theme|birthday cake with cartoon theme, bright colors, playful",
];

/* ---------- small UI bits ---------- */
function Subhead({ children }: { children: React.ReactNode }) {
  return <div className="text-white/70 mb-1">{children}</div>;
}
function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/35">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-white/90 hover:bg-white/5"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium">{title}</span>
        <span className="text-white/60">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
/** prevent canvas/global shortcuts from eating typing (space, arrows, etc.) */
function stopCanvasShortcutsWhenTyping(e: React.KeyboardEvent) {
  const t = e.target as HTMLElement;
  const tag = (t?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || (t as any).isContentEditable) e.stopPropagation();
}

/* ---------- main panel ---------- */
function ImageGenPanelInner() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const resultRef = React.useRef<HTMLImageElement>(null);

  const promptList = React.useMemo(
    () =>
      (Array.isArray(PROMPT_PRESETS) && PROMPT_PRESETS.length > 0 ? PROMPT_PRESETS : DEFAULT_PROMPTS).map((p, i) =>
        toTriple(p, i, "prompt"),
      ),
    [],
  );
  const styleList = React.useMemo(
    () => (Array.isArray(STYLE_PRESETS) ? STYLE_PRESETS : []).map((s, i) => toTriple(s, i, "style")),
    [],
  );

  // “speed” is a hint we pass to the client; ImageGenClient maps it to steps/etc.
  const [speed, setSpeed] = React.useState<"fast" | "balanced" | "quality">("balanced");

  const {
    prompt, setPrompt,
    negative, setNegative,
    styleId, setStyleId,
    refDataURL, setRefDataURL,
    maskDataURL, setMaskDataURL,
    width, setWidth,
    height, setHeight,
    seed, setSeed,
    generating, imageURL, error,
    generate, clear,
  } = useImageGen();

  // mount: sensible defaults + jump to top of panel
  React.useEffect(() => {
    if (!prompt && promptList[0]?.value) setPrompt(promptList[0].value);
    if (!styleId && styleList[0]?.id) setStyleId(styleList[0].id);
    containerRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // after an image arrives, scroll it into view (but keep sticky actions visible)
  React.useEffect(() => {
    if (!imageURL) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [imageURL]);

  const onRefFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setRefDataURL(await readFileAsDataURL(f));
  };
  const onMaskFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setMaskDataURL(await readFileAsDataURL(f));
  };

  const onGenerate = React.useCallback(() => {
    // optional local cap for faster iterations
    if (speed === "fast" && (width ?? 0) > 704) setWidth(704);
    if (speed === "fast" && (height ?? 0) > 704) setHeight(704);
    // pass hint to client (harmless if ignored)
    // @ts-ignore
    return generate({ mode: speed }).catch(() => {});
  }, [generate, speed, width, height, setWidth, setHeight]);

  return (
    <div
      ref={containerRef}
      className="p-0 text-sm text-white/90 h-[calc(100vh-180px)] overflow-auto min-h-0"
      style={{ scrollbarGutter: "stable" }}
      onKeyDownCapture={stopCanvasShortcutsWhenTyping}
    >
      {/* Sticky actions so you never have to scroll to find the button */}
      <div className="sticky top-0 z-10 bg-slate-950/85 backdrop-blur border-b border-white/10 px-3 py-2 flex items-center gap-2">
        <button
          className="px-3 py-1 rounded bg-cyan-600 hover:brightness-110 disabled:opacity-60"
          disabled={!!generating}
          onClick={onGenerate}
          title="Generate (uses the settings below)"
        >
          {generating ? "Generating…" : "Generate"}
        </button>
        <button className="px-3 py-1 rounded bg-slate-700 hover:brightness-110" onClick={clear}>
          Clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-white/60">Speed</span>
          <select
            className="rounded bg-slate-900/70 border border-white/10 px-2 py-1"
            value={speed}
            onChange={(e) => setSpeed(e.target.value as any)}
            title="Fast = lower cost/latency. Quality = more steps (server-dependent)."
          >
            <option value="fast">⚡ Fast</option>
            <option value="balanced">⚖️ Balanced</option>
            <option value="quality">🏆 Quality</option>
          </select>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <Section title="Prompt & Style">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <Subhead>Prompt</Subhead>
              <textarea
                className="w-full rounded border border-white/10 bg-slate-900/60 p-2"
                rows={6}
                value={prompt || ""}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the cake art…"
              />
            </label>

            <div className="space-y-3">
              <label className="block">
                <Subhead>Style</Subhead>
                <select
                  className="w-full rounded border border-white/10 bg-slate-900/60 p-2"
                  value={styleId || ""}
                  onChange={(e) => setStyleId(e.target.value)}
                >
                  {(styleList || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || s.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <Subhead>Negative prompt (optional)</Subhead>
                <input
                  className="w-full rounded border border-white/10 bg-slate-900/60 p-2"
                  value={negative || ""}
                  onChange={(e) => setNegative(e.target.value)}
                  placeholder="avoid, low quality, blurry…"
                />
              </label>
            </div>
          </div>
        </Section>

        <Section title="Advanced" defaultOpen={false}>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            <label className="block">
              <Subhead>Width</Subhead>
              <input
                type="number"
                min={64}
                max={2048}
                step={64}
                className="w-full rounded border border-white/10 bg-slate-900/60 p-2"
                value={Number(width || 768)}
                onChange={(e) => setWidth(parseInt(e.target.value) || 768)}
              />
            </label>
            <label className="block">
              <Subhead>Height</Subhead>
              <input
                type="number"
                min={64}
                max={2048}
                step={64}
                className="w-full rounded border border-white/10 bg-slate-900/60 p-2"
                value={Number(height || 768)}
                onChange={(e) => setHeight(parseInt(e.target.value) || 768)}
              />
            </label>
            <label className="block">
              <Subhead>Seed</Subhead>
              <input
                type="number"
                className="w-full rounded border border-white/10 bg-slate-900/60 p-2"
                value={seed ?? ""}
                onChange={(e) =>
                  setSeed(e.target.value === "" ? undefined : parseInt(e.target.value) || 0)
                }
              />
            </label>
          </div>
        </Section>

        <Section title="Reference & Mask" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <Subhead>Reference image (optional)</Subhead>
              <input type="file" accept="image/*" onChange={onRefFile} />
              {refDataURL && <div className="mt-2 text-white/60 text-xs">attached ✓</div>}
            </label>
            <label className="block">
              <Subhead>Inpaint mask (optional)</Subhead>
              <input type="file" accept="image/*" onChange={onMaskFile} />
              {maskDataURL && <div className="mt-2 text-white/60 text-xs">attached ✓</div>}
            </label>
          </div>
        </Section>

        {error && (
          <div className="text-red-300/90 text-xs whitespace-pre-wrap border border-red-700/50 rounded p-2 bg-red-900/20">
            {String(error)}
          </div>
        )}

        {imageURL && (
          <div className="mt-2">
            <img
              ref={resultRef}
              src={imageURL}
              alt="result"
              className="max-w-full rounded border border-white/10"
            />
          </div>
        )}

        {(promptList || []).length > 0 && (
          <Section title="Quick prompts" defaultOpen={false}>
            <div className="flex flex-wrap gap-2">
              {promptList.map((p) => (
                <button
                  key={p.id}
                  className="px-2 py-1 text-xs rounded bg-slate-800 hover:brightness-110 border border-white/10"
                  onClick={() => setPrompt(p.value)}
                  title={p.value}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function ImageGenPanel() {
  return <ImageGenPanelInner />;
}
export default ImageGenPanel;
export { ImageGenPanel };
