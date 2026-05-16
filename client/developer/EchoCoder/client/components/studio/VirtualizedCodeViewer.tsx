import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ZoomIn, ZoomOut, Search } from "lucide-react";

interface VirtualizedCodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  maxVisibleLines?: number;
}

interface LineData {
  lineNumber: number;
  content: string;
  height: number;
}

export const VirtualizedCodeViewer: React.FC<VirtualizedCodeViewerProps> = ({
  code,
  language = "typescript",
  filename = "code.ts",
  maxVisibleLines = 50,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [searchTerm, setSearchTerm] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Split code into lines with line numbers
  const lines = useMemo(() => {
    return code.split("\n").map((content, idx) => ({
      lineNumber: idx + 1,
      content: content || " ",
      height: 24, // Standard line height in pixels
    }));
  }, [code]);

  // Calculate visible range based on scroll position
  const { startIdx, endIdx } = useMemo(() => {
    const containerHeight = containerRef.current?.clientHeight || 0;
    const visibleLines = Math.ceil(containerHeight / 24);
    const start = Math.max(0, Math.floor(scrollTop / 24) - 5);
    const end = Math.min(lines.length, start + visibleLines + 10);
    return { startIdx: start, endIdx: end };
  }, [scrollTop, lines.length]);

  // Filter lines based on search
  const filteredLines = useMemo(() => {
    if (!searchTerm) return { indices: null, count: 0 };
    const indices: number[] = [];
    lines.forEach((line, idx) => {
      if (line.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        indices.push(idx);
      }
    });
    return { indices, count: indices.length };
  }, [lines, searchTerm]);

  // Visible lines (virtualized)
  const visibleLines = useMemo(() => {
    if (filteredLines.indices) {
      return filteredLines.indices
        .slice(0, maxVisibleLines)
        .map((idx) => lines[idx]);
    }
    return lines.slice(startIdx, endIdx);
  }, [lines, startIdx, endIdx, filteredLines, maxVisibleLines]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [code]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 10, 150));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 10, 50));
  }, []);

  const totalHeight = lines.length * 24;
  const offsetTop = startIdx * 24;

  return (
    <Card className="w-full h-full flex flex-col border-none shadow-none">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {filename}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {language}
            </Badge>
            <Badge variant="outline" className="text-xs ml-auto">
              {lines.length} lines
            </Badge>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
            {searchTerm && (
              <Badge variant="default" className="text-xs ml-auto">
                {filteredLines.count} matches
              </Badge>
            )}
          </div>
          <Button
            onClick={handleZoomOut}
            variant="ghost"
            size="xs"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[40px] text-center">
            {zoom}%
          </span>
          <Button
            onClick={handleZoomIn}
            variant="ghost"
            size="xs"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="xs"
            title="Copy to clipboard"
          >
            {isCopied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-auto bg-slate-950 relative"
          style={{ fontSize: `${zoom}%` }}
        >
          {/* Virtual scrolling container */}
          <div style={{ height: totalHeight, position: "relative" }}>
            {/* Spacer before visible lines */}
            {!filteredLines.indices && startIdx > 0 && (
              <div style={{ height: offsetTop, pointerEvents: "none" }} />
            )}

            {/* Visible lines */}
            <div className="font-mono text-xs text-slate-100">
              {visibleLines.map((line) => (
                <div
                  key={`${line.lineNumber}-${line.content}`}
                  className="flex h-6 border-b border-slate-800"
                >
                  <div className="w-12 flex-shrink-0 text-right pr-3 text-slate-500 bg-slate-900/50 select-none border-r border-slate-800">
                    {line.lineNumber}
                  </div>
                  <div className="flex-1 px-4 py-0 overflow-hidden text-slate-100 whitespace-pre-wrap break-words">
                    {line.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {lines.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No code to display
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VirtualizedCodeViewer;
