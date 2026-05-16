/**
 * ResponsivePanelExample
 * 
 * Demonstrates best practices for making panel content responsive.
 * This component automatically adapts its layout based on panel width.
 */

import React, { useRef } from "react";
import { useResponsivePanelContent, useResponsiveGrid } from "@/hooks/useResponsivePanelContent";
import { cn } from "@/lib/glass";

interface DemoProps {
  title?: string;
}

export function ResponsivePanelExample({ title = "Responsive Content" }: DemoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  
  const dims = useResponsivePanelContent(containerRef);
  const { columns: gridColumns, gap: gridGap } = useResponsiveGrid();

  // Responsive spacing based on panel width
  const padding = Math.round(16 * dims.scale);
  const gap = Math.round(12 * dims.scale);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header - scales with container */}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <h2 className="text-lg font-semibold text-foreground">
          {title}
          <span className="text-xs text-foreground/60 ml-2">
            ({dims.width}×{dims.height}px)
          </span>
        </h2>
        <p className="text-xs text-foreground/50 mt-1">
          Mode: {dims.isCompact ? "Compact" : dims.isNormal ? "Normal" : "Expanded"}
        </p>
      </div>

      {/* Main content area - fully responsive */}
      <div className="flex-1 overflow-auto">
        <div
          style={{
            padding: `${padding}px`,
            display: "flex",
            flexDirection: "column",
            gap: `${gap}px`,
          }}
        >
          {/* Info Cards - layout changes based on width */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                dims.isCompact
                  ? "1fr"
                  : dims.isNormal
                    ? "repeat(2, 1fr)"
                    : "repeat(3, 1fr)",
              gap: `${gap}px`,
            }}
          >
            <InfoCard title="Width" value={`${dims.width}px`} />
            <InfoCard title="Height" value={`${dims.height}px`} />
            <InfoCard title="Scale" value={`${(dims.scale * 100).toFixed(0)}%`} />
          </div>

          {/* Responsive Layout Indicator */}
          <div className="bg-surface/50 border border-border/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Active Breakpoints
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Badge active={dims.isMobile} label="Mobile" />
              <Badge active={dims.isTablet} label="Tablet" />
              <Badge active={dims.isDesktop} label="Desktop" />
              <Badge active={dims.isCompact} label="Compact" />
              <Badge active={dims.isNormal} label="Normal" />
              <Badge active={dims.isExpanded} label="Expanded" />
            </div>
          </div>

          {/* Content Demo - changes based on size */}
          {dims.isCompact ? (
            <CompactModeContent />
          ) : dims.isNormal ? (
            <NormalModeContent />
          ) : (
            <ExpandedModeContent />
          )}

          {/* Responsive Grid Example */}
          <div className="bg-surface/30 border border-border/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Responsive Grid ({gridColumns} columns)
            </h3>
            <div
              ref={gridRef}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                gap: `${gridGap}px`,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-primary/10 border border-primary/20 rounded p-2"
                  style={{ minHeight: "60px" }}
                >
                  <p className="text-xs text-foreground/70 truncate">
                    Item {i + 1}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="text-xs text-foreground/60 bg-background/50 p-3 rounded border border-border/20">
            <p className="font-semibold text-foreground/80 mb-1">💡 Tips:</p>
            <ul className="space-y-1">
              <li>• Resize the panel by dragging its edges</li>
              <li>• Content automatically adjusts layout</li>
              <li>• Spacing and text scale proportionally</li>
              <li>• Grid columns change based on width</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-surface/50 border border-border/30 rounded-lg p-3">
      <p className="text-xs text-foreground/60">{title}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={cn(
        "px-2 py-1 rounded text-xs font-medium transition-colors",
        active
          ? "bg-primary/30 text-primary border border-primary/50"
          : "bg-background/50 text-foreground/40 border border-border/20",
      )}
    >
      {label}
    </div>
  );
}

function CompactModeContent() {
  return (
    <div className="bg-surface/30 border border-border/20 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">
        📱 Compact Mode
      </h3>
      <p className="text-xs text-foreground/70 mb-2">
        Content displays in a single column layout for narrow panels (&lt; 600px).
      </p>
      <div className="space-y-2">
        <div className="bg-primary/10 h-8 rounded flex items-center px-2">
          <span className="text-xs text-foreground/60">Row 1</span>
        </div>
        <div className="bg-primary/10 h-8 rounded flex items-center px-2">
          <span className="text-xs text-foreground/60">Row 2</span>
        </div>
        <div className="bg-primary/10 h-8 rounded flex items-center px-2">
          <span className="text-xs text-foreground/60">Row 3</span>
        </div>
      </div>
    </div>
  );
}

function NormalModeContent() {
  return (
    <div className="bg-surface/30 border border-border/20 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">
        💻 Normal Mode
      </h3>
      <p className="text-xs text-foreground/70 mb-2">
        Content displays in a two-column layout for medium panels (600-1000px).
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary/10 h-12 rounded flex items-center px-2">
          <span className="text-xs text-foreground/60">Column A</span>
        </div>
        <div className="bg-primary/10 h-12 rounded flex items-center px-2">
          <span className="text-xs text-foreground/60">Column B</span>
        </div>
        <div className="bg-primary/10 h-12 rounded flex items-center px-2">
          <span className="text-xs text-foreground/60">Column C</span>
        </div>
        <div className="bg-primary/10 h-12 rounded flex items-center px-2">
          <span className="text-xs text-foreground/60">Column D</span>
        </div>
      </div>
    </div>
  );
}

function ExpandedModeContent() {
  return (
    <div className="bg-surface/30 border border-border/20 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">
        🖥️ Expanded Mode
      </h3>
      <p className="text-xs text-foreground/70 mb-2">
        Content displays in a three-column layout for wide panels (&gt; 1000px).
      </p>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-primary/10 h-16 rounded flex items-center justify-center"
          >
            <span className="text-xs text-foreground/60">Item {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResponsivePanelExample;
