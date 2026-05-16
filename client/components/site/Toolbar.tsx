import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
import { Moon, Sun, Settings, GripVertical, Share2, Users, Copy, Check, Link2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MinimizedPanel {
  id: string;
  title: string;
  icon: string;
  isImageIcon?: boolean;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  ja: "🇯🇵",
  pt: "🇧🇷",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  pt: "Português",
};

function PanelShareButton() {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const generateShareLink = () => {
    // Get currently open panels from the panel store
    const panels: string[] = [];
    document.querySelectorAll("[data-panel-id]").forEach((el) => {
      const id = el.getAttribute("data-panel-id");
      if (id) panels.push(id);
    });
    const encoded = btoa(JSON.stringify({ panels, ts: Date.now() }));
    const link = `${window.location.origin}?share=${encoded}`;
    setShareLink(link);
    return link;
  };

  const copyToClipboard = async () => {
    const link = generateShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DropdownMenu open={showShare} onOpenChange={setShowShare}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center justify-center w-9 h-9 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors outline-none focus:outline-none"
          title="Share Panel Layout"
          type="button"
          data-testid="toolbar-share-panels"
        >
          <Share2 size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-foreground/60">
          Share Panel Layout
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={copyToClipboard}
          className="flex items-center gap-2"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          <span className="text-sm">{copied ? "Copied!" : "Copy Share Link"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const link = generateShareLink();
            if (navigator.share) {
              navigator.share({ title: "LUCCCA Panel Layout", url: link });
            } else {
              copyToClipboard();
            }
          }}
          className="flex items-center gap-2"
        >
          <Users size={14} />
          <span className="text-sm">Share with Team</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            generateShareLink();
          }}
          className="flex items-center gap-2"
        >
          <Link2 size={14} />
          <span className="text-sm">Generate Invite Link</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Toolbar() {
  const { theme } = useTheme();
  const { lang, setLang } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [minimizedPanels, setMinimizedPanels] = useState<MinimizedPanel[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handlePanelMinimized = (e: Event) => {
      const detail = (e as CustomEvent<MinimizedPanel>).detail;
      if (!detail) return;

      setMinimizedPanels((prev) => {
        const exists = prev.some((p) => p.id === detail.id);
        if (!exists) {
          return [...prev, detail];
        }
        return prev;
      });
    };

    const handlePanelRestored = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail) return;

      setMinimizedPanels((prev) => prev.filter((p) => p.id !== detail.id));
    };

    window.addEventListener("panel-minimized", handlePanelMinimized as any);
    window.addEventListener("restore-panel", handlePanelRestored as any);

    return () => {
      window.removeEventListener(
        "panel-minimized",
        handlePanelMinimized as any,
      );
      window.removeEventListener("restore-panel", handlePanelRestored as any);
    };
  }, []);

  if (!mounted) {
    return <div className="h-14 bg-card border-b" />;
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-20",
        "h-12 bg-card/80 border-b border-border/50",
        "backdrop-blur-sm supports-[backdrop-filter]:bg-card/60",
        "flex items-center justify-between px-3",
        "lg:left-[60px]",
      )}
    >
      {/* Left - Minimized Panels Dock */}
      <div className="flex items-center gap-1 flex-1">
        {minimizedPanels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("restore-panel", { detail: { id: panel.id } }),
              );
            }}
            className="inline-flex items-center justify-center w-14 h-14 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors outline-none"
            title={`Restore ${panel.title}`}
            type="button"
          >
            {panel.isImageIcon && panel.icon?.startsWith("http") ? (
              <img
                src={panel.icon}
                alt={panel.title}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <span className="text-2xl">{panel.icon || "📦"}</span>
            )}
          </button>
        ))}
      </div>

      {/* Center - empty */}
      <div className="flex-1" />

      {/* Right - controls */}
      <div className="flex items-center gap-2 justify-end flex-1">
        {/* Whiteboard Share */}
        <PanelShareButton />

        {/* Whiteboard Open */}
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("open-panel", { detail: { id: "whiteboard" } }),
            )
          }
          className="inline-flex items-center justify-center w-9 h-9 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors outline-none focus:outline-none"
          title="Open Whiteboard"
          type="button"
          data-testid="toolbar-whiteboard"
        >
          <GripVertical size={16} />
        </button>

        {/* Settings/Gear Icon */}
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("open-settings", {
                detail: { tab: "appearance" },
              }),
            )
          }
          className="inline-flex items-center justify-center w-9 h-9 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors outline-none focus:outline-none"
          title="Settings"
          type="button"
        >
          <Settings size={16} />
        </button>

        {/* Language Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center justify-center w-9 h-9 text-foreground/60 hover:text-foreground transition-colors outline-none focus:outline-none"
              type="button"
              title={LANGUAGE_NAMES[lang]}
            >
              <span className="text-lg">{LANGUAGE_FLAGS[lang]}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel className="text-xs text-foreground/60">
              Language
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(LANGUAGE_NAMES).map(([langCode, name]) => (
              <DropdownMenuItem
                key={langCode}
                onClick={() => {
                  setLang(langCode as any);
                  // Force a re-render of all components
                  window.location.reload();
                }}
                className={lang === langCode ? "bg-primary/20" : ""}
              >
                <span className="mr-2 text-lg">{LANGUAGE_FLAGS[langCode]}</span>
                <span className="text-sm">{name}</span>
                {lang === langCode && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
