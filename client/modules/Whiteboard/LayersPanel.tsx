import React, { useState, useCallback, useMemo } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Trash2,
  Type,
  Square,
  StickyNote,
  PanelRight,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/glass";
import type { CanvasState, CanvasSelectable } from "./types";
interface LayerItem {
  kind: "shape" | "text" | "sticky" | "embed";
  id: string;
  name: string;
  icon: React.ReactNode;
  visible: boolean;
  locked: boolean;
}
interface LayersPanelProps {
  canvasState: CanvasState;
  selectedTargets: CanvasSelectable[];
  onSelectionChange: (targets: CanvasSelectable[]) => void;
  onDelete: (target: CanvasSelectable) => void;
  onReorder?: (items: CanvasSelectable[]) => void;
  readOnly?: boolean;
}
export const LayersPanel: React.FC<LayersPanelProps> = ({
  canvasState,
  selectedTargets,
  onSelectionChange,
  onDelete,
  readOnly = false,
}) => {
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<string>>(new Set());
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(""); // Build layer list from all elements const allLayers: LayerItem[] = [ ...canvasState.shapes.map((s) => ({ kind:"shape" as const, id: s.id, name: `Shape - ${s.type}`, icon: <Square size={14} />, visible: !hiddenLayers.has(`shape:${s.id}`), locked: lockedLayers.has(`shape:${s.id}`), })), ...canvasState.texts.map((t) => ({ kind:"text" as const, id: t.id, name: `Text:"${t.text.slice(0, 20)}${t.text.length > 20 ?"..." :""}"`, icon: <Type size={14} />, visible: !hiddenLayers.has(`text:${t.id}`), locked: lockedLayers.has(`text:${t.id}`), })), ...canvasState.stickyNotes.map((n) => ({ kind:"sticky" as const, id: n.id, name: `Note:"${n.text.slice(0, 20)}${n.text.length > 20 ?"..." :""}"`, icon: <StickyNote size={14} />, visible: !hiddenLayers.has(`sticky:${n.id}`), locked: lockedLayers.has(`sticky:${n.id}`), })), ...canvasState.panelEmbeds.map((e) => ({ kind:"embed" as const, id: e.id, name: `Panel - ${e.widgetTitle || e.widgetType ||"Embed"}`, icon: <PanelRight size={14} />, visible: !hiddenLayers.has(`embed:${e.id}`), locked: lockedLayers.has(`embed:${e.id}`), })), ].reverse(); // Reverse so newest items appear at top // Filter layers based on search query const layers = useMemo(() => { if (!searchQuery.trim()) return allLayers; const query = searchQuery.toLowerCase(); return allLayers.filter( (layer) => layer.name.toLowerCase().includes(query) || layer.kind.toLowerCase().includes(query), ); }, [allLayers, searchQuery]); const isLayerSelected = useCallback( (layer: LayerItem) => { return selectedTargets.some( (t) => t.kind === layer.kind && t.id === layer.id, ); }, [selectedTargets], ); const handleLayerClick = useCallback( (layer: LayerItem, e: React.MouseEvent) => { if (e.shiftKey) { // Multi-select onSelectionChange([ ...selectedTargets, { kind: layer.kind, id: layer.id }, ]); } else if (e.ctrlKey || e.metaKey) { // Toggle selection onSelectionChange( selectedTargets.some( (t) => t.kind === layer.kind && t.id === layer.id, ) ? selectedTargets.filter( (t) => !(t.kind === layer.kind && t.id === layer.id), ) : [...selectedTargets, { kind: layer.kind, id: layer.id }], ); } else { // Single select onSelectionChange([{ kind: layer.kind, id: layer.id }]); } }, [selectedTargets, onSelectionChange], ); const handleToggleVisibility = useCallback( (layer: LayerItem) => { const key = `${layer.kind}:${layer.id}`; const newHidden = new Set(hiddenLayers); if (newHidden.has(key)) { newHidden.delete(key); } else { newHidden.add(key); } setHiddenLayers(newHidden); }, [hiddenLayers], ); const handleToggleLock = useCallback( (layer: LayerItem) => { if (readOnly) return; const key = `${layer.kind}:${layer.id}`; const newLocked = new Set(lockedLayers); if (newLocked.has(key)) { newLocked.delete(key); } else { newLocked.add(key); } setLockedLayers(newLocked); }, [lockedLayers, readOnly], ); const handleDelete = useCallback( (layer: LayerItem) => { if (readOnly) return; onDelete({ kind: layer.kind, id: layer.id }); }, [onDelete, readOnly], ); return ( <div className="w-full h-full flex flex-col bg-background border-l border-border/30 rounded-lg overflow-hidden"> {/* Header */} <div className="px-4 py-3 border-b border-border/20 bg-secondary/20 space-y-3"> <div className="flex items-center justify-between"> <h3 className="text-sm font-semibold text-foreground">Layers</h3> <p className="text-xs text-foreground/50"> {layers.length}/{allLayers.length} </p> </div> {/* Search Bar */} <div className="relative"> <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" /> <input type="text" placeholder="Search layers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-8 py-1.5 bg-secondary/50 text-xs text-foreground placeholder:text-foreground/40 rounded border border-border/20 focus:border-primary focus:outline-none transition-colors" /> {searchQuery && ( <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors" > <X size={14} /> </button> )} </div> </div> {/* Layers List */} <div className="flex-1 overflow-y-auto"> {layers.length === 0 ? ( <div className="flex items-center justify-center h-full text-foreground/50 text-sm"> No objects on canvas </div> ) : ( <div className="space-y-0.5 p-2"> {layers.map((layer) => ( <div key={`${layer.kind}:${layer.id}`} draggable onDragStart={() => setDraggedLayer(`${layer.kind}:${layer.id}`)} onDragEnd={() => setDraggedLayer(null)} onClick={(e) => handleLayerClick(layer, e)} className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer group", isLayerSelected(layer) ?"bg-primary/20 text-primary" :"bg-secondary/30 text-foreground/70 hover:bg-secondary/50", draggedLayer === `${layer.kind}:${layer.id}` &&"opacity-50", )} > {/* Drag Handle */} <GripVertical size={12} className="text-foreground/30 cursor-grab" /> {/* Icon */} <div className="flex-shrink-0">{layer.icon}</div> {/* Name */} <div className="flex-1 truncate">{layer.name}</div> {/* Visibility Toggle */} <button onClick={(e) => { e.stopPropagation(); handleToggleVisibility(layer); }} className="opacity-0 group-hover:opacity-100 transition-opacity" title={layer.visible ?"Hide" :"Show"} > {layer.visible ? ( <Eye size={14} /> ) : ( <EyeOff size={14} className="text-foreground/40" /> )} </button> {/* Lock Toggle */} {!readOnly && ( <button onClick={(e) => { e.stopPropagation(); handleToggleLock(layer); }} className="opacity-0 group-hover:opacity-100 transition-opacity" title={layer.locked ?"Unlock" :"Lock"} > {layer.locked ? ( <Lock size={14} className="text-amber-500" /> ) : ( <Unlock size={14} className="text-foreground/40" /> )} </button> )} {/* Delete */} {!readOnly && ( <button onClick={(e) => { e.stopPropagation(); handleDelete(layer); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive" title="Delete" > <Trash2 size={14} /> </button> )} </div> ))} </div> )} </div> {/* Footer Info */} <div className="px-4 py-2 bg-secondary/10 border-t border-border/20 text-xs text-foreground/50"> <p>Click to select • Shift+Click to multi-select</p> <p>Eye icon to hide • Lock to prevent moves</p> </div> </div> );
};
