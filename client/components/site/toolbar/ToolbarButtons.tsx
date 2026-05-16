import React, { forwardRef, useState } from "react";
import { X, Grid3x3, Package, StickyNote, Sparkles, Share2, Copy, Check, Users, Link2 } from "lucide-react";
import { cn } from "@/lib/glass";

interface ToolbarButtonsProps {
  isVertical: boolean;
  isDragOverWhiteboard: boolean;
  isDragOverChat: boolean;
  onPanelAction: (action: string) => void;
  onOpenPanel: (panelId: string) => void;
  onOpenEchoCanvas: () => void;
  onCreateStickyNote: () => void;
}

const btnStyle =
  "h-7 w-7 rounded flex items-center justify-center transition-colors text-foreground/70 hover:text-foreground hover:bg-primary/15 active:bg-primary/25 cursor-pointer flex-shrink-0";
const iconSize = 14;

function SharePanelButton() {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const generateShareLink = () => {
    const panels: string[] = [];
    document.querySelectorAll("[data-panel-id]").forEach((el) => {
      const id = el.getAttribute("data-panel-id");
      if (id) panels.push(id);
    });
    return `${window.location.origin}?share=${btoa(JSON.stringify({ panels, ts: Date.now() }))}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generateShareLink());
    } catch {
      const ta = document.createElement("textarea");
      ta.value = generateShareLink();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowMenu(false); }, 1500);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={btnStyle}
        title="Share Panel Layout"
        data-testid="toolbar-share-panels"
      >
        <Share2 size={iconSize} />
      </button>
      {showMenu && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-popover border border-border rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-foreground/40">Share Layout</div>
          <button onClick={copyLink} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-primary/10 hover:text-foreground transition-colors">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? "Link Copied!" : "Copy Share Link"}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "LUCCCA Panel Layout", url: generateShareLink() });
              } else {
                copyLink();
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-primary/10 hover:text-foreground transition-colors"
          >
            <Users size={12} />
            Share with Team
          </button>
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-primary/10 hover:text-foreground transition-colors"
          >
            <Link2 size={12} />
            Generate Invite Link
          </button>
        </div>
      )}
    </div>
  );
}

export const ToolbarButtons = forwardRef<
  { whiteboardBtn: HTMLButtonElement | null; chatBtn: HTMLButtonElement | null },
  ToolbarButtonsProps
>(({ isVertical, isDragOverWhiteboard, isDragOverChat, onPanelAction, onOpenPanel, onOpenEchoCanvas, onCreateStickyNote }, ref) => {
  const whiteboardBtnRef = React.useRef<HTMLButtonElement>(null);
  const chatBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(ref, () => ({
    whiteboardBtn: whiteboardBtnRef.current,
    chatBtn: chatBtnRef.current,
  }));

  return (
    <>
      {/* Panel Control Buttons */}
      <div className={cn("flex gap-0 flex-shrink-0", isVertical ? "flex-col items-center" : "items-center")}>
        <button onClick={() => onPanelAction("close-all")} className={btnStyle} title="Close All">
          <X size={iconSize} />
        </button>
        <button onClick={() => onPanelAction("stack-grid")} className={btnStyle} title="Grid Layout">
          <Grid3x3 size={iconSize} />
        </button>
        <button onClick={() => onPanelAction("minimize-all")} className={btnStyle} title="Minimize All">
          <Package size={iconSize} />
        </button>
        <div className={isVertical ? "w-4 h-px bg-border/40 my-0.5" : "w-px h-4 bg-border/40 mx-0.5"} />
      </div>

      {/* Essential Tools — Echo Concierge + Quick Launch */}
      <div className={cn("flex gap-0 flex-shrink-0", isVertical ? "flex-col items-center" : "items-center")}>
        <button
          onClick={() => onOpenPanel("echo-concierge")}
          className={cn(btnStyle, "text-amber-400 hover:text-amber-300 relative")}
          title="Echo Concierge — Guest Issues & Service Recovery"
          data-testid="toolbar-echo-concierge"
        >
          <img src="/echo-concierge-toolbar.png" alt="Echo Concierge" className="w-5 h-5" style={{ filter: "brightness(1.2)" }} />
        </button>
        <div className={isVertical ? "w-4 h-px bg-border/40 my-0.5" : "w-px h-4 bg-border/40 mx-0.5"} />
        <button
          onClick={onCreateStickyNote}
          className={cn(btnStyle, "text-yellow-400 hover:text-yellow-300")}
          title="Sticky Notes - Click to create new note"
        >
          <StickyNote size={iconSize} />
        </button>
        <button
          onClick={onOpenEchoCanvas}
          className={cn(btnStyle, "text-primary hover:text-primary")}
          title="Open Echo Canvas"
        >
          <Sparkles size={iconSize} />
        </button>
        <SharePanelButton />
        <div className={isVertical ? "w-4 h-px bg-border/40 my-0.5" : "w-px h-4 bg-border/40 mx-0.5"} />
      </div>
    </>
  );
});

ToolbarButtons.displayName = "ToolbarButtons";
