import React, { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Move3D,
  Square,
  Circle,
  Lasso,
  Scan,
  Crop,
  Wand2,
  Pencil,
  Eraser,
  Brush,
  Magnet,
  Hand,
  ZoomIn,
  PenTool,
  Type,
  Droplet,
  Pipette,
  Shapes,
  Ruler,
} from "lucide-react";
export type ToolId =
  | "move"
  | "marquee"
  | "lasso"
  | "crop"
  | "wand"
  | "brush"
  | "pencil"
  | "eraser"
  | "pen"
  | "type"
  | "pan"
  | "zoom"
  | "pipette"
  | "shape"
  | "ruler";
interface Group {
  id: string;
  label: string;
  defaultTool: ToolId;
  tools: { id: ToolId; label: string; Icon: any }[];
}
const GROUPS: Group[] = [
  {
    id: "select",
    label: "Select",
    defaultTool: "move",
    tools: [
      { id: "move", label: "Move", Icon: Move3D },
      { id: "marquee", label: "Marquee", Icon: Square },
      { id: "lasso", label: "Lasso", Icon: Lasso },
      { id: "crop", label: "Crop", Icon: Crop },
      { id: "wand", label: "Magic Wand", Icon: Wand2 },
    ],
  },
  {
    id: "paint",
    label: "Paint",
    defaultTool: "brush",
    tools: [
      { id: "brush", label: "Brush", Icon: Brush },
      { id: "pencil", label: "Pencil", Icon: Pencil },
      { id: "eraser", label: "Eraser", Icon: Eraser },
      { id: "pipette", label: "Eyedropper", Icon: Pipette },
    ],
  },
  {
    id: "vector",
    label: "Vector",
    defaultTool: "pen",
    tools: [
      { id: "pen", label: "Pen", Icon: PenTool },
      { id: "shape", label: "Shape", Icon: Shapes },
      { id: "type", label: "Type", Icon: Type },
      { id: "ruler", label: "Measure", Icon: Ruler },
    ],
  },
  {
    id: "navigate",
    label: "Navigate",
    defaultTool: "pan",
    tools: [
      { id: "pan", label: "Hand", Icon: Hand },
      { id: "zoom", label: "Zoom", Icon: ZoomIn },
      { id: "marquee", label: "Zoom Rect", Icon: Scan },
      { id: "wand", label: "Snap", Icon: Magnet },
    ],
  },
];
export default function Toolbar({
  value,
  onChange,
}: {
  value: ToolId;
  onChange: (t: ToolId) => void;
}) {
  const [selected, setSelected] = useState<Record<string, ToolId>>(
    Object.fromEntries(GROUPS.map((g) => [g.id, g.defaultTool])),
  );
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 16, y: 200 });
  const dragging = useState({ active: false, dx: 0, dy: 0 })[0]; // Follow sidebar width changes so the toolbar doesn't get hidden useEffect(() => { const onWidth = (e: any) => { const w = Number(e?.detail ?? 0); setPos((p) => ({ x: Math.max(16, Math.min(p.x, w + 24)), y: p.y })); }; window.addEventListener("sidebar:width", onWidth as any); return () => window.removeEventListener("sidebar:width", onWidth as any); }, []); const startDrag = (e: React.MouseEvent) => { const startX = e.clientX - pos.x; const startY = e.clientY - pos.y; dragging.active = true; dragging.dx = startX; dragging.dy = startY; const onMove = (ev: MouseEvent) => { if (!dragging.active) return; setPos({ x: Math.max(8, ev.clientX - dragging.dx), y: Math.max(64, ev.clientY - dragging.dy), }); }; const onUp = () => { dragging.active = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }; return ( <TooltipProvider> <div className="absolute z-40 flex flex-col gap-2 p-2 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-apple dark:shadow-[0_0_20px_rgba(56,189,248,0.35)]" style={{ left: pos.x, top: pos.y }} > <div className="h-3 cursor-move rounded-md bg-gradient-to-r from-muted/80 to-muted/40 mb-1" onMouseDown={startDrag} /> {GROUPS.map((g) => { const active = selected[g.id]; const ActiveIcon = g.tools.find((t) => t.id === active)!.Icon; return ( <DropdownMenu key={g.id}> <DropdownMenuTrigger asChild> <button aria-label={g.label} className={cn("h-10 w-10 rounded-lg border border-border/60 bg-background/80 hover:bg-accent/60 transition-colors", value === active ?"ring-2 ring-primary" : undefined, )} onClick={() => onChange(active)} > <ActiveIcon className="h-5 w-5 mx-auto text-foreground" /> </button> </DropdownMenuTrigger> <DropdownMenuContent side="right" align="start" className="p-1 grid grid-cols-3 gap-1" > {g.tools.map((t) => ( <DropdownMenuItem key={t.id} className="p-0" onClick={() => { setSelected((s) => ({ ...s, [g.id]: t.id })); onChange(t.id); }} > <button className="h-9 w-9 rounded-md border bg-card/80 hover:bg-accent/60"> <t.Icon className="h-5 w-5 mx-auto" /> </button> </DropdownMenuItem> ))} </DropdownMenuContent> </DropdownMenu> ); })} </div> </TooltipProvider> );
}
