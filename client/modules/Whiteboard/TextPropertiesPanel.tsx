import React from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/glass";
interface TextPropertiesPanelProps {
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight?: "normal" | "bold";
  isItalic?: boolean;
  isUnderline?: boolean;
  textAlign?: "left" | "center" | "right";
  onFontFamilyChange: (family: string) => void;
  onFontSizeChange: (size: number) => void;
  onColorChange: (color: string) => void;
  onFontWeightChange: (weight: "normal" | "bold") => void;
  onItalicChange: (isItalic: boolean) => void;
  onUnderlineChange: (isUnderline: boolean) => void;
  onTextAlignChange: (align: "left" | "center" | "right") => void;
}
const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier", value: "'Courier New', monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { label: "Trebuchet", value: "'Trebuchet MS', sans-serif" },
];
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];
export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({
  fontFamily,
  fontSize,
  color,
  fontWeight = "normal",
  isItalic = false,
  isUnderline = false,
  textAlign = "left",
  onFontFamilyChange,
  onFontSizeChange,
  onColorChange,
  onFontWeightChange,
  onItalicChange,
  onUnderlineChange,
  onTextAlignChange,
}) => {
  // Find font family label const currentFontLabel = FONT_FAMILIES.find((f) => f.value === fontFamily)?.label ||"Arial"; return ( <div className="space-y-3 p-3 bg-secondary/40 border border-border/30 rounded-lg"> {/* Font Family */} <div className="space-y-1.5"> <p className="text-xs text-foreground/60 font-semibold uppercase tracking-wider"> Font </p> <DropdownMenu> <DropdownMenuTrigger asChild> <button className="w-full px-3 py-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-between border border-border/20 transition-colors"> <span className="truncate">{currentFontLabel}</span> <ChevronDown size={14} /> </button> </DropdownMenuTrigger> <DropdownMenuContent className="w-48"> {FONT_FAMILIES.map((font) => ( <DropdownMenuItem key={font.value} onClick={() => onFontFamilyChange(font.value)} className="cursor-pointer" > <span style={{ fontFamily: font.value }}>{font.label}</span> </DropdownMenuItem> ))} </DropdownMenuContent> </DropdownMenu> </div> {/* Font Size */} <div className="space-y-1.5"> <div className="flex items-center justify-between"> <p className="text-xs text-foreground/60 font-semibold uppercase tracking-wider"> Size </p> <span className="text-xs text-foreground/70 font-mono"> {fontSize}px </span> </div> <div className="flex gap-2"> <input type="range" min="8" max="72" value={fontSize} onChange={(e) => onFontSizeChange(parseInt(e.target.value))} className="flex-1" title={`Font size: ${fontSize}px`} /> </div> {/* Quick size presets */} <div className="grid grid-cols-4 gap-1"> {[12, 16, 20, 24].map((size) => ( <button key={size} onClick={() => onFontSizeChange(size)} className={cn("p-1.5 rounded text-xs font-semibold transition-all", fontSize === size ?"bg-primary text-primary-foreground" :"bg-secondary/50 text-foreground/70 hover:bg-secondary", )} title={`${size}px`} > {size} </button> ))} </div> </div> {/* Color */} <div className="space-y-1.5"> <p className="text-xs text-foreground/60 font-semibold uppercase tracking-wider"> Color </p> <div className="flex items-center gap-2"> <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border/20" title="Text color" /> <span className="text-xs text-foreground/70 flex-1 truncate font-mono"> {color.toUpperCase()} </span> </div> </div> {/* Text Formatting */} <div className="space-y-1.5"> <p className="text-xs text-foreground/60 font-semibold uppercase tracking-wider"> Format </p> <div className="grid grid-cols-3 gap-1"> <button onClick={() => onFontWeightChange(fontWeight ==="bold" ?"normal" :"bold") } className={cn("p-2 rounded transition-all flex items-center justify-center", fontWeight ==="bold" ?"bg-primary text-primary-foreground" :"bg-secondary/50 text-foreground/70 hover:bg-secondary", )} title="Bold (Ctrl+B)" > <Bold size={16} /> </button> <button onClick={() => onItalicChange(!isItalic)} className={cn("p-2 rounded transition-all flex items-center justify-center", isItalic ?"bg-primary text-primary-foreground" :"bg-secondary/50 text-foreground/70 hover:bg-secondary", )} title="Italic (Ctrl+I)" > <Italic size={16} /> </button> <button onClick={() => onUnderlineChange(!isUnderline)} className={cn("p-2 rounded transition-all flex items-center justify-center", isUnderline ?"bg-primary text-primary-foreground" :"bg-secondary/50 text-foreground/70 hover:bg-secondary", )} title="Underline (Ctrl+U)" > <Underline size={16} /> </button> </div> </div> {/* Text Alignment */} <div className="space-y-1.5"> <p className="text-xs text-foreground/60 font-semibold uppercase tracking-wider"> Align </p> <div className="grid grid-cols-3 gap-1"> <button onClick={() => onTextAlignChange("left")} className={cn("p-2 rounded transition-all flex items-center justify-center", textAlign ==="left" ?"bg-primary text-primary-foreground" :"bg-secondary/50 text-foreground/70 hover:bg-secondary", )} title="Align left" > <AlignLeft size={16} /> </button> <button onClick={() => onTextAlignChange("center")} className={cn("p-2 rounded transition-all flex items-center justify-center", textAlign ==="center" ?"bg-primary text-primary-foreground" :"bg-secondary/50 text-foreground/70 hover:bg-secondary", )} title="Align center" > <AlignCenter size={16} /> </button> <button onClick={() => onTextAlignChange("right")} className={cn("p-2 rounded transition-all flex items-center justify-center", textAlign ==="right" ?"bg-primary text-primary-foreground" :"bg-secondary/50 text-foreground/70 hover:bg-secondary", )} title="Align right" > <AlignRight size={16} /> </button> </div> </div> </div> );
};
