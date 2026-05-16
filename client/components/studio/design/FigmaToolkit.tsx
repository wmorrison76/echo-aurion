import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, RefreshCcw } from "lucide-react";

const FIGMA_PLUGIN_URL =
  "https://www.figma.com/community/plugin/747985167520967365/builder-io-ai-powered-figma-to-code-react-vue-tailwind-more";

type FigmaToolkitProps = {
  figmaUrl: string;
  onUrlChange: (url: string) => void;
};

function normalizeEmbedUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const trimmed = raw.trim();
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("figma.com")) {
      if (parsed.pathname.startsWith("/embed")) {
        const innerUrl = parsed.searchParams.get("url");
        if (innerUrl) {
          return `https://www.figma.com/embed?embed_host=builder&url=${encodeURIComponent(innerUrl)}`;
        }
        return trimmed;
      }
      return `https://www.figma.com/embed?embed_host=builder&url=${encodeURIComponent(parsed.toString())}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function FigmaToolkit({ figmaUrl, onUrlChange }: FigmaToolkitProps) {
  const [draft, setDraft] = useState(figmaUrl);
  useEffect(() => {
    setDraft(figmaUrl);
  }, [figmaUrl]);

  const embedUrl = useMemo(() => normalizeEmbedUrl(figmaUrl), [figmaUrl]);
  const hasEmbed = Boolean(embedUrl);

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Launch the Builder.io Figma plugin, select a frame, and export to sync UI blocks back into EchoCoder.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            asChild
            className="gap-2"
            variant="secondary"
          >
            <a href={FIGMA_PLUGIN_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open Figma plugin
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => onUrlChange("")}
            disabled={!figmaUrl}
          >
            <RefreshCcw className="h-4 w-4" />
            Clear embed
          </Button>
        </div>
      </div>

      <Separator />

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          onUrlChange(draft.trim());
        }}
      >
        <label className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Figma share link
        </label>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://www.figma.com/file/..."
          className="h-8 text-xs"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Embed frame
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDraft(figmaUrl)}
            disabled={draft === figmaUrl}
          >
            Reset
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Live preview
        </div>
        {hasEmbed ? (
          <div className="relative overflow-hidden rounded-md border border-border/60">
            <iframe
              key={embedUrl}
              src={embedUrl!}
              title="Figma preview"
              className="h-64 w-full"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
            Paste any Figma file, design, or prototype link above to pin it next to the canvas.
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground">Workflow tips</div>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Compose layouts in Figma and sync via the Builder plugin.</li>
          <li>Use the Design canvas to align components with the imported frame.</li>
          <li>Re-run the plugin after edits to keep EchoCoder in sync.</li>
        </ol>
      </div>
    </div>
  );
}
