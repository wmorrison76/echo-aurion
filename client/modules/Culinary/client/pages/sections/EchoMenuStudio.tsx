import { ResponsiveImage } from "@/components/ResponsiveImage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useHistory } from "@/hooks/use-history";
import { useSaveShortcut } from "@/hooks/use-save-shortcut";
import { useUndoRedoFeedback } from "@/components/UndoRedoFeedback";
import { formatCurrencyValue } from "./dish-assembly/utils";
import {
  getSavedDesigns,
  saveDesign,
  deleteDesign,
  getLastAutoSaveDesign,
} from "@/lib/menu-studio-storage";
import { useAppData } from "@/context/AppDataContext";
import { GalleryImagePicker } from "@/components/menu-studio/GalleryImagePicker";
import { SaveLoadDialog } from "@/components/menu-studio/SaveLoadDialog";
import { exportDesignAsPDF, exportDesignAsSVG, exportAllergenMatrixPDF } from "@/lib/menu-studio-export";
import { useTranslation } from "@/context/LanguageContext";
import { ALLERGEN_TAG_MAP, type AllergenTagDef } from "@/lib/taxonomy";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BetweenHorizontalStart,
  BetweenVerticalStart,
  Circle,
  Copy,
  Download,
  FilePlus,
  Grid3X3,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Minus,
  Move,
  Pin,
  PinOff,
  Plus,
  Ruler,
  Sparkles,
  Square,
  Trash2,
  Type,
  Wand2,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  Save,
  ShieldAlert,
} from "lucide-react";

export type DesignerElementType =
  | "heading"
  | "subheading"
  | "body"
  | "menu-item"
  | "image"
  | "shape"
  | "divider";

export type DesignerElement = {
  id: string;
  type: DesignerElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  text?: string;
  description?: string;
  price?: number;
  currency?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  color?: string;
  accentColor?: string;
  imageUrl?: string;
  objectFit?: "cover" | "contain";
  shape?: "rectangle" | "ellipse";
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  thickness?: number;
  locked?: boolean;
  mask?: ElementMask;
  allergenTags?: string[];   // slugs from ALLERGEN_TAG_MAP for menu-item elements
};

type PolygonPoint = {
  x: number;
  y: number;
};

type ElementMask = {
  type: "polygon";
  points: PolygonPoint[];
};

type MaskEditorState = {
  elementId: string;
  points: PolygonPoint[];
  preview: PolygonPoint | null;
};

type CanvasSettings = {
  background: string;
  margin: number;
  bleed: number;
  columns: number;
  gutter: number;
  showGrid: boolean;
  showMargins: boolean;
  showBleed: boolean;
  showColumns: boolean;
  zoom: number;
  gridSize: number;
};

type PageSize = {
  width: number;
  height: number;
};

type PrintPreset = {
  id: string;
  label: string;
  widthPx: number;
  heightPx: number;
  widthIn: number;
  heightIn: number;
  bleedIn: number;
  safeMarginIn: number;
  bleedPx: number;
  safeMarginPx: number;
  dpi: number;
  colorProfile: string;
  orientation: "portrait" | "landscape";
  description?: string;
};

type PrintPresetInput = {
  id: string;
  label: string;
  dpi: number;
  colorProfile: string;
  orientation?: "portrait" | "landscape";
  description?: string;
  widthIn?: number;
  heightIn?: number;
  widthMm?: number;
  heightMm?: number;
  bleedIn?: number;
  bleedMm?: number;
  safeMarginIn?: number;
  safeMarginMm?: number;
};

type MenuTemplate = {
  id: string;
  name: string;
  description: string;
  elements: Array<Omit<DesignerElement, "id">>;
  settings?: Partial<CanvasSettings>;
  pageSize?: PageSize;
};

type ElementDragState = {
  id: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

const TEXT_EDITABLE_TYPES: DesignerElementType[] = [
  "heading",
  "subheading",
  "body",
  "menu-item",
];

const isTextEditableElement = (element: DesignerElement) =>
  TEXT_EDITABLE_TYPES.includes(element.type);

const createDraftFromElement = (
  element: DesignerElement,
): Partial<DesignerElement> => {
  if (element.type === "menu-item") {
    return {
      name: element.name ?? "",
      text: element.text ?? "",
      description: element.description ?? "",
      price: element.price,
      currency: element.currency ?? "USD",
    };
  }
  return {
    text: element.text ?? "",
  };
};

const extractDraftChanges = (
  element: DesignerElement,
  draft: Partial<DesignerElement>,
): Partial<DesignerElement> => {
  const updates: Partial<DesignerElement> = {};
  if ("text" in draft) {
    updates.text = draft.text ?? "";
  }
  if (element.type === "menu-item") {
    if ("name" in draft) {
      updates.name = draft.name ?? element.name;
    }
    if ("description" in draft) {
      updates.description = draft.description ?? "";
    }
    if ("price" in draft) {
      updates.price = draft.price === undefined ? undefined : draft.price;
    }
    if ("currency" in draft) {
      updates.currency = draft.currency ?? element.currency ?? "USD";
    }
  }
  return updates;
};

type FloatingPanelState = {
  x: number;
  y: number;
  pinned: boolean;
};

type FontDefinition = {
  label: string;
  family: string;
  value: string;
  importUrl: string;
};

const FONT_LIBRARY: FontDefinition[] = [
  {
    label: "Playfair Display",
    family: "Playfair Display",
    value: "'Playfair Display', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  },
  {
    label: "Cormorant Garamond",
    family: "Cormorant Garamond",
    value: "'Cormorant Garamond', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap",
  },
  {
    label: "Lora",
    family: "Lora",
    value: "'Lora', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
  },
  {
    label: "DM Sans",
    family: "DM Sans",
    value: "'DM Sans', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  },
  {
    label: "Inter",
    family: "Inter",
    value: "'Inter', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  {
    label: "Montserrat",
    family: "Montserrat",
    value: "'Montserrat', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
  },
  {
    label: "Source Serif 4",
    family: "Source Serif 4",
    value: "'Source Serif 4', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&display=swap",
  },
  {
    label: "Libre Baskerville",
    family: "Libre Baskerville",
    value: "'Libre Baskerville', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  },
  {
    label: "Bodoni Moda",
    family: "Bodoni Moda",
    value: "'Bodoni Moda', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&display=swap",
  },
  {
    label: "EB Garamond",
    family: "EB Garamond",
    value: "'EB Garamond', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap",
  },
  {
    label: "Merriweather",
    family: "Merriweather",
    value: "'Merriweather', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;500;600;700&display=swap",
  },
  {
    label: "Work Sans",
    family: "Work Sans",
    value: "'Work Sans', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap",
  },
  {
    label: "Figtree",
    family: "Figtree",
    value: "'Figtree', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap",
  },
  {
    label: "Raleway",
    family: "Raleway",
    value: "'Raleway', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap",
  },
  {
    label: "Poppins",
    family: "Poppins",
    value: "'Poppins', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  },
  {
    label: "Space Grotesk",
    family: "Space Grotesk",
    value: "'Space Grotesk', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  },
  {
    label: "Crimson Pro",
    family: "Crimson Pro",
    value: "'Crimson Pro', serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&display=swap",
  },
  {
    label: "Rubik",
    family: "Rubik",
    value: "'Rubik', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
  },
  {
    label: "Manrope",
    family: "Manrope",
    value: "'Manrope', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
  },
  {
    label: "Quicksand",
    family: "Quicksand",
    value: "'Quicksand', sans-serif",
    importUrl:
      "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap",
  },
];

const FONT_LIBRARY_BY_VALUE = new Map(
  FONT_LIBRARY.map((font) => [font.value, font]),
);

const FONT_LIBRARY_BY_FAMILY = new Map(
  FONT_LIBRARY.map((font) => [font.family, font]),
);

const DEFAULT_FONT_VALUE = FONT_LIBRARY[0]?.value ?? "serif";

const COLOR_PALETTES: Array<{ name: string; swatches: string[] }> = [
  {
    name: "Earthy Mineral",
    swatches: ["#fef6ec", "#c0763a", "#4a3b2a", "#8d7350", "#1f2933"],
  },
  {
    name: "Charcoal & Ice",
    swatches: ["#f8fafc", "#64748b", "#0f172a", "#38bdf8", "#ecfeff"],
  },
  {
    name: "Citrus Atelier",
    swatches: ["#fff8ed", "#f97316", "#facc15", "#2563eb", "#1e293b"],
  },
  {
    name: "Midnight Velvet",
    swatches: ["#101828", "#1f2937", "#f8fafc", "#d946ef", "#818cf8"],
  },
];

const IMAGE_LIBRARY = [
  {
    id: "charred-wagyu",
    label: "Charred Wagyu Striploin",
    url: "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "autumn-salad",
    label: "Autumn Market Salad",
    url: "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "signature-dessert",
    label: "Smoked Chocolate Mousse",
    url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "chefs-cocktail",
    label: "Chef's Welcome Cocktail",
    url: "https://images.unsplash.com/photo-1563371351-e53ebb744a1f?auto=format&fit=crop&w=900&q=80",
  },
];

const INCH_TO_PX = 96;
const mmToInches = (mm: number) => mm / 25.4;
const toPx = (inches: number) => Math.round(inches * INCH_TO_PX);
const resolveDimension = (
  dimensionIn: number | undefined,
  dimensionMm: number | undefined,
  id: string,
  axis: "width" | "height",
) => {
  if (typeof dimensionIn === "number") {
    return dimensionIn;
  }
  if (typeof dimensionMm === "number") {
    return mmToInches(dimensionMm);
  }
  throw new Error(`Preset ${id} is missing ${axis} measurement`);
};
const resolveMeasure = (
  valueIn: number | undefined,
  valueMm: number | undefined,
  fallback: number,
) => {
  if (typeof valueIn === "number") {
    return valueIn;
  }
  if (typeof valueMm === "number") {
    return mmToInches(valueMm);
  }
  return fallback;
};
const createPreset = (config: PrintPresetInput): PrintPreset => {
  const widthIn = resolveDimension(
    config.widthIn,
    config.widthMm,
    config.id,
    "width",
  );
  const heightIn = resolveDimension(
    config.heightIn,
    config.heightMm,
    config.id,
    "height",
  );
  const bleedIn = resolveMeasure(config.bleedIn, config.bleedMm, 0.125);
  const safeMarginIn = resolveMeasure(
    config.safeMarginIn,
    config.safeMarginMm,
    0.25,
  );
  const orientation =
    config.orientation ?? (heightIn >= widthIn ? "portrait" : "landscape");

  return {
    id: config.id,
    label: config.label,
    widthPx: toPx(widthIn),
    heightPx: toPx(heightIn),
    widthIn,
    heightIn,
    bleedIn,
    safeMarginIn,
    bleedPx: toPx(bleedIn),
    safeMarginPx: toPx(safeMarginIn),
    dpi: config.dpi,
    colorProfile: config.colorProfile,
    orientation,
    description: config.description,
  };
};
const formatInches = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) {
    return rounded.toFixed(0);
  }
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};
const PAGE_PRESETS: PrintPreset[] = [
  createPreset({
    id: "letter_menu",
    label: "Full Menu – US Letter",
    widthIn: 8.5,
    heightIn: 11,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Standard dine-in menus, most common in the U.S.",
  }),
  createPreset({
    id: "legal_menu",
    label: "Extended Menu – Legal",
    widthIn: 8.5,
    heightIn: 14,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Adds extra length for prix-fixe courses or wine lists.",
  }),
  createPreset({
    id: "tabloid_menu",
    label: "Oversize Menu – Tabloid",
    widthIn: 11,
    heightIn: 17,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Ideal for folded menus, drink menus, or dual-page layouts.",
  }),
  createPreset({
    id: "a4_menu",
    label: "International Menu – A4",
    widthMm: 210,
    heightMm: 297,
    bleedMm: 3,
    safeMarginMm: 5,
    dpi: 300,
    colorProfile: "FOGRA39 (ISO Coated v2)",
    orientation: "portrait",
    description: "Global standard equivalent to US Letter.",
  }),
  createPreset({
    id: "a3_menu",
    label: "Large Format – A3",
    widthMm: 297,
    heightMm: 420,
    bleedMm: 3,
    safeMarginMm: 5,
    dpi: 300,
    colorProfile: "FOGRA39 (ISO Coated v2)",
    orientation: "portrait",
    description: "Common for bold single-sheet menus or posters.",
  }),
  createPreset({
    id: "half_letter",
    label: "Menu Card – Half Letter",
    widthIn: 5.5,
    heightIn: 8.5,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Perfect for cocktail, dessert, or insert cards.",
  }),
  createPreset({
    id: "third_letter",
    label: "Cocktail/Wine List – Third Letter",
    widthIn: 3.66,
    heightIn: 8.5,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Slim bar menus or focused wine lists.",
  }),
  createPreset({
    id: "square_menu_8",
    label: "Square Menu 8×8",
    widthIn: 8,
    heightIn: 8,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Boutique square layout for tasting menus.",
  }),
  createPreset({
    id: "square_menu_9",
    label: "Square Menu 9×9",
    widthIn: 9,
    heightIn: 9,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Premium square layout with additional breathing room.",
  }),
  createPreset({
    id: "buffet_label",
    label: "Buffet Label Card (Folded)",
    widthIn: 3.5,
    heightIn: 4,
    bleedIn: 0.0625,
    safeMarginIn: 0.125,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "landscape",
    description: "Tent card size for buffet or station labeling.",
  }),
  createPreset({
    id: "mini_tent",
    label: "Mini Tent Card 4×6",
    widthIn: 6,
    heightIn: 4,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "landscape",
    description: "Tent cards with additional space for allergen callouts.",
  }),
  createPreset({
    id: "tray_label",
    label: "Tray Label 2×6",
    widthIn: 6,
    heightIn: 2,
    bleedIn: 0.0625,
    safeMarginIn: 0.2,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "landscape",
    description: "Steam table or chafing dish clip labels.",
  }),
  createPreset({
    id: "table_tent_small",
    label: "Table Tent Small 4×6",
    widthIn: 4,
    heightIn: 6,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Drink specials or dessert promo tents.",
  }),
  createPreset({
    id: "table_tent_medium",
    label: "Table Tent Medium 5×7",
    widthIn: 5,
    heightIn: 7,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Multi-panel event or daily special tents.",
  }),
  createPreset({
    id: "tri_fold_tent",
    label: "Tri-Fold Tent 4.25��11",
    widthIn: 4.25,
    heightIn: 11,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Premium three-sided tent presentation.",
  }),
  createPreset({
    id: "tabloid_plus",
    label: "Tabloid+ Oversize 12×18",
    widthIn: 12,
    heightIn: 18,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 300,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Fine dining multi-page folded menus.",
  }),
  createPreset({
    id: "poster_18x24",
    label: "Poster Display 18×24",
    widthIn: 18,
    heightIn: 24,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 200,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Daily feature or buffet display boards.",
  }),
  createPreset({
    id: "poster_24x36",
    label: "Poster Display 24×36",
    widthIn: 24,
    heightIn: 36,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    dpi: 200,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "portrait",
    description: "Large-format hero signage for foyers or buffets.",
  }),
  createPreset({
    id: "banner_11x42",
    label: "Banner 11×42",
    widthIn: 42,
    heightIn: 11,
    bleedIn: 0.125,
    safeMarginIn: 0.5,
    dpi: 150,
    colorProfile: "US Sheetfed Coated (SWOP) v2",
    orientation: "landscape",
    description: "Wall or buffet backdrop banners.",
  }),
];

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const seasonalTemplate: MenuTemplate = {
  id: "seasonal",
  name: "Seasonal Tasting",
  description:
    "Serif-led hierarchy with photo-driven storytelling and right-aligned pricing.",
  pageSize: { width: 816, height: 1056 },
  settings: {
    background: "#fefaf4",
    margin: 64,
    columns: 2,
    gutter: 32,
    showGrid: true,
    showMargins: true,
    showColumns: false,
  },
  elements: [
    {
      type: "shape",
      name: "Vellum Frame",
      x: 36,
      y: 36,
      width: 744,
      height: 984,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      shape: "rectangle",
      fill: "#f6f1e7",
      borderColor: "#f6f1e7",
      borderWidth: 0,
      borderRadius: 48,
    },
    {
      type: "shape",
      name: "Copper Accent",
      x: 72,
      y: 120,
      width: 12,
      height: 720,
      rotation: 0,
      opacity: 1,
      zIndex: 5,
      shape: "rectangle",
      fill: "#c0763a",
      borderColor: "#c0763a",
      borderWidth: 0,
      borderRadius: 8,
    },
    {
      type: "heading",
      name: "Menu Title",
      text: "Spring Chef's Table",
      x: 120,
      y: 104,
      width: 420,
      height: 90,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'Playfair Display', serif",
      fontSize: 54,
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: 2.2,
      color: "#1c1c1c",
      align: "left",
    },
    {
      type: "subheading",
      name: "Event Details",
      text: "April 2024 · Five Courses",
      x: 120,
      y: 176,
      width: 380,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      fontWeight: 400,
      letterSpacing: 3,
      lineHeight: 1.4,
      color: "#4b5563",
      align: "left",
    },
    {
      type: "image",
      name: "Hero Dish",
      imageUrl:
        "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=1000&q=80",
      x: 500,
      y: 120,
      width: 240,
      height: 320,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      objectFit: "cover",
      borderRadius: 28,
    },
    {
      type: "divider",
      name: "Intro Divider",
      x: 120,
      y: 236,
      width: 320,
      height: 4,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      thickness: 3,
      color: "#c0763a",
    },
    {
      type: "menu-item",
      name: "Course One",
      text: "Chilled English Pea Custard",
      description: "meyer lemon · cultured cream · rye crumble",
      price: 18,
      currency: "USD",
      x: 120,
      y: 268,
      width: 360,
      height: 108,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.6,
      letterSpacing: 0.6,
      color: "#1f2933",
      accentColor: "#c0763a",
    },
    {
      type: "menu-item",
      name: "Course Two",
      text: "Fire-Roasted Asparagus",
      description: "smoked hollandaise · preserved citrus · buckwheat",
      price: 24,
      currency: "USD",
      x: 120,
      y: 388,
      width: 360,
      height: 108,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.6,
      letterSpacing: 0.6,
      color: "#1f2933",
      accentColor: "#c0763a",
    },
    {
      type: "menu-item",
      name: "Course Three",
      text: "Charred Wagyu Striploin",
      description: "black garlic · arrowhead cabbage · smoked potato",
      price: 46,
      currency: "USD",
      x: 120,
      y: 508,
      width: 360,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.6,
      letterSpacing: 0.6,
      color: "#1f2933",
      accentColor: "#c0763a",
    },
    {
      type: "divider",
      name: "Mid Divider",
      x: 120,
      y: 648,
      width: 320,
      height: 4,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      thickness: 2,
      color: "#d1bfa2",
    },
    {
      type: "menu-item",
      name: "Course Four",
      text: "Lobster Agnolotti",
      description: "brown butter · sorrel · candied fennel pollen",
      price: 38,
      currency: "USD",
      x: 120,
      y: 680,
      width: 360,
      height: 108,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.6,
      letterSpacing: 0.6,
      color: "#1f2933",
      accentColor: "#c0763a",
    },
    {
      type: "menu-item",
      name: "Course Five",
      text: "Honey Pollen Pavlova",
      description: "chamomile cream �� macerated berries · verbena ice",
      price: 16,
      currency: "USD",
      x: 120,
      y: 800,
      width: 360,
      height: 108,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.6,
      letterSpacing: 0.6,
      color: "#1f2933",
      accentColor: "#c0763a",
    },
    {
      type: "shape",
      name: "Pairing Panel",
      x: 500,
      y: 460,
      width: 240,
      height: 320,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      shape: "rectangle",
      fill: "#fff7ed",
      borderColor: "#fbd5a5",
      borderWidth: 1,
      borderRadius: 28,
    },
    {
      type: "heading",
      name: "Pairing Header",
      text: "Wine Pairings",
      x: 520,
      y: 480,
      width: 200,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'Playfair Display', serif",
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: 1.4,
      lineHeight: 1.2,
      color: "#7c2d12",
      align: "left",
    },
    {
      type: "body",
      name: "Pairing Copy",
      text: "Sommelier curated pairings available for $75 per guest. Focused on Loire whites and coastal Italian reds.",
      x: 520,
      y: 538,
      width: 200,
      height: 140,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 14,
      lineHeight: 1.6,
      letterSpacing: 0.4,
      color: "#1f2937",
      align: "left",
    },
    {
      type: "body",
      name: "Service Footer",
      text: "Kindly inform us of allergies or dietary needs. Menu evolves weekly with the season.",
      x: 120,
      y: 928,
      width: 620,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      lineHeight: 1.6,
      letterSpacing: 0.3,
      color: "#4b5563",
      align: "center",
    },
  ],
};

const modernGridTemplate: MenuTemplate = {
  id: "modern-grid",
  name: "Modern Grid",
  description:
    "Bold sans serif layout with modular grid and alternating imagery.",
  pageSize: { width: 900, height: 1200 },
  settings: {
    background: "#0f172a",
    margin: 72,
    columns: 3,
    gutter: 40,
    showGrid: true,
    showMargins: true,
    showColumns: true,
  },
  elements: [
    {
      type: "shape",
      name: "Dark Background",
      x: 0,
      y: 0,
      width: 900,
      height: 1200,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      shape: "rectangle",
      fill: "#0f172a",
      borderColor: "#0f172a",
      borderWidth: 0,
      borderRadius: 0,
    },
    {
      type: "heading",
      name: "Hero Headline",
      text: "Chef's Sélection",
      x: 96,
      y: 96,
      width: 520,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      fontFamily: "'Montserrat', sans-serif",
      fontSize: 72,
      fontWeight: 700,
      lineHeight: 0.95,
      letterSpacing: 1.6,
      color: "#f8fafc",
      align: "left",
    },
    {
      type: "subheading",
      name: "Date Line",
      text: "May 2024 · Seven moments",
      x: 96,
      y: 206,
      width: 360,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      fontFamily: "'Inter', sans-serif",
      fontSize: 18,
      fontWeight: 500,
      letterSpacing: 2,
      lineHeight: 1.4,
      color: "#94a3b8",
      align: "left",
    },
    {
      type: "image",
      name: "Left Panel",
      imageUrl:
        "https://images.unsplash.com/photo-1543353071-1cf6624b9987?auto=format&fit=crop&w=1000&q=80",
      x: 96,
      y: 280,
      width: 240,
      height: 320,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      objectFit: "cover",
      borderRadius: 24,
    },
    {
      type: "image",
      name: "Right Panel",
      imageUrl:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80",
      x: 552,
      y: 280,
      width: 260,
      height: 360,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      objectFit: "cover",
      borderRadius: 32,
    },
    {
      type: "shape",
      name: "Highlight Badge",
      x: 392,
      y: 280,
      width: 136,
      height: 136,
      rotation: 0,
      opacity: 0.92,
      zIndex: 4,
      shape: "ellipse",
      fill: "#f97316",
      borderColor: "#f97316",
      borderWidth: 0,
      borderRadius: 136,
    },
    {
      type: "heading",
      name: "Badge Copy",
      text: "Tasting\n$125",
      x: 400,
      y: 292,
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 5,
      fontFamily: "'Montserrat', sans-serif",
      fontSize: 28,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 1,
      color: "#0f172a",
      align: "center",
    },
    {
      type: "menu-item",
      name: "Course Highlight",
      text: "Coal-Roasted Langoustine",
      description: "xo butter · smoked paprika �� fermented yuzu",
      price: 32,
      currency: "USD",
      x: 96,
      y: 632,
      width: 340,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      fontFamily: "'Inter', sans-serif",
      fontSize: 20,
      lineHeight: 1.5,
      letterSpacing: 0.4,
      color: "#e2e8f0",
      accentColor: "#38bdf8",
    },
    {
      type: "menu-item",
      name: "Course Secondary",
      text: "Miso Glazed Cauliflower",
      description: "togarashi caramel · pickled kumquat · sesame",
      price: 22,
      currency: "USD",
      x: 460,
      y: 632,
      width: 352,
      height: 110,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      fontFamily: "'Inter', sans-serif",
      fontSize: 20,
      lineHeight: 1.5,
      letterSpacing: 0.4,
      color: "#e2e8f0",
      accentColor: "#38bdf8",
    },
    {
      type: "divider",
      name: "Lower Divider",
      x: 96,
      y: 772,
      width: 716,
      height: 4,
      rotation: 0,
      opacity: 0.6,
      zIndex: 4,
      thickness: 2,
      color: "#1e293b",
    },
    {
      type: "body",
      name: "Pairing Caption",
      text: "Wine pairings anchored in Jura, Sicily, and Anderson Valley.",
      x: 96,
      y: 800,
      width: 716,
      height: 80,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      fontFamily: "'Inter', sans-serif",
      fontSize: 16,
      lineHeight: 1.6,
      letterSpacing: 0.3,
      color: "#cbd5f5",
      align: "left",
    },
    {
      type: "body",
      name: "Footer",
      text: "Service charge of 20% applies. Vegan substitutions crafted with 24-hour notice.",
      x: 96,
      y: 1000,
      width: 716,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      fontFamily: "'Inter', sans-serif",
      fontSize: 14,
      lineHeight: 1.6,
      letterSpacing: 0.3,
      color: "#94a3b8",
      align: "center",
    },
  ],
};

const coastalBrunchTemplate: MenuTemplate = {
  id: "coastal-brunch",
  name: "Coastal Brunch",
  description:
    "Sun-washed palette with airy serif headings and seaside accents.",
  pageSize: { width: 768, height: 1024 },
  settings: {
    background: "#f1f9ff",
    margin: 56,
    columns: 2,
    gutter: 28,
    showGrid: false,
    showMargins: true,
    showColumns: true,
  },
  elements: [
    {
      type: "shape",
      name: "Ocean Frame",
      x: 36,
      y: 44,
      width: 696,
      height: 936,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      shape: "rectangle",
      fill: "#ffffff",
      borderColor: "#cfeafd",
      borderWidth: 1,
      borderRadius: 44,
    },
    {
      type: "shape",
      name: "Sunrise Halo",
      x: 520,
      y: 76,
      width: 152,
      height: 152,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      shape: "ellipse",
      fill: "#ffe8b0",
      borderColor: "#ffe8b0",
      borderWidth: 0,
    },
    {
      type: "heading",
      name: "Menu Title",
      text: "Seaside Brunch Club",
      x: 96,
      y: 96,
      width: 420,
      height: 80,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'Playfair Display', serif",
      fontSize: 46,
      fontWeight: 500,
      lineHeight: 1.05,
      letterSpacing: 2.8,
      color: "#0f172a",
      align: "left",
    },
    {
      type: "subheading",
      name: "Subtitle",
      text: "Weekends · 10am - 2pm",
      x: 96,
      y: 158,
      width: 420,
      height: 48,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: 3.2,
      color: "#475569",
      align: "left",
    },
    {
      type: "divider",
      name: "Title Divider",
      x: 96,
      y: 212,
      width: 360,
      height: 3,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      thickness: 2,
      color: "#22d3ee",
    },
    {
      type: "image",
      name: "Signature Plate",
      imageUrl:
        "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80",
      x: 456,
      y: 204,
      width: 224,
      height: 272,
      rotation: 0,
      opacity: 1,
      zIndex: 5,
      objectFit: "cover",
      borderRadius: 36,
    },
    {
      type: "menu-item",
      name: "Sunrise",
      text: "Citrus Ricotta Pancakes",
      description: "candied grapefruit �� vanilla creme fraiche · pistachio",
      price: 18,
      currency: "USD",
      x: 96,
      y: 244,
      width: 320,
      height: 116,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.55,
      letterSpacing: 0.6,
      color: "#0f172a",
      accentColor: "#0ea5e9",
      align: "left",
    },
    {
      type: "menu-item",
      name: "Harbor",
      text: "Lobster Benedict",
      description: "citrus hollandaise · sea asparagus · brioche",
      price: 24,
      currency: "USD",
      x: 96,
      y: 380,
      width: 320,
      height: 116,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.55,
      letterSpacing: 0.6,
      color: "#0f172a",
      accentColor: "#0ea5e9",
      align: "left",
    },
    {
      type: "menu-item",
      name: "Garden",
      text: "Avocado Tartine",
      description: "charred snap peas · mint oil · soft herbs",
      price: 19,
      currency: "USD",
      x: 96,
      y: 516,
      width: 320,
      height: 116,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.55,
      letterSpacing: 0.6,
      color: "#0f172a",
      accentColor: "#0ea5e9",
      align: "left",
    },
    {
      type: "shape",
      name: "Aqua Column",
      x: 456,
      y: 508,
      width: 12,
      height: 320,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      shape: "rectangle",
      fill: "#38bdf8",
      borderColor: "#38bdf8",
      borderWidth: 0,
      borderRadius: 6,
    },
    {
      type: "menu-item",
      name: "Raw Bar",
      text: "Ceviche Trio",
      description: "halibut · shrimp aguachile · scallop crudo",
      price: 27,
      currency: "USD",
      x: 488,
      y: 508,
      width: 216,
      height: 132,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 16,
      lineHeight: 1.6,
      letterSpacing: 0.5,
      color: "#0f172a",
      accentColor: "#0ea5e9",
      align: "left",
    },
    {
      type: "menu-item",
      name: "Refresh",
      text: "Herb Tonic",
      description: "lemon verbena · cucumber �� sparkling",
      price: 9,
      currency: "USD",
      x: 488,
      y: 664,
      width: 216,
      height: 108,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 16,
      lineHeight: 1.6,
      letterSpacing: 0.5,
      color: "#0f172a",
      accentColor: "#0ea5e9",
      align: "left",
    },
    {
      type: "divider",
      name: "Footer Divider",
      x: 96,
      y: 700,
      width: 360,
      height: 2,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      thickness: 2,
      color: "#bae6fd",
    },
    {
      type: "body",
      name: "Footer Copy",
      text: "Reservations recommended · Pier 7 Coastal Avenue",
      x: 96,
      y: 736,
      width: 420,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 14,
      lineHeight: 1.5,
      letterSpacing: 1.2,
      color: "#475569",
      align: "left",
    },
  ],
};

const twilightCocktailTemplate: MenuTemplate = {
  id: "twilight-cocktail",
  name: "Twilight Cocktail Hour",
  description:
    "Moody twilight gradient with art-deco typography and spotlight imagery.",
  pageSize: { width: 816, height: 1280 },
  settings: {
    background: "#06080f",
    margin: 64,
    columns: 2,
    gutter: 36,
    showGrid: true,
    showMargins: true,
    showColumns: false,
  },
  elements: [
    {
      type: "shape",
      name: "Night Sky",
      x: 32,
      y: 32,
      width: 752,
      height: 1216,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      shape: "rectangle",
      fill: "#0b1020",
      borderColor: "#0b1020",
      borderWidth: 0,
      borderRadius: 40,
    },
    {
      type: "shape",
      name: "Iridescent Column",
      x: 520,
      y: 96,
      width: 80,
      height: 960,
      rotation: 0,
      opacity: 0.8,
      zIndex: 2,
      shape: "rectangle",
      fill: "#1e3a8a",
      borderColor: "#4338ca",
      borderWidth: 0,
      borderRadius: 40,
    },
    {
      type: "heading",
      name: "Menu Title",
      text: "Twilight Lounge",
      x: 104,
      y: 128,
      width: 360,
      height: 96,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 58,
      fontWeight: 500,
      lineHeight: 1.1,
      letterSpacing: 3,
      color: "#fef3c7",
      align: "left",
    },
    {
      type: "subheading",
      name: "Subtitle",
      text: "Artisanal cocktails & small plates · 5pm - Midnight",
      x: 104,
      y: 204,
      width: 420,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'Inter', sans-serif",
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: 3,
      color: "#cbd5f5",
      align: "left",
    },
    {
      type: "divider",
      name: "Title Divider",
      x: 104,
      y: 252,
      width: 320,
      height: 3,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      thickness: 3,
      color: "#facc15",
    },
    {
      type: "image",
      name: "Signature Cocktail",
      imageUrl:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80",
      x: 472,
      y: 176,
      width: 240,
      height: 320,
      rotation: 0,
      opacity: 1,
      zIndex: 5,
      objectFit: "cover",
      borderRadius: 32,
    },
    {
      type: "shape",
      name: "Neon Ring",
      x: 448,
      y: 144,
      width: 296,
      height: 296,
      rotation: 0,
      opacity: 0.6,
      zIndex: 4,
      shape: "ellipse",
      fill: "#f472b6",
      borderColor: "#f472b6",
      borderWidth: 0,
    },
    {
      type: "menu-item",
      name: "Spark",
      text: "Yuzu Electric",
      description: "aged gin · yuzu cordial · electric daisy",
      price: 17,
      currency: "USD",
      x: 104,
      y: 284,
      width: 320,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'Inter', sans-serif",
      fontSize: 18,
      lineHeight: 1.55,
      letterSpacing: 0.6,
      color: "#f8fafc",
      accentColor: "#f59e0b",
      align: "left",
    },
    {
      type: "menu-item",
      name: "Aroma",
      text: "Smoked Plum Manhattan",
      description: "rye whiskey · black plum vermouth · cedar smoke",
      price: 19,
      currency: "USD",
      x: 104,
      y: 424,
      width: 320,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'Inter', sans-serif",
      fontSize: 18,
      lineHeight: 1.55,
      letterSpacing: 0.6,
      color: "#f8fafc",
      accentColor: "#f59e0b",
      align: "left",
    },
    {
      type: "menu-item",
      name: "Glow",
      text: "Saffron Highball",
      description: "rum blend · saffron syrup · soda · lemon mist",
      price: 15,
      currency: "USD",
      x: 104,
      y: 564,
      width: 320,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'Inter', sans-serif",
      fontSize: 18,
      lineHeight: 1.55,
      letterSpacing: 0.6,
      color: "#f8fafc",
      accentColor: "#f59e0b",
      align: "left",
    },
    {
      type: "divider",
      name: "Small Plates Divider",
      x: 104,
      y: 708,
      width: 520,
      height: 2,
      rotation: 0,
      opacity: 0.8,
      zIndex: 6,
      thickness: 2,
      color: "#1d4ed8",
    },
    {
      type: "menu-item",
      name: "Savory",
      text: "Charred Octopus Skewer",
      description: "black garlic glaze · smoked tomato · pickled fennel",
      price: 21,
      currency: "USD",
      x: 104,
      y: 740,
      width: 520,
      height: 128,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'Inter', sans-serif",
      fontSize: 17,
      lineHeight: 1.6,
      letterSpacing: 0.5,
      color: "#e2e8f0",
      accentColor: "#38bdf8",
      align: "left",
    },
    {
      type: "menu-item",
      name: "Bright",
      text: "Citrus Cured Hamachi",
      description: "finger lime · purple shiso · chilled dashi",
      price: 23,
      currency: "USD",
      x: 104,
      y: 884,
      width: 520,
      height: 128,
      rotation: 0,
      opacity: 1,
      zIndex: 8,
      fontFamily: "'Inter', sans-serif",
      fontSize: 17,
      lineHeight: 1.6,
      letterSpacing: 0.5,
      color: "#e2e8f0",
      accentColor: "#38bdf8",
      align: "left",
    },
    {
      type: "body",
      name: "Footer Copy",
      text: "Live DJ weekends · rooftop access for reservations",
      x: 104,
      y: 1044,
      width: 520,
      height: 64,
      rotation: 0,
      opacity: 1,
      zIndex: 6,
      fontFamily: "'Inter', sans-serif",
      fontSize: 14,
      lineHeight: 1.6,
      letterSpacing: 1.2,
      color: "#94a3b8",
      align: "center",
    },
  ],
};

const TEMPLATE_PRESETS: MenuTemplate[] = [
  seasonalTemplate,
  modernGridTemplate,
  coastalBrunchTemplate,
  twilightCocktailTemplate,
];

const createElementsFromTemplate = (
  template: MenuTemplate,
): DesignerElement[] =>
  template.elements.map((element, index) => ({
    ...element,
    id: createId(),
    zIndex: element.zIndex ?? index + 1,
    locked: element.locked ?? false,
  }));

const DEFAULT_PRESET = PAGE_PRESETS[0];

const INITIAL_CANVAS: CanvasSettings = {
  background: "#fefaf4",
  margin: DEFAULT_PRESET.safeMarginPx,
  bleed: DEFAULT_PRESET.bleedPx,
  columns: 2,
  gutter: 32,
  showGrid: true,
  showMargins: true,
  showBleed: true,
  showColumns: false,
  zoom: 0.75,
  gridSize: 24,
};

const INITIAL_PAGE_SIZE: PageSize = {
  width: DEFAULT_PRESET.widthPx,
  height: DEFAULT_PRESET.heightPx,
};

const INITIAL_ELEMENTS = createElementsFromTemplate(seasonalTemplate);

export default function MenuDesignStudioSection() {
  const { t } = useTranslation();
  const [documentName, setDocumentName] = useState("Seasonal Reveal Menu");
  const [pageSize, setPageSize] = useState<PageSize>(INITIAL_PAGE_SIZE);
  const [canvasSettings, setCanvasSettings] =
    useState<CanvasSettings>(INITIAL_CANVAS);

  // Use history hook for undo/redo on elements
  const elementsHistory = useHistory<DesignerElement[]>(INITIAL_ELEMENTS, {
    maxStates: 50,
  });
  const elements = elementsHistory.state;
  const setElements = elementsHistory.setState;

  const [selectedId, setSelectedId] = useState<string | null>(
    INITIAL_ELEMENTS[0]?.id ?? null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] =
    useState<Partial<DesignerElement> | null>(null);
  const [maskEditor, setMaskEditor] = useState<MaskEditorState | null>(null);
  const [pagePreset, setPagePreset] = useState<string>(DEFAULT_PRESET.id);
  const [printPreset, setPrintPreset] = useState<PrintPreset>(DEFAULT_PRESET);
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingPanelState>({
    x: 24,
    y: 32,
    pinned: false,
  });
  const [floatingLayersPanel, setFloatingLayersPanel] =
    useState<FloatingPanelState>({
      x: 24,
      y: 280,
      pinned: false,
    });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showSaveLoadDialog, setShowSaveLoadDialog] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState(getSavedDesigns());
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const loadedFontsRef = useRef<Set<string>>(new Set());
  const { images: galleryImages } = useAppData();
  const { feedback, showFeedback, UndoRedoFeedbackComponent } =
    useUndoRedoFeedback();

  // Setup save shortcut (Cmd+S)
  useSaveShortcut(
    () => {
      if (documentName) {
        return Promise.resolve(handleSaveDesign(documentName));
      }
    },
    { enabled: true, showToast: true },
  );

  // Setup undo/redo keyboard shortcuts with visual feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Z for undo
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        elementsHistory.undo();
        showFeedback("undo");
      }
      // Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y for redo
      if (
        ((e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "z") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        elementsHistory.redo();
        showFeedback("redo");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [elementsHistory, showFeedback]);

  const ensureFontLoaded = useCallback(
    (fontValue?: string | null) => {
      if (!fontValue) {
        return;
      }
      const trimmedFamily = fontValue
        .split(",")[0]
        ?.replace(/['"]/g, "")
        .trim();
      const definition =
        FONT_LIBRARY_BY_VALUE.get(fontValue) ??
        (trimmedFamily ? FONT_LIBRARY_BY_FAMILY.get(trimmedFamily) : undefined);
      if (!definition) {
        return;
      }
      if (typeof document === "undefined") {
        return;
      }
      if (loadedFontsRef.current.has(definition.family)) {
        return;
      }
      const existingLink = document.head.querySelector<HTMLLinkElement>(
        `link[data-font-family="${definition.family}"]`,
      );
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = definition.importUrl;
        link.dataset.fontFamily = definition.family;
        link.onerror = () => {
          console.warn(
            `Failed to load font: ${definition.family}. Using fallback.`,
          );
          toast({
            title: "Font unavailable",
            description: `${definition.family} couldn't load. Using system fallback font instead.`,
            variant: "destructive",
          });
          // Mark as failed so we don't try again
          loadedFontsRef.current.add(`${definition.family}:failed`);
        };
        link.onload = () => {
          // Font loaded successfully
          loadedFontsRef.current.add(definition.family);
        };
        document.head.appendChild(link);
      }
      if (document.fonts && typeof document.fonts.load === "function") {
        document.fonts
          .load(`400 1rem ${definition.family}`)
          .catch((error) => {
            console.warn(`Font loading error for ${definition.family}:`, error);
            // Still add to loaded so we don't retry endlessly
            if (!loadedFontsRef.current.has(definition.family)) {
              toast({
                title: "Font loading error",
                description: `Could not load ${definition.family}. Ensure you have internet connection.`,
                variant: "destructive",
              });
            }
          });
      }
      loadedFontsRef.current.add(definition.family);
    },
    [toast],
  );

  // Helper function to check localStorage quota - define before useEffect that uses it
  const checkStorageQuota = useCallback(() => {
    try {
      if (!navigator.storage?.estimate) {
        return; // Storage Quota API not available
      }
      navigator.storage.estimate().then((estimate) => {
        const percentUsed = (estimate.usage || 0) / (estimate.quota || 1);
        const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
        const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024);

        if (percentUsed > 0.9) {
          toast({
            title: "Critical: Storage almost full",
            description: `Using ${usedMB}MB of ${quotaMB}MB available. Delete old designs immediately to prevent data loss.`,
            variant: "destructive",
          });
        } else if (percentUsed > 0.8) {
          toast({
            title: "Storage warning",
            description: `Using ${usedMB}MB of ${quotaMB}MB available (${Math.round(percentUsed * 100)}%). Consider deleting old designs.`,
            variant: "destructive",
          });
        } else if (percentUsed > 0.6) {
          // Just log warning for moderate usage
          console.warn(
            `Browser storage is ${Math.round(percentUsed * 100)}% full (${usedMB}MB of ${quotaMB}MB)`,
          );
        }
      });
    } catch (error) {
      console.warn("Could not check storage quota:", error);
    }
  }, [toast]);

  useEffect(() => {
    ensureFontLoaded(DEFAULT_FONT_VALUE);
    // Check storage quota on component mount
    checkStorageQuota();
  }, [ensureFontLoaded, checkStorageQuota]);

  // Auto-save design to localStorage
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        const designData = {
          id: `design-${Date.now()}`,
          name: documentName,
          elements,
          pageSize,
          canvasSettings,
          pagePreset,
          printPreset,
          updatedAt: Date.now(),
          version: 1 as const,
        };
        saveDesign(designData);
        setHasUnsavedChanges(false);
        toast({
          title: "Design saved",
          description: "Your work has been saved to browser storage.",
        });
        // Check storage quota after saving
        checkStorageQuota();
      } catch (error) {
        console.error("Auto-save failed:", error);
        toast({
          title: "Auto-save failed",
          description:
            "Could not save your design. Browser storage may be full.",
          variant: "destructive",
        });
      }
    }, 30000); // Auto-save after 30 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    hasUnsavedChanges,
    documentName,
    elements,
    pageSize,
    canvasSettings,
    pagePreset,
    printPreset,
    toast,
    checkStorageQuota,
  ]);

  useEffect(() => {
    const uniqueFontValues = new Set<string>();
    elements.forEach((element) => {
      if (element.fontFamily) {
        uniqueFontValues.add(element.fontFamily);
      }
    });
    uniqueFontValues.forEach((font) => ensureFontLoaded(font));
  }, [elements, ensureFontLoaded]);

  const handleToolbarStateChange = useCallback(
    (changes: Partial<FloatingPanelState>) => {
      setFloatingToolbar((prev) => ({ ...prev, ...changes }));
    },
    [],
  );

  const handleLayersPanelStateChange = useCallback(
    (changes: Partial<FloatingPanelState>) => {
      setFloatingLayersPanel((prev) => ({ ...prev, ...changes }));
    },
    [],
  );

  const handleToolbarPinToggle = useCallback(() => {
    setFloatingToolbar((prev) => ({ ...prev, pinned: !prev.pinned }));
  }, []);

  const handleLayersPinToggle = useCallback(() => {
    setFloatingLayersPanel((prev) => ({ ...prev, pinned: !prev.pinned }));
  }, []);

  const sortedLayers = useMemo(
    () =>
      [...elements].sort((a, b) => {
        if (a.zIndex === b.zIndex) {
          return a.name.localeCompare(b.name);
        }
        return b.zIndex - a.zIndex;
      }),
    [elements],
  );

  const getNextZIndex = useCallback(
    () => elements.reduce((acc, el) => Math.max(acc, el.zIndex), 0) + 1,
    [elements],
  );

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const updateElement = useCallback(
    (id: string, changes: Partial<DesignerElement>) => {
      if (changes.fontFamily) {
        ensureFontLoaded(changes.fontFamily);
      }
      setElements((prev) =>
        prev.map((element) => {
          if (element.id !== id) {
            return element;
          }
          const hasLockedChange = Object.prototype.hasOwnProperty.call(
            changes,
            "locked",
          );
          if (element.locked && !hasLockedChange) {
            return element;
          }
          const nextLocked = hasLockedChange
            ? Boolean(changes.locked)
            : (element.locked ?? false);
          return {
            ...element,
            ...changes,
            locked: nextLocked,
          } as DesignerElement;
        }),
      );
      setHasUnsavedChanges(true);
    },
    [ensureFontLoaded],
  );

  const handleBeginInlineEdit = useCallback(
    (id: string) => {
      const element = elements.find((item) => item.id === id);
      if (!element || element.locked || !isTextEditableElement(element)) return;
      const draft = createDraftFromElement(element);
      setEditingId(id);
      setEditingDraft(draft);
      setSelectedId(id);
    },
    [elements],
  );

  const handleInlineEditingChange = useCallback(
    (changes: Partial<DesignerElement>) => {
      setEditingDraft((prev) => ({ ...(prev ?? {}), ...changes }));
    },
    [],
  );

  const handleCommitInlineEdit = useCallback(() => {
    if (!editingId || !editingDraft) return;
    const element = elements.find((item) => item.id === editingId);
    if (!element) {
      setEditingId(null);
      setEditingDraft(null);
      return;
    }
    const updates = extractDraftChanges(element, editingDraft);
    updateElement(editingId, updates);
    setEditingId(null);
    setEditingDraft(null);
  }, [editingDraft, editingId, elements, updateElement]);

  const handleCancelInlineEdit = useCallback(() => {
    setEditingId(null);
    setEditingDraft(null);
  }, []);

  const handleBeginMaskEditing = useCallback(
    (id: string) => {
      const target = elements.find((item) => item.id === id);
      if (!target || target.type !== "image") {
        return;
      }
      if (target.locked) {
        toast({
          title: "Layer is locked",
          description: "Unlock the layer before editing its background.",
        });
        return;
      }
      if (target.rotation !== 0) {
        toast({
          title: "Reset rotation to edit background",
          description:
            "Set rotation to 0�� to align the selection tool with the image.",
        });
        return;
      }
      if (editingId) {
        handleCommitInlineEdit();
      }
      setMaskEditor({
        elementId: id,
        points:
          target.mask?.type === "polygon" && target.mask.points.length >= 3
            ? target.mask.points.map((point) => ({ ...point }))
            : [],
        preview: null,
      });
      setSelectedId(id);
    },
    [editingId, elements, handleCommitInlineEdit, setSelectedId, toast],
  );

  const handleMaskPointAdd = useCallback((point: PolygonPoint) => {
    setMaskEditor((prev) => {
      if (!prev) return prev;
      const clampedPoint = {
        x: clamp(point.x, 0, 1),
        y: clamp(point.y, 0, 1),
      };
      return {
        ...prev,
        points: [...prev.points, clampedPoint],
      };
    });
  }, []);

  const handleMaskPreview = useCallback((point: PolygonPoint | null) => {
    setMaskEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preview: point
          ? { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) }
          : null,
      };
    });
  }, []);

  const handleMaskUndo = useCallback(() => {
    setMaskEditor((prev) => {
      if (!prev || prev.points.length === 0) {
        return prev;
      }
      return {
        ...prev,
        points: prev.points.slice(0, -1),
      };
    });
  }, []);

  const handleMaskCommit = useCallback(() => {
    setMaskEditor((prev) => {
      if (!prev) {
        return prev;
      }
      if (prev.points.length < 3) {
        toast({
          title: "Add more points",
          description:
            "Draw at least three points to outline the area to keep.",
        });
        return prev;
      }
      updateElement(prev.elementId, {
        mask: {
          type: "polygon",
          points: prev.points.map((point) => ({ ...point })),
        },
      });
      toast({
        title: "Background removed",
        description: "The selected area is now isolated from the background.",
      });
      return null;
    });
  }, [toast, updateElement]);

  const handleMaskCancel = useCallback(() => {
    setMaskEditor((prev) => {
      if (!prev) {
        return prev;
      }
      toast({
        title: "Selection cancelled",
        description: "Background editing stopped without applying changes.",
      });
      return null;
    });
  }, [toast]);

  const handleMaskClear = useCallback(
    (id: string) => {
      const target = elements.find((item) => item.id === id);
      if (!target) {
        return;
      }
      if (target.locked) {
        toast({
          title: "Layer is locked",
          description: "Unlock the layer before clearing its background mask.",
        });
        return;
      }
      if (!target.mask) {
        return;
      }
      updateElement(id, { mask: undefined });
      if (maskEditor?.elementId === id) {
        setMaskEditor(null);
      }
      toast({
        title: "Mask cleared",
        description: "The image now shows its full background again.",
      });
    },
    [elements, maskEditor, toast, updateElement],
  );

  useEffect(() => {
    if (!maskEditor) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleMaskCancel();
        return;
      }
      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        maskEditor.points.length > 0
      ) {
        event.preventDefault();
        handleMaskUndo();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        handleMaskCommit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleMaskCancel, handleMaskCommit, handleMaskUndo, maskEditor]);

  useEffect(() => {
    if (!maskEditor) {
      return;
    }
    const exists = elements.some((item) => item.id === maskEditor.elementId);
    if (!exists) {
      setMaskEditor(null);
    }
  }, [elements, maskEditor]);

  const handleCanvasPointerDownCommit = useCallback(() => {
    if (maskEditor) {
      return;
    }
    if (editingId) {
      handleCommitInlineEdit();
    }
  }, [editingId, handleCommitInlineEdit, maskEditor]);

  const handleDeselect = useCallback(() => {
    if (maskEditor) {
      return;
    }
    if (editingId) {
      handleCommitInlineEdit();
    }
    setSelectedId(null);
  }, [editingId, handleCommitInlineEdit, maskEditor]);

  const handlePositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setElements((prev) =>
        prev.map((element) => {
          if (element.id !== id) return element;
          if (element.locked) return element;
          const maxX = Math.max(0, pageSize.width - element.width);
          const maxY = Math.max(0, pageSize.height - element.height);
          return {
            ...element,
            x: clamp(position.x, 0, maxX),
            y: clamp(position.y, 0, maxY),
          } as DesignerElement;
        }),
      );
    },
    [pageSize.height, pageSize.width],
  );

  const handleNudgeSelected = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!selectedId) return;
      if (editingId) return;
      setElements((prev) =>
        prev.map((element) => {
          if (element.id !== selectedId) return element;
          if (element.locked) return element;
          const maxX = Math.max(0, pageSize.width - element.width);
          const maxY = Math.max(0, pageSize.height - element.height);
          return {
            ...element,
            x: clamp(element.x + deltaX, 0, maxX),
            y: clamp(element.y + deltaY, 0, maxY),
          } as DesignerElement;
        }),
      );
    },
    [editingId, pageSize.height, pageSize.width, selectedId],
  );

  const handleSelectLayer = useCallback(
    (id: string) => {
      if (editingId && editingId !== id) {
        handleCommitInlineEdit();
      }
      setSelectedId(id);
    },
    [editingId, handleCommitInlineEdit],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const target = elements.find((element) => element.id === selectedId);
    if (!target || target.locked) return;
    setElements((prev) => prev.filter((element) => element.id !== selectedId));
    setSelectedId((current) => (current === selectedId ? null : current));
    if (editingId === selectedId) {
      setEditingId(null);
      setEditingDraft(null);
    }
  }, [editingId, elements, selectedId]);

  const handleDuplicateSelected = useCallback(() => {
    if (editingId) {
      handleCommitInlineEdit();
    }
    if (!selectedId) return;
    let createdId: string | null = null;
    setElements((prev) => {
      const source = prev.find((element) => element.id === selectedId);
      if (!source || source.locked) {
        return prev;
      }
      const copy: DesignerElement = {
        ...source,
        id: createId(),
        name: `${source.name} Copy`,
        x: clamp(source.x + 32, 0, pageSize.width - source.width),
        y: clamp(source.y + 32, 0, pageSize.height - source.height),
        zIndex: getNextZIndex(),
        locked: false,
      };
      createdId = copy.id;
      return [...prev, copy];
    });
    if (createdId) {
      setSelectedId(createdId);
    }
  }, [
    editingId,
    handleCommitInlineEdit,
    selectedId,
    pageSize.width,
    pageSize.height,
    getNextZIndex,
  ]);

  const handleLayerShift = useCallback(
    (id: string, direction: "forward" | "backward" | "front" | "back") => {
      if (editingId) {
        handleCommitInlineEdit();
      }
      setElements((prev) => {
        if (prev.length < 2) return prev;
        const ordered = [...prev].sort((a, b) => a.zIndex - b.zIndex);
        const currentIndex = ordered.findIndex((item) => item.id === id);
        if (currentIndex === -1) return prev;
        const targetIndex = (() => {
          switch (direction) {
            case "forward":
              return Math.min(ordered.length - 1, currentIndex + 1);
            case "backward":
              return Math.max(0, currentIndex - 1);
            case "front":
              return ordered.length - 1;
            case "back":
              return 0;
            default:
              return currentIndex;
          }
        })();
        if (targetIndex === currentIndex) return prev;
        const reordered = [...ordered];
        const [moved] = reordered.splice(currentIndex, 1);
        reordered.splice(targetIndex, 0, moved);
        return reordered.map((element, index) => ({
          ...element,
          zIndex: index + 1,
        }));
      });
    },
    [editingId, handleCommitInlineEdit],
  );

  const handleLayerOpacityChange = useCallback(
    (id: string, opacity: number) => {
      updateElement(id, { opacity: clamp(opacity, 0, 1) });
    },
    [updateElement],
  );

  const handleToggleLayerLock = useCallback(
    (id: string) => {
      const element = elements.find((item) => item.id === id);
      const nextLocked = !(element?.locked ?? false);
      setElements((prev) =>
        prev.map((item) =>
          item.id === id
            ? ({
                ...item,
                locked: nextLocked,
              } as DesignerElement)
            : item,
        ),
      );
      if (nextLocked && editingId === id) {
        setEditingId(null);
        setEditingDraft(null);
      }
    },
    [elements, editingId, setEditingDraft],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        const isTextInput =
          tagName === "input" ||
          tagName === "textarea" ||
          activeElement.isContentEditable ||
          activeElement.getAttribute("role") === "textbox";

        // Allow undo/redo even in text inputs
        if (isTextInput) {
          if (
            (event.key === "z" || event.key === "Z") &&
            (event.metaKey || event.ctrlKey)
          ) {
            event.preventDefault();
            if (event.shiftKey) {
              elementsHistory.redo();
            } else {
              elementsHistory.undo();
            }
            toast({
              title: event.shiftKey ? "Redo" : "Undo",
              description: event.shiftKey
                ? "Redid last action"
                : "Undid last action",
            });
          }
          if (
            (event.key === "s" || event.key === "S") &&
            (event.metaKey || event.ctrlKey)
          ) {
            event.preventDefault();
            setHasUnsavedChanges(true);
          }
          return;
        }
      }

      // Handle undo/redo (Ctrl+Z / Ctrl+Shift+Z or Cmd+Z / Cmd+Shift+Z)
      if (
        (event.key === "z" || event.key === "Z") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        if (event.shiftKey) {
          if (elementsHistory.canRedo) {
            elementsHistory.redo();
            toast({
              title: "Redo",
              description: "Redid last action",
            });
          }
        } else {
          if (elementsHistory.canUndo) {
            elementsHistory.undo();
            toast({
              title: "Undo",
              description: "Undid last action",
            });
          }
        }
        return;
      }

      // Handle save (Ctrl+S / Cmd+S)
      if (
        (event.key === "s" || event.key === "S") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setHasUnsavedChanges(true);
        toast({
          title: "Saving...",
          description: "Your design will be saved automatically",
        });
        return;
      }

      if (maskEditor) {
        return;
      }

      if (editingId) {
        if (event.key === "Escape") {
          event.preventDefault();
          handleCancelInlineEdit();
        }
        return;
      }

      if (event.key === "Escape") {
        if (selectedId) {
          event.preventDefault();
          handleDeselect();
        }
        return;
      }

      if (!selectedId) {
        return;
      }

      if (!selectedElement) {
        return;
      }

      const isLocked = Boolean(selectedElement.locked);

      if ((event.key === "Delete" || event.key === "Backspace") && !isLocked) {
        event.preventDefault();
        handleDeleteSelected();
        toast({
          title: "Element deleted",
          description: "Press Ctrl+Z to undo",
        });
        return;
      }

      if (
        (event.key === "d" || event.key === "D") &&
        (event.metaKey || event.ctrlKey) &&
        !isLocked
      ) {
        event.preventDefault();
        handleDuplicateSelected();
        toast({
          title: "Element duplicated",
          description: "New element created",
        });
        return;
      }

      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        switch (event.key) {
          case "ArrowUp":
            handleNudgeSelected(0, -step);
            break;
          case "ArrowDown":
            handleNudgeSelected(0, step);
            break;
          case "ArrowLeft":
            handleNudgeSelected(-step, 0);
            break;
          case "ArrowRight":
            handleNudgeSelected(step, 0);
            break;
          default:
            break;
        }
        return;
      }
    },
    [
      editingId,
      handleCancelInlineEdit,
      handleDeleteSelected,
      handleDuplicateSelected,
      handleDeselect,
      handleNudgeSelected,
      maskEditor,
      selectedElement,
      selectedId,
      elementsHistory,
      toast,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleApplyTemplate = useCallback(
    (template: MenuTemplate) => {
      setEditingId(null);
      setEditingDraft(null);
      template.elements.forEach((element) => {
        const fontValue = (element as { fontFamily?: string }).fontFamily;
        if (fontValue) {
          ensureFontLoaded(fontValue);
        }
      });
      const mappedElements = createElementsFromTemplate(template);
      setElements(mappedElements);
      setSelectedId(mappedElements[0]?.id ?? null);
      if (template.settings) {
        setCanvasSettings((prev) => ({
          ...prev,
          ...template.settings,
        }));
      }
      if (template.pageSize) {
        setPageSize(template.pageSize);
        const matchedPreset = PAGE_PRESETS.find(
          (preset) =>
            preset.widthPx === template.pageSize?.width &&
            preset.heightPx === template.pageSize?.height,
        );
        if (matchedPreset) {
          setPagePreset(matchedPreset.id);
          setPrintPreset(matchedPreset);
          const nextMargin =
            typeof template.settings?.margin === "number"
              ? template.settings.margin
              : matchedPreset.safeMarginPx;
          setCanvasSettings((prev) => ({
            ...prev,
            margin: nextMargin,
            bleed: matchedPreset.bleedPx,
          }));
        }
      }
      setDocumentName(template.name);
    },
    [ensureFontLoaded],
  );

  const addElement = useCallback(
    (element: Omit<DesignerElement, "id" | "zIndex">) => {
      const payload: DesignerElement = {
        ...element,
        id: createId(),
        zIndex: getNextZIndex(),
        locked: element.locked ?? false,
      };
      if (payload.fontFamily) {
        ensureFontLoaded(payload.fontFamily);
      }
      setElements((prev) => [...prev, payload]);
      setSelectedId(payload.id);
    },
    [ensureFontLoaded, getNextZIndex],
  );

  const handleAddHeading = useCallback(() => {
    addElement({
      type: "heading",
      name: "Headline",
      text: "New Menu Headline",
      x: canvasSettings.margin + 24,
      y: canvasSettings.margin + 24,
      width: Math.min(520, pageSize.width - canvasSettings.margin * 2),
      height: 96,
      rotation: 0,
      opacity: 1,
      fontFamily: "'Playfair Display', serif",
      fontSize: 52,
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: 1.8,
      color: "#111827",
      align: "left",
    });
  }, [addElement, canvasSettings.margin, pageSize.width]);

  const handleAddBody = useCallback(() => {
    addElement({
      type: "body",
      name: "Body Copy",
      text: "Describe ingredients, sourcing stories, or service cues.",
      x: canvasSettings.margin + 24,
      y: canvasSettings.margin + 140,
      width: Math.min(520, pageSize.width - canvasSettings.margin * 2),
      height: 140,
      rotation: 0,
      opacity: 1,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: 0.3,
      color: "#374151",
      align: "left",
    });
  }, [addElement, canvasSettings.margin, pageSize.width]);

  const handleAddMenuItem = useCallback(() => {
    addElement({
      type: "menu-item",
      name: "Menu Item",
      text: "Seared Diver Scallops",
      description: "meyer lemon · toasted barley · smoked trout roe",
      price: 28,
      currency: "USD",
      x: canvasSettings.margin + 24,
      y: canvasSettings.margin + 220,
      width: Math.min(420, pageSize.width - canvasSettings.margin * 2),
      height: 112,
      rotation: 0,
      opacity: 1,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 18,
      lineHeight: 1.55,
      letterSpacing: 0.4,
      color: "#1f2937",
      accentColor: "#38bdf8",
    });
  }, [addElement, canvasSettings.margin, pageSize.width]);

  const handleAddDivider = useCallback(() => {
    addElement({
      type: "divider",
      name: "Divider",
      x: canvasSettings.margin + 24,
      y: canvasSettings.margin + 320,
      width: Math.min(480, pageSize.width - canvasSettings.margin * 2),
      height: 4,
      rotation: 0,
      opacity: 0.65,
      thickness: 2,
      color: "#94a3b8",
    });
  }, [addElement, canvasSettings.margin, pageSize.width]);

  const handleAddShape = useCallback(
    (shape: "rectangle" | "ellipse") => {
      addElement({
        type: "shape",
        name: shape === "ellipse" ? "Spotlight" : "Backdrop",
        x: canvasSettings.margin,
        y: canvasSettings.margin,
        width: shape === "ellipse" ? 220 : 520,
        height: shape === "ellipse" ? 220 : 300,
        rotation: 0,
        opacity: 0.9,
        shape,
        fill: shape === "ellipse" ? "#facc15" : "#f1f5f9",
        borderColor: shape === "ellipse" ? "#facc15" : "#e2e8f0",
        borderWidth: shape === "ellipse" ? 0 : 1,
        borderRadius: shape === "ellipse" ? 220 : 36,
      });
    },
    [addElement, canvasSettings.margin],
  );

  const handleAddImage = useCallback(
    (url: string, label: string) => {
      addElement({
        type: "image",
        name: label,
        imageUrl: url,
        x: canvasSettings.margin + 24,
        y: canvasSettings.margin + 24,
        width: 260,
        height: 320,
        rotation: 0,
        opacity: 1,
        objectFit: "cover",
        borderRadius: 32,
      });
    },
    [addElement, canvasSettings.margin],
  );

  const handleAddImageFromGallery = useCallback(
    (image: any) => {
      const imageUrl = image.dataUrl || image.blobUrl;
      if (imageUrl) {
        handleAddImage(imageUrl, image.name);
        setShowGalleryPicker(false);
        toast({
          title: "Image added",
          description: `${image.name} has been added to the canvas.`,
        });
      }
    },
    [handleAddImage, toast],
  );

  const handleSaveDesign = useCallback(
    (name: string) => {
      try {
        const designData = {
          id: `design-${Date.now()}`,
          name,
          elements,
          pageSize,
          canvasSettings,
          pagePreset,
          printPreset,
          updatedAt: Date.now(),
          version: 1 as const,
        };
        saveDesign(designData);
        setSavedDesigns(getSavedDesigns());
        setHasUnsavedChanges(false);
        setDocumentName(name);
        toast({
          title: "Design saved",
          description: `${name} has been saved successfully.`,
        });
      } catch (error) {
        console.error("Save failed:", error);
        toast({
          title: "Save failed",
          description: "Failed to save design.",
          variant: "destructive",
        });
      }
    },
    [elements, pageSize, canvasSettings, pagePreset, printPreset, toast],
  );

  const handleLoadDesign = useCallback(
    (design: any) => {
      try {
        // Validate design object
        if (!design || typeof design !== "object") {
          throw new Error("Invalid design object");
        }

        // Validate and extract design properties with defaults
        const designElements = Array.isArray(design.elements) ? design.elements : [];
        const designPageSize = design.pageSize || INITIAL_PAGE_SIZE;
        const designCanvasSettings = design.canvasSettings || INITIAL_CANVAS;
        const designPagePreset = design.pagePreset || DEFAULT_PRESET.id;
        const designPrintPreset = design.printPreset || DEFAULT_PRESET;
        const designName = design.name || "Untitled Menu";

        // Validate elements before using them
        const validElements = designElements.every((el: any) => el && typeof el === "object");
        if (!validElements) {
          console.warn("Some design elements are invalid, using valid ones only");
        }

        // Update state in sequence with error handling
        setElements(designElements);
        setPageSize(designPageSize);
        setCanvasSettings(designCanvasSettings);
        setPagePreset(designPagePreset);
        setPrintPreset(designPrintPreset);
        setDocumentName(designName);
        setSelectedId(designElements?.[0]?.id ?? null);
        setHasUnsavedChanges(false);

        // Reset history with validated elements
        elementsHistory.reset(designElements);

        toast({
          title: "Design loaded",
          description: `${designName} has been loaded successfully.`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Load failed:", errorMessage, error);
        toast({
          title: "Load failed",
          description: `Failed to load design: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
    [toast, elementsHistory],
  );

  const handleDeleteSavedDesign = useCallback(
    (designId: string) => {
      try {
        deleteDesign(designId);
        setSavedDesigns(getSavedDesigns());
        toast({
          title: "Design deleted",
          description: "The design has been removed from storage.",
        });
      } catch (error) {
        console.error("Delete failed:", error);
        toast({
          title: "Delete failed",
          description: "Failed to delete design.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handlePaletteApply = useCallback(
    (swatches: string[]) => {
      if (selectedElement) {
        if (selectedElement.type === "shape") {
          updateElement(selectedElement.id, {
            fill: swatches[1] ?? swatches[0],
            borderColor: swatches[2] ?? swatches[0],
          });
        } else if (selectedElement.type === "menu-item") {
          updateElement(selectedElement.id, {
            color: swatches[0],
            accentColor: swatches[1] ?? swatches[0],
          });
        } else {
          updateElement(selectedElement.id, {
            color: swatches[0],
          });
        }
      } else {
        setCanvasSettings((prev) => ({
          ...prev,
          background: swatches[0],
        }));
      }
    },
    [selectedElement, updateElement],
  );

  const handleToggleGrid = useCallback(() => {
    setCanvasSettings((prev) => ({
      ...prev,
      showGrid: !prev.showGrid,
    }));
  }, []);

  const handleToggleColumns = useCallback(() => {
    setCanvasSettings((prev) => ({
      ...prev,
      showColumns: !prev.showColumns,
    }));
  }, []);

  const handleToggleMargins = useCallback(() => {
    setCanvasSettings((prev) => ({
      ...prev,
      showMargins: !prev.showMargins,
    }));
  }, []);

  const handleAdjustFontSize = useCallback(
    (delta: number) => {
      if (!selectedElement) return;
      if (
        !["heading", "subheading", "body", "menu-item"].includes(
          selectedElement.type,
        )
      ) {
        return;
      }
      if (selectedElement.locked) {
        return;
      }
      const nextSize = clamp((selectedElement.fontSize ?? 16) + delta, 6, 240);
      updateElement(selectedElement.id, {
        fontSize: nextSize,
      });
    },
    [selectedElement, updateElement],
  );

  const handleAdjustLetterSpacing = useCallback(
    (delta: number) => {
      if (!selectedElement) return;
      if (
        !["heading", "subheading", "body", "menu-item"].includes(
          selectedElement.type,
        )
      ) {
        return;
      }
      if (selectedElement.locked) {
        return;
      }
      const current = selectedElement.letterSpacing ?? 0;
      updateElement(selectedElement.id, {
        letterSpacing: Number((current + delta).toFixed(2)),
      });
    },
    [selectedElement, updateElement],
  );

  const handleAdjustLineHeight = useCallback(
    (delta: number) => {
      if (!selectedElement) return;
      if (
        !["heading", "subheading", "body", "menu-item"].includes(
          selectedElement.type,
        )
      ) {
        return;
      }
      if (selectedElement.locked) {
        return;
      }
      const current = selectedElement.lineHeight ?? 1.4;
      updateElement(selectedElement.id, {
        lineHeight: Number(clamp(current + delta, 0.6, 3).toFixed(2)),
      });
    },
    [selectedElement, updateElement],
  );

  const handleAlignChange = useCallback(
    (align: "left" | "center" | "right") => {
      if (!selectedElement) return;
      if (
        !["heading", "subheading", "body", "menu-item"].includes(
          selectedElement.type,
        )
      ) {
        return;
      }
      if (selectedElement.locked) {
        return;
      }
      updateElement(selectedElement.id, { align });
    },
    [selectedElement, updateElement],
  );

  const handleExportLayout = useCallback(async () => {
    const payload = {
      name: documentName,
      pageSize,
      canvasSettings,
      elements,
    };
    const serialized = JSON.stringify(payload, null, 2);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(serialized);
        toast({
          title: "Layout copied",
          description: "JSON payload copied to clipboard for handoff.",
        });
      }
    } catch (error) {
      console.error("Failed to copy layout", error);
    }
  }, [canvasSettings, documentName, elements, pageSize, toast]);

  const handleExportPDF = useCallback(async () => {
    try {
      toast({
        title: "Exporting...",
        description: "Generating PDF, this may take a moment.",
      });

      const canvasElement = workspaceRef.current?.querySelector(
        "[data-canvas]",
      ) as HTMLDivElement;
      if (!canvasElement) {
        throw new Error("Canvas element not found");
      }

      await exportDesignAsPDF(
        canvasElement,
        documentName || t("menu.menuDesignStudio"),
        printPreset,
      );
      toast({
        title: "PDF exported",
        description: "Your design has been saved as PDF.",
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export PDF. Make sure jsPDF is installed.",
        variant: "destructive",
      });
    }
  }, [documentName, printPreset, toast, workspaceRef]);

  const handleExportSVG = useCallback(async () => {
    try {
      await exportDesignAsSVG(
        elements,
        pageSize,
        documentName || t("menu.menuDesignStudio"),
      );
      toast({
        title: "SVG exported",
        description: "Your design has been saved as SVG.",
      });
    } catch (error) {
      console.error("SVG export failed:", error);
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Failed to export SVG.",
        variant: "destructive",
      });
    }
  }, [elements, pageSize, documentName, toast]);

  const handleExportAllergenMatrix = useCallback(async () => {
    const menuItems = elements.filter((el) => el.type === "menu-item");
    if (menuItems.length === 0) {
      toast({
        title: "No menu items",
        description: "Add menu items to your design before generating the allergen report.",
        variant: "destructive",
      });
      return;
    }
    try {
      await exportAllergenMatrixPDF(
        menuItems.map((el) => ({ text: el.text ?? el.name, allergenTags: el.allergenTags })),
        documentName || "Menu",
      );
      toast({
        title: "Allergen report exported",
        description: "Allergen matrix PDF has been downloaded.",
      });
    } catch (error) {
      console.error("Allergen report export failed:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to generate allergen report.",
        variant: "destructive",
      });
    }
  }, [elements, documentName, toast]);

  const handleResetWorkspace = useCallback(() => {
    setElements([]);
    setSelectedId(null);
    setDocumentName("Untitled Menu");
    setPagePreset(DEFAULT_PRESET.id);
    setPrintPreset(DEFAULT_PRESET);
    setCanvasSettings(() => ({ ...INITIAL_CANVAS }));
    setPageSize(() => ({ ...INITIAL_PAGE_SIZE }));
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setCanvasSettings((prev) => ({
      ...prev,
      zoom: clamp(Number(prev.zoom.toFixed(2)) + delta, 0.3, 1.6),
    }));
  }, []);

  const handlePagePresetChange = useCallback((id: string) => {
    const preset = PAGE_PRESETS.find((entry) => entry.id === id);
    if (!preset) return;
    setPagePreset(preset.id);
    setPrintPreset(preset);
    setPageSize({ width: preset.widthPx, height: preset.heightPx });
    setCanvasSettings((prev) => ({
      ...prev,
      margin: preset.safeMarginPx,
      bleed: preset.bleedPx,
    }));
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!selectedId) return;
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteSelected();
        return;
      }
      if (
        (event.key === "d" || event.key === "D") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        handleDuplicateSelected();
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx =
          event.key === "ArrowRight"
            ? step
            : event.key === "ArrowLeft"
              ? -step
              : 0;
        const dy =
          event.key === "ArrowDown"
            ? step
            : event.key === "ArrowUp"
              ? -step
              : 0;
        if (!dx && !dy) return;
        const element = elements.find((entry) => entry.id === selectedId);
        if (!element) return;
        updateElement(selectedId, {
          x: clamp(element.x + dx, 0, pageSize.width - element.width),
          y: clamp(element.y + dy, 0, pageSize.height - element.height),
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    elements,
    handleDeleteSelected,
    handleDuplicateSelected,
    pageSize.height,
    pageSize.width,
    selectedId,
    updateElement,
  ]);

  return (
    <div className="flex h-full min-h-[calc(100vh-140px)] flex-col gap-4 px-4 pb-10 pt-4 lg:px-6">
      <UndoRedoFeedbackComponent />
      <Card className="border border-[#c8a97e]/25 bg-gradient-to-br from-[#c8a97e]/10 via-background to-emerald-500/5 shadow-lg">
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-semibold uppercase tracking-[0.45em] text-[#b8976c] dark:text-[#c8a97e]/80">
                {t("menu.menuDesignStudio")}
              </CardTitle>
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 rounded-full bg-amber-100/70 px-3 py-1 dark:bg-amber-500/20">
                  <div className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">
                    Unsaved changes
                  </span>
                </div>
              )}
            </div>
            <CardDescription className="max-w-3xl text-sm">
              Start from a blank canvas or seasoned templates, arrange
              typography, imagery, and pricing with precise grid control, and
              export layout primitives ready for production.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-1">
              <Select value={pagePreset} onValueChange={handlePagePresetChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={t("menu.menuDesignStudio")} />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {`${formatInches(printPreset.widthIn)}��� × ${formatInches(printPreset.heightIn)}″ • ${printPreset.dpi} DPI`}
              </div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                {`Safe ${formatInches(printPreset.safeMarginIn)}″ • Bleed ${formatInches(printPreset.bleedIn)}″ • ${printPreset.colorProfile}`}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 pt-0.5">
                {`Canvas: ${Math.round(pageSize.width)}px × ${Math.round(pageSize.height)}px`}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPageSize(({ width, height }) => ({
                  width: height,
                  height: width,
                }))
              }
            >
              <LayoutGrid className="mr-2 h-4 w-4" aria-hidden />
              Flip orientation
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetWorkspace}>
              <FilePlus className="mr-2 h-4 w-4" aria-hidden />
              Blank canvas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyTemplate(seasonalTemplate)}
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Apply seasonal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveLoadDialog(true)}
              className="border-emerald-300/50 hover:border-emerald-400 dark:border-emerald-500/30"
            >
              <Save className="mr-2 h-4 w-4" aria-hidden />
              Save / Load
            </Button>
            <div className="flex items-center gap-2 rounded-lg border-2 border-blue-400/50 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-950/30 p-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLayout}
                title="Copy design as JSON to clipboard for technical handoff"
                className="border-blue-300 hover:bg-blue-100 dark:border-blue-600 dark:hover:bg-blue-900"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                title="Export design as print-ready PDF with 300 DPI"
                className="border-blue-300 hover:bg-blue-100 dark:border-blue-600 dark:hover:bg-blue-900"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSVG}
                title="Export design as vector SVG for editing"
                className="border-blue-300 hover:bg-blue-100 dark:border-blue-600 dark:hover:bg-blue-900"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                SVG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAllergenMatrix}
                title="Export allergen compliance matrix as PDF"
                className="border-amber-400 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-950/30 dark:hover:bg-amber-900/40"
                data-testid="export-allergen-matrix-btn"
              >
                <ShieldAlert className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                Allergen
              </Button>
            </div>
            <div className="flex items-center gap-1 overflow-hidden rounded-full border border-[#c8a97e]/25">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none"
                onClick={() => elementsHistory.undo()}
                disabled={!elementsHistory.canUndo}
                aria-label="Undo (Ctrl+Z)"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none"
                onClick={() => elementsHistory.redo()}
                disabled={!elementsHistory.canRedo}
                aria-label="Redo (Ctrl+Shift+Z)"
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw className="h-4 w-4" aria-hidden />
              </Button>
              <div className="h-5 w-px bg-border" />
            </div>
            <div className="flex items-center overflow-hidden rounded-full border border-[#c8a97e]/25">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none"
                onClick={() => handleZoom(-0.05)}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" aria-hidden />
              </Button>
              <span className="px-3 text-xs font-medium uppercase tracking-[0.32em] text-muted-foreground">
                {Math.round(canvasSettings.zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none"
                onClick={() => handleZoom(0.05)}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-1 flex-col gap-4 xl:flex-row">
        <ToolSidebar
          documentName={documentName}
          setDocumentName={setDocumentName}
          templates={TEMPLATE_PRESETS}
          onApplyTemplate={handleApplyTemplate}
          onAddHeading={handleAddHeading}
          onAddBody={handleAddBody}
          onAddMenuItem={handleAddMenuItem}
          onAddDivider={handleAddDivider}
          onAddShape={handleAddShape}
          onAddImage={handleAddImage}
          imageLibrary={IMAGE_LIBRARY}
          colorPalettes={COLOR_PALETTES}
          onPaletteApply={handlePaletteApply}
          selectedElement={selectedElement}
          onOpenGalleryPicker={() => setShowGalleryPicker(true)}
        />

        {showGalleryPicker && (
          <GalleryImagePicker
            key={galleryImages.length}
            images={galleryImages}
            onSelectImage={handleAddImageFromGallery}
            onClose={() => setShowGalleryPicker(false)}
          />
        )}

        <SaveLoadDialog
          isOpen={showSaveLoadDialog}
          onClose={() => setShowSaveLoadDialog(false)}
          currentName={documentName}
          onSave={handleSaveDesign}
          onLoad={handleLoadDesign}
          savedDesigns={savedDesigns}
          onDeleteDesign={handleDeleteSavedDesign}
        />

        <div ref={workspaceRef} className="relative flex flex-1">
          <DesignerCanvas
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDeselect={handleDeselect}
            canvasSettings={canvasSettings}
            pageSize={pageSize}
            onPositionChange={handlePositionChange}
            editingId={editingId}
            editingDraft={editingDraft}
            onEditingChange={handleInlineEditingChange}
            onBeginEdit={handleBeginInlineEdit}
            onCommitEdit={handleCommitInlineEdit}
            onCancelEdit={handleCancelInlineEdit}
            onCanvasPointerDown={handleCanvasPointerDownCommit}
            maskEditor={maskEditor}
            onMaskPointAdd={handleMaskPointAdd}
            onMaskPreview={handleMaskPreview}
            onMaskComplete={handleMaskCommit}
          />

          <div className="pointer-events-none fixed inset-0 z-50">
            <FloatingToolbarPanel
              containerRef={workspaceRef}
              bounds="viewport"
              state={floatingToolbar}
              onStateChange={handleToolbarStateChange}
              onTogglePin={handleToolbarPinToggle}
              onAddHeading={handleAddHeading}
              onAddBody={handleAddBody}
              onAddMenuItem={handleAddMenuItem}
              onAddDivider={handleAddDivider}
              onAddShape={handleAddShape}
              canvasSettings={canvasSettings}
              onToggleGrid={handleToggleGrid}
              onToggleColumns={handleToggleColumns}
              onToggleMargins={handleToggleMargins}
              selectedElement={selectedElement}
              onAlignChange={handleAlignChange}
              onAdjustFontSize={handleAdjustFontSize}
              onAdjustLetterSpacing={handleAdjustLetterSpacing}
              onAdjustLineHeight={handleAdjustLineHeight}
              onDuplicateSelected={handleDuplicateSelected}
              onDeleteSelected={handleDeleteSelected}
              onSelectionUpdate={updateElement}
            />
            <FloatingLayersPanel
              containerRef={workspaceRef}
              bounds="viewport"
              state={floatingLayersPanel}
              onStateChange={handleLayersPanelStateChange}
              onTogglePin={handleLayersPinToggle}
              layers={sortedLayers}
              selectedId={selectedId}
              onSelectLayer={handleSelectLayer}
              onLayerShift={handleLayerShift}
              onChangeOpacity={handleLayerOpacityChange}
              onToggleLock={handleToggleLayerLock}
            />
          </div>
        </div>

        <InspectorPanel
          canvasSettings={canvasSettings}
          onCanvasSettingsChange={(changes) =>
            setCanvasSettings((prev) => ({ ...prev, ...changes }))
          }
          pageSize={pageSize}
          onPageSizeChange={(changes) =>
            setPageSize((prev) => ({ ...prev, ...changes }))
          }
          selectedElement={selectedElement}
          onUpdateElement={updateElement}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateSelected={handleDuplicateSelected}
          layers={sortedLayers}
          onSelectLayer={handleSelectLayer}
          onLayerShift={handleLayerShift}
          onLayerOpacityChange={handleLayerOpacityChange}
          onToggleLayerLock={handleToggleLayerLock}
          maskEditor={maskEditor}
          onBeginMaskEditing={handleBeginMaskEditing}
          onMaskUndo={handleMaskUndo}
          onMaskCommit={handleMaskCommit}
          onMaskCancel={handleMaskCancel}
          onMaskClear={handleMaskClear}
        />
      </div>
    </div>
  );
}

type ToolSidebarProps = {
  documentName: string;
  setDocumentName: (value: string) => void;
  templates: MenuTemplate[];
  onApplyTemplate: (template: MenuTemplate) => void;
  onAddHeading: () => void;
  onAddBody: () => void;
  onAddMenuItem: () => void;
  onAddDivider: () => void;
  onAddShape: (shape: "rectangle" | "ellipse") => void;
  onAddImage: (url: string, label: string) => void;
  imageLibrary: typeof IMAGE_LIBRARY;
  colorPalettes: typeof COLOR_PALETTES;
  onPaletteApply: (swatches: string[]) => void;
  selectedElement: DesignerElement | null;
  onOpenGalleryPicker?: () => void;
};

function ToolSidebar({
  documentName,
  setDocumentName,
  templates,
  onApplyTemplate,
  onAddHeading,
  onAddBody,
  onAddMenuItem,
  onAddDivider,
  onAddShape,
  onAddImage,
  imageLibrary,
  colorPalettes,
  onPaletteApply,
  selectedElement,
  onOpenGalleryPicker,
}: ToolSidebarProps) {
  return (
    <Card className="w-full border border-slate-200/50 bg-white/80 backdrop-blur lg:w-[280px] dark:border-slate-800/60 dark:bg-slate-950/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Project assets
        </CardTitle>
        <CardDescription className="text-xs">
          Templates, components, and palettes to accelerate composition.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label
            htmlFor="document-name"
            className="text-xs uppercase tracking-[0.32em] text-muted-foreground"
          >
            Document
          </Label>
          <Input
            id="document-name"
            value={documentName}
            onChange={(event) => setDocumentName(event.target.value)}
            className="mt-2"
          />
        </div>
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3 text-xs">
            <TabsTrigger value="templates">Layouts</TabsTrigger>
            <TabsTrigger value="elements">Elements</TabsTrigger>
            <TabsTrigger value="palettes">Palettes</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-3">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="border border-slate-200 bg-white/70 shadow-sm transition hover:border-[#c8a97e] dark:border-slate-800/70 dark:bg-slate-900/60"
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-sm font-semibold">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onApplyTemplate(template)}
                      >
                        <Wand2 className="mr-2 h-4 w-4" aria-hidden />
                        Apply layout
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="elements" className="mt-3">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onAddHeading}
              >
                <Type className="mr-2 h-4 w-4" aria-hidden />
                Add headline
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onAddBody}
              >
                <Type className="mr-2 h-4 w-4" aria-hidden />
                Add body copy
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onAddMenuItem}
              >
                <Ruler className="mr-2 h-4 w-4" aria-hidden />
                Add menu item
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onAddShape("rectangle")}
              >
                <Square className="mr-2 h-4 w-4" aria-hidden />
                Add rectangle
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onAddShape("ellipse")}
              >
                <Circle className="mr-2 h-4 w-4" aria-hidden />
                Add ellipse
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onAddDivider}
              >
                <LayoutGrid className="mr-2 h-4 w-4" aria-hidden />
                Add divider
              </Button>
              <Separator className="my-3" />
              {onOpenGalleryPicker && (
                <Button
                  variant="outline"
                  className="w-full justify-start border-sky-300/50 bg-sky-50 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-950/30 dark:hover:bg-sky-900/30"
                  onClick={onOpenGalleryPicker}
                >
                  <ImageIcon className="mr-2 h-4 w-4" aria-hidden />
                  From gallery
                </Button>
              )}
              <Separator className="my-3" />
              <ScrollArea className="h-[180px] pr-3">
                <div className="grid grid-cols-2 gap-2">
                  {imageLibrary.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="group overflow-hidden rounded-xl border border-slate-200 bg-white/80 text-left text-xs font-medium transition hover:border-[#c8a97e] dark:border-slate-800/70 dark:bg-slate-900/60"
                      onClick={() => onAddImage(asset.url, asset.label)}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <ResponsiveImage
                          src={asset.url}
                          alt={asset.label}
                          width={400}
                          height={300}
                          className="h-full w-full transition duration-500 group-hover:scale-[1.05]"
                          objectFit="cover"
                        />
                      </div>
                      <div className="px-2 py-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        <ImageIcon
                          className="mr-1 inline h-3 w-3"
                          aria-hidden
                        />
                        {asset.label}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          <TabsContent value="palettes" className="mt-3">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-3">
                {colorPalettes.map((palette) => (
                  <Card
                    key={palette.name}
                    className="border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60"
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-sm font-medium">
                        {palette.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Click to apply to{" "}
                        {selectedElement ? "selection" : "canvas"}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {palette.swatches.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            className="h-8 w-8 rounded-full border border-slate-200 shadow-sm transition hover:scale-110 dark:border-slate-700"
                            style={{ backgroundColor: swatch }}
                            onClick={() => onPaletteApply(palette.swatches)}
                            aria-label={`Apply swatch ${swatch}`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

type DesignerCanvasProps = {
  elements: DesignerElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  canvasSettings: CanvasSettings;
  pageSize: PageSize;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  editingId: string | null;
  editingDraft: Partial<DesignerElement> | null;
  onEditingChange: (changes: Partial<DesignerElement>) => void;
  onBeginEdit: (id: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onCanvasPointerDown?: () => void;
  maskEditor: MaskEditorState | null;
  onMaskPointAdd: (point: PolygonPoint) => void;
  onMaskPreview: (point: PolygonPoint | null) => void;
  onMaskComplete: () => void;
};

function DesignerCanvas({
  elements,
  selectedId,
  onSelect,
  onDeselect,
  canvasSettings,
  pageSize,
  onPositionChange,
  editingId,
  editingDraft,
  onEditingChange,
  onBeginEdit,
  onCommitEdit,
  onCancelEdit,
  onCanvasPointerDown,
  maskEditor,
  onMaskPointAdd,
  onMaskPreview,
  onMaskComplete,
}: DesignerCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<ElementDragState | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const clientX = event.clientX;
      const clientY = event.clientY;

      rafRef.current = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const zoom = canvasSettings.zoom || 1;
        const pointerX = (clientX - rect.left) / zoom;
        const pointerY = (clientY - rect.top) / zoom;
        const nextX = clamp(
          pointerX - drag.offsetX,
          0,
          pageSize.width - drag.width,
        );
        const nextY = clamp(
          pointerY - drag.offsetY,
          0,
          pageSize.height - drag.height,
        );
        onPositionChange(drag.id, { x: nextX, y: nextY });
      });
    },
    [canvasSettings.zoom, onPositionChange, pageSize.height, pageSize.width],
  );

  const handlePointerUp = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  const handleElementPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, element: DesignerElement) => {
      event.stopPropagation();
      if (maskEditor) {
        return;
      }
      if (event.button !== 0) return;
      if (editingId) {
        if (editingId === element.id) {
          onSelect(element.id);
          return;
        }
        onCommitEdit();
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (element.locked) {
        onSelect(element.id);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const zoom = canvasSettings.zoom || 1;
      const pointerX = (event.clientX - rect.left) / zoom;
      const pointerY = (event.clientY - rect.top) / zoom;
      dragRef.current = {
        id: element.id,
        offsetX: pointerX - element.x,
        offsetY: pointerY - element.y,
        width: element.width,
        height: element.height,
      };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      onSelect(element.id);
    },
    [
      canvasSettings.zoom,
      editingId,
      handlePointerMove,
      handlePointerUp,
      maskEditor,
      onCommitEdit,
      onSelect,
    ],
  );

  const handleCanvasPointerDown = useCallback(() => {
    if (maskEditor) {
      return;
    }
    if (onCanvasPointerDown) {
      onCanvasPointerDown();
    }
    onDeselect();
  }, [maskEditor, onCanvasPointerDown, onDeselect]);

  const innerWidth = useMemo(
    () => pageSize.width - canvasSettings.margin * 2,
    [canvasSettings.margin, pageSize.width],
  );

  const columnWidth = useMemo(() => {
    if (canvasSettings.columns <= 0) return innerWidth;
    return (
      (innerWidth - canvasSettings.gutter * (canvasSettings.columns - 1)) /
      canvasSettings.columns
    );
  }, [canvasSettings.columns, canvasSettings.gutter, innerWidth]);

  const gridStyle = canvasSettings.showGrid
    ? {
        backgroundImage:
          "linear-gradient(0deg, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)",
        backgroundSize: `${canvasSettings.gridSize}px ${canvasSettings.gridSize}px`,
      }
    : {};

  const handleElementDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, element: DesignerElement) => {
      event.stopPropagation();
      if (element.locked || !isTextEditableElement(element)) return;
      onSelect(element.id);
      onBeginEdit(element.id);
    },
    [onBeginEdit, onSelect],
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 overflow-auto rounded-3xl border border-slate-200 bg-slate-100/40 p-6 shadow-inner dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="flex w-full justify-center">
          <div
            className="relative"
            style={{
              width: pageSize.width * canvasSettings.zoom,
              height: pageSize.height * canvasSettings.zoom,
            }}
          >
            <div
              ref={canvasRef}
              role="presentation"
              className="relative rounded-[40px] shadow-2xl transition-colors"
              style={{
                width: pageSize.width,
                height: pageSize.height,
                transform: `scale(${canvasSettings.zoom})`,
                transformOrigin: "top left",
                backgroundColor: canvasSettings.background,
                ...gridStyle,
              }}
              onPointerDown={handleCanvasPointerDown}
            >
              {canvasSettings.showBleed && canvasSettings.bleed > 0 ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    borderRadius: "inherit",
                    boxShadow: `0 0 0 ${canvasSettings.bleed}px rgba(244, 63, 94, 0.18)`,
                    border: "1px dashed rgba(244, 63, 94, 0.55)",
                  }}
                />
              ) : null}
              {canvasSettings.showMargins && canvasSettings.margin > 0 ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    padding: canvasSettings.margin,
                  }}
                >
                  <div
                    className="h-full w-full rounded-[32px] border border-dashed"
                    style={{
                      borderColor: "rgba(200, 169, 126, 0.6)",
                      backgroundColor: "rgba(200, 169, 126, 0.08)",
                    }}
                  />
                </div>
              ) : null}
              {canvasSettings.showColumns && canvasSettings.columns > 0 ? (
                <div
                  className="pointer-events-none absolute inset-0 flex"
                  style={{
                    paddingLeft: canvasSettings.margin,
                    paddingRight: canvasSettings.margin,
                  }}
                >
                  {new Array(canvasSettings.columns)
                    .fill(null)
                    .map((_, index) => (
                      <div
                        key={`column-${index}`}
                        style={{
                          width: columnWidth,
                          marginRight:
                            index === canvasSettings.columns - 1
                              ? 0
                              : canvasSettings.gutter,
                          backgroundColor: "rgba(59,130,246,0.04)",
                          borderLeft: "1px solid rgba(59,130,246,0.16)",
                          borderRight: "1px solid rgba(59,130,246,0.16)",
                        }}
                      />
                    ))}
                </div>
              ) : null}
              {sortedElements.map((element) => {
                const isSelected = element.id === selectedId;
                const isLocked = Boolean(element.locked);
                const isEditable = isTextEditableElement(element);
                const isEditing = Boolean(
                  editingId && editingId === element.id && editingDraft,
                );
                const isMaskEditing = Boolean(
                  maskEditor && maskEditor.elementId === element.id,
                );
                const draft = isEditing && editingDraft ? editingDraft : null;
                const draftText =
                  draft && "text" in draft
                    ? ((draft.text as string | undefined) ?? "")
                    : (element.text ?? "");
                const draftName =
                  draft && "name" in draft
                    ? ((draft.name as string | undefined) ?? "")
                    : (element.name ?? "");
                const draftDescription =
                  draft && "description" in draft
                    ? ((draft.description as string | undefined) ?? "")
                    : (element.description ?? "");
                const draftCurrency =
                  draft && "currency" in draft
                    ? ((draft.currency as string | undefined) ??
                      element.currency ??
                      "USD")
                    : (element.currency ?? "USD");
                const draftPrice =
                  draft && "price" in draft
                    ? (draft.price as number | undefined)
                    : element.price;
                const draftPriceDisplay =
                  draftPrice != null && !Number.isNaN(draftPrice)
                    ? String(draftPrice)
                    : "";
                return (
                  <div
                    key={element.id}
                    role="presentation"
                    className={cn(
                      "group absolute select-none transition-shadow",
                      isSelected
                        ? "ring-2 ring-[#c8a97e]"
                        : "shadow-sm ring-1 ring-transparent",
                      isLocked && !isSelected
                        ? "ring-1 ring-amber-400/70"
                        : undefined,
                    )}
                    data-locked={isLocked || undefined}
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      transform: `rotate(${element.rotation}deg)` as string,
                      opacity: element.opacity,
                      borderRadius: element.borderRadius,
                      cursor: isMaskEditing
                        ? "crosshair"
                        : isLocked
                          ? "not-allowed"
                          : isEditing
                            ? "text"
                            : "move",
                      zIndex: element.zIndex,
                    }}
                    onPointerDown={
                      isMaskEditing
                        ? undefined
                        : (event) => handleElementPointerDown(event, element)
                    }
                    onDoubleClick={
                      isMaskEditing
                        ? undefined
                        : (event) => handleElementDoubleClick(event, element)
                    }
                  >
                    <div className="relative h-full w-full">
                      <div
                        className={cn(
                          "h-full w-full transition-opacity",
                          isEditing
                            ? "pointer-events-none opacity-20"
                            : "opacity-100",
                        )}
                      >
                        {renderElement(element)}
                      </div>
                      {isMaskEditing ? (
                        <MaskDrawingOverlay
                          points={maskEditor?.points ?? []}
                          preview={maskEditor?.preview ?? null}
                          onAddPoint={onMaskPointAdd}
                          onPreview={onMaskPreview}
                          onComplete={onMaskComplete}
                        />
                      ) : null}
                      {isLocked ? (
                        <div className="pointer-events-none absolute -top-3 -right-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
                          <Lock className="h-3.5 w-3.5" aria-hidden />
                          <span className="sr-only">Locked element</span>
                        </div>
                      ) : null}
                      {isEditing && isEditable ? (
                        element.type === "menu-item" ? (
                          <div
                            className="absolute inset-0 z-10 flex h-full w-full flex-col gap-3 rounded-2xl border border-slate-300/60 bg-white/95 p-3 shadow-2xl backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-950/95"
                            onPointerDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.stopPropagation();
                                onCancelEdit();
                              }
                              if (
                                event.key === "Enter" &&
                                (event.metaKey || event.ctrlKey)
                              ) {
                                event.preventDefault();
                                onCommitEdit();
                              }
                            }}
                          >
                            <div className="space-y-2 text-left">
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                                  Label
                                </span>
                                <Input
                                  autoFocus
                                  value={draftName}
                                  onChange={(event) =>
                                    onEditingChange({
                                      name: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                                  Title
                                </span>
                                <Input
                                  value={draftText}
                                  onChange={(event) =>
                                    onEditingChange({
                                      text: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                                  Description
                                </span>
                                <Textarea
                                  rows={3}
                                  value={draftDescription}
                                  className="resize-none"
                                  onChange={(event) =>
                                    onEditingChange({
                                      description: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                                    Price
                                  </span>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    value={draftPriceDisplay}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      const parsed = Number.parseFloat(value);
                                      onEditingChange({
                                        price:
                                          value === "" || Number.isNaN(parsed)
                                            ? undefined
                                            : parsed,
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                                    Currency
                                  </span>
                                  <Input
                                    value={draftCurrency}
                                    onChange={(event) =>
                                      onEditingChange({
                                        currency: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onCancelEdit()}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => onCommitEdit()}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Textarea
                            autoFocus
                            value={draftText}
                            className="absolute inset-0 z-10 h-full w-full resize-none rounded-[inherit] border border-[#c8a97e]/70 bg-white/95 p-3 text-base font-medium shadow-xl focus-visible:ring-2 focus-visible:ring-[#c8a97e] dark:border-[#c8a97e]/30 dark:bg-slate-950/90"
                            style={{
                              fontFamily: element.fontFamily,
                              fontSize: element.fontSize,
                              fontWeight: element.fontWeight,
                              lineHeight: element.lineHeight,
                              letterSpacing: element.letterSpacing,
                              color: element.color ?? "#0f172a",
                              textAlign: element.align,
                              whiteSpace: "pre-wrap",
                            }}
                            onChange={(event) =>
                              onEditingChange({ text: event.target.value })
                            }
                            onPointerDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.stopPropagation();
                                onCancelEdit();
                              }
                              if (
                                event.key === "Enter" &&
                                (event.metaKey || event.ctrlKey)
                              ) {
                                event.preventDefault();
                                onCommitEdit();
                              }
                            }}
                          />
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type MaskDrawingOverlayProps = {
  points: PolygonPoint[];
  preview: PolygonPoint | null;
  onAddPoint: (point: PolygonPoint) => void;
  onPreview: (point: PolygonPoint | null) => void;
  onComplete: () => void;
};

function MaskDrawingOverlay({
  points,
  preview,
  onAddPoint,
  onPreview,
  onComplete,
}: MaskDrawingOverlayProps) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      const point = {
        x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      };
      onAddPoint(point);
    },
    [onAddPoint],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const rect = event.currentTarget.getBoundingClientRect();
      const clientX = event.clientX;
      const clientY = event.clientY;

      rafRef.current = requestAnimationFrame(() => {
        if (!rect.width || !rect.height) {
          onPreview(null);
          return;
        }
        const point = {
          x: clamp((clientX - rect.left) / rect.width, 0, 1),
          y: clamp((clientY - rect.top) / rect.height, 0, 1),
        };
        onPreview(point);
      });
    },
    [onPreview],
  );

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onPreview(null);
  }, [onPreview]);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onComplete();
    },
    [onComplete],
  );

  const polygonPoints = useMemo(() => {
    if (points.length < 3) return "";
    return points
      .map(
        (point) =>
          `${(point.x * 100).toFixed(2)},${(point.y * 100).toFixed(2)}`,
      )
      .join(" ");
  }, [points]);

  const workingPolylinePoints = useMemo(() => {
    const combined = preview ? [...points, preview] : points;
    if (combined.length === 0) return "";
    return combined
      .map(
        (point) =>
          `${(point.x * 100).toFixed(2)},${(point.y * 100).toFixed(2)}`,
      )
      .join(" ");
  }, [points, preview]);

  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {polygonPoints ? (
          <polygon
            points={polygonPoints}
            fill="rgba(200, 169, 126, 0.25)"
            stroke="rgba(200, 169, 126, 0.6)"
            strokeWidth={0.6}
          />
        ) : null}
        {workingPolylinePoints ? (
          <polyline
            points={workingPolylinePoints}
            fill="none"
            stroke="rgba(200, 169, 126, 0.8)"
            strokeWidth={0.7}
            strokeDasharray="1.6 1.6"
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            key={`mask-point-${index}`}
            cx={(point.x * 100).toFixed(2)}
            cy={(point.y * 100).toFixed(2)}
            r={1.6}
            fill="#c8a97e"
            stroke="#ffffff"
            strokeWidth={0.5}
          />
        ))}
        {preview ? (
          <circle
            cx={(preview.x * 100).toFixed(2)}
            cy={(preview.y * 100).toFixed(2)}
            r={1.8}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth={0.5}
            opacity={0.8}
          />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white shadow-lg">
          Click to add points · Double-click/Enter to apply · Esc to cancel
        </span>
      </div>
    </div>
  );
}

function renderElement(element: DesignerElement) {
  switch (element.type) {
    case "heading":
    case "subheading":
    case "body": {
      return (
        <div
          className="h-full w-full"
          style={{
            fontFamily: element.fontFamily,
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            lineHeight: element.lineHeight,
            letterSpacing: element.letterSpacing,
            color: element.color ?? "#1f2937",
            textAlign: element.align,
            whiteSpace: "pre-wrap",
          }}
        >
          {element.text}
        </div>
      );
    }
    case "menu-item": {
      const itemAllergens = (element.allergenTags ?? [])
        .map((slug) => ALLERGEN_TAG_MAP[slug])
        .filter(Boolean) as AllergenTagDef[];
      return (
        <div className="flex h-full w-full flex-col justify-between rounded-xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-slate-900/70">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              {element.name}
            </div>
            <div
              className="mt-1 text-lg font-semibold"
              style={{
                fontFamily: element.fontFamily,
                color: element.color ?? "#111827",
                letterSpacing: element.letterSpacing,
              }}
            >
              {element.text}
              {itemAllergens.length > 0 && (
                <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                  {itemAllergens.map((tag) => (
                    <span
                      key={tag.slug}
                      className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold leading-none"
                      style={{ backgroundColor: tag.color, color: tag.textColor }}
                    >
                      ({tag.code})
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {element.description}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm font-semibold">
            <span className="text-muted-foreground">{element.currency}</span>
            <span
              className="rounded-full px-3 py-1 text-sm"
              style={{
                backgroundColor: `${element.accentColor ?? "#38bdf8"}20`,
                color: element.accentColor ?? "#0f172a",
              }}
            >
              {element.price != null
                ? formatCurrencyValue(element.price, element.currency ?? "USD")
                : "--"}
            </span>
          </div>
        </div>
      );
    }
    case "image": {
      if (!element.imageUrl) {
        return null;
      }
      const clipPath =
        element.mask?.type === "polygon" && element.mask.points.length >= 3
          ? `polygon(${element.mask.points
              .map(
                (point) =>
                  `${(point.x * 100).toFixed(2)}% ${(point.y * 100).toFixed(2)}%`,
              )
              .join(", ")})`
          : undefined;
      return (
        <div
          className="h-full w-full overflow-hidden rounded-[inherit]"
          style={{ clipPath, WebkitClipPath: clipPath }}
        >
          <ResponsiveImage
            src={element.imageUrl}
            alt={element.name}
            className="h-full w-full"
            objectFit={element.objectFit ?? "cover"}
            width={element.width}
            height={element.height}
          />
        </div>
      );
    }
    case "shape": {
      const borderStyle = element.borderWidth
        ? `${element.borderWidth}px solid ${element.borderColor ?? element.fill ?? "transparent"}`
        : undefined;
      if (element.shape === "ellipse") {
        return (
          <div
            className="h-full w-full"
            style={{
              backgroundColor: element.fill ?? "#f1f5f9",
              borderRadius: "9999px",
              border: borderStyle,
            }}
          />
        );
      }
      return (
        <div
          className="h-full w-full rounded-[inherit]"
          style={{
            backgroundColor: element.fill ?? "#f8fafc",
            border: borderStyle,
          }}
        />
      );
    }
    case "divider": {
      return (
        <div
          className="h-full w-full"
          style={{
            height: element.thickness ?? element.height,
            backgroundColor: element.color ?? "#cbd5e1",
          }}
        />
      );
    }
    default:
      return null;
  }
}

type InspectorPanelProps = {
  canvasSettings: CanvasSettings;
  onCanvasSettingsChange: (changes: Partial<CanvasSettings>) => void;
  pageSize: PageSize;
  onPageSizeChange: (changes: Partial<PageSize>) => void;
  selectedElement: DesignerElement | null;
  onUpdateElement: (id: string, changes: Partial<DesignerElement>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  layers: DesignerElement[];
  onSelectLayer: (id: string) => void;
  onLayerShift: (
    id: string,
    direction: "forward" | "backward" | "front" | "back",
  ) => void;
  onLayerOpacityChange: (id: string, opacity: number) => void;
  onToggleLayerLock: (id: string) => void;
  maskEditor: MaskEditorState | null;
  onBeginMaskEditing: (id: string) => void;
  onMaskUndo: () => void;
  onMaskCommit: () => void;
  onMaskCancel: () => void;
  onMaskClear: (id: string) => void;
};

function InspectorPanel({
  canvasSettings,
  onCanvasSettingsChange,
  pageSize,
  onPageSizeChange,
  selectedElement,
  onUpdateElement,
  onDeleteSelected,
  onDuplicateSelected,
  layers,
  onSelectLayer,
  onLayerShift,
  onLayerOpacityChange,
  onToggleLayerLock,
  maskEditor,
  onBeginMaskEditing,
  onMaskUndo,
  onMaskCommit,
  onMaskCancel,
  onMaskClear,
}: InspectorPanelProps) {
  return (
    <Card className="w-full border border-slate-200/60 bg-white/80 backdrop-blur xl:w-[320px] dark:border-slate-800/70 dark:bg-slate-950/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Inspector</CardTitle>
        <CardDescription className="text-xs">
          Adjust canvas settings, manage layers, and refine element details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3 rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800/50">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.32em] text-muted-foreground">
            <span>Canvas</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="page-width"
                className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
              >
                Width
              </Label>
              <Input
                id="page-width"
                type="number"
                min={480}
                value={Math.round(pageSize.width)}
                onChange={(event) =>
                  onPageSizeChange({
                    width: clamp(Number(event.target.value), 480, 2000),
                  })
                }
              />
            </div>
            <div>
              <Label
                htmlFor="page-height"
                className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
              >
                Height
              </Label>
              <Input
                id="page-height"
                type="number"
                min={640}
                value={Math.round(pageSize.height)}
                onChange={(event) =>
                  onPageSizeChange({
                    height: clamp(Number(event.target.value), 640, 2400),
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="canvas-safe-margin"
                className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
              >
                Safe margin
              </Label>
              <Input
                id="canvas-safe-margin"
                type="number"
                min={8}
                value={Math.round(canvasSettings.margin)}
                onChange={(event) =>
                  onCanvasSettingsChange({
                    margin: clamp(
                      Number(event.target.value),
                      8,
                      Math.min(pageSize.width, pageSize.height) / 2 - 8,
                    ),
                  })
                }
              />
            </div>
            <div>
              <Label
                htmlFor="canvas-bleed"
                className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
              >
                Bleed
              </Label>
              <Input
                id="canvas-bleed"
                type="number"
                min={0}
                value={Math.round(canvasSettings.bleed)}
                onChange={(event) =>
                  onCanvasSettingsChange({
                    bleed: clamp(Number(event.target.value), 0, 240),
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="canvas-columns"
                className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
              >
                Columns
              </Label>
              <Input
                id="canvas-columns"
                type="number"
                min={1}
                value={canvasSettings.columns}
                onChange={(event) =>
                  onCanvasSettingsChange({
                    columns: clamp(Number(event.target.value), 1, 8),
                  })
                }
              />
            </div>
            <div>
              <Label
                htmlFor="canvas-gutter"
                className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
              >
                Gutter
              </Label>
              <Input
                id="canvas-gutter"
                type="number"
                min={0}
                value={Math.round(canvasSettings.gutter)}
                onChange={(event) =>
                  onCanvasSettingsChange({
                    gutter: clamp(Number(event.target.value), 0, 120),
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              Grid size
            </Label>
            <Slider
              value={[canvasSettings.gridSize]}
              min={8}
              max={80}
              step={2}
              onValueChange={(value) =>
                onCanvasSettingsChange({
                  gridSize: value[0] ?? canvasSettings.gridSize,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Show grid</span>
              <Switch
                checked={canvasSettings.showGrid}
                onCheckedChange={(checked) =>
                  onCanvasSettingsChange({ showGrid: checked })
                }
              />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Show safe zone</span>
              <Switch
                checked={canvasSettings.showMargins}
                onCheckedChange={(checked) =>
                  onCanvasSettingsChange({ showMargins: checked })
                }
              />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Show bleed overlay</span>
              <Switch
                checked={canvasSettings.showBleed}
                onCheckedChange={(checked) =>
                  onCanvasSettingsChange({ showBleed: checked })
                }
              />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Show column guides</span>
              <Switch
                checked={canvasSettings.showColumns}
                onCheckedChange={(checked) =>
                  onCanvasSettingsChange({ showColumns: checked })
                }
              />
            </label>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              Paper tone
            </Label>
            <input
              id="paper-tone-color"
              name="paper_tone_color"
              type="color"
              value={canvasSettings.background}
              onChange={(event) =>
                onCanvasSettingsChange({ background: event.target.value })
              }
              className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-slate-200"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800/50">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.32em] text-muted-foreground">
            <span>Layers</span>
            <Layers className="h-4 w-4" aria-hidden />
          </div>
          <ScrollArea className="h-[140px] pr-2">
            <div className="space-y-2">
              {layers.map((layer) => {
                const active = selectedElement?.id === layer.id;
                const locked = layer.locked ?? false;
                return (
                  <div
                    key={layer.id}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-xs transition",
                      active
                        ? "border-[#c8a97e] bg-[#c8a97e]/08"
                        : "border-slate-200 bg-white hover:border-[#c8a97e] dark:border-slate-800 dark:bg-slate-900/70",
                      locked ? "opacity-80" : undefined,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectLayer(layer.id)}
                        className="flex flex-1 flex-col text-left"
                      >
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          {layer.name}
                          {locked ? (
                            <Lock
                              className="h-3 w-3 text-amber-500"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
                          {layer.type}
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onToggleLayerLock(layer.id)}
                          aria-label={locked ? "Unlock layer" : "Lock layer"}
                        >
                          {locked ? (
                            <Unlock className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onLayerShift(layer.id, "front")}
                          aria-label="Bring layer to front"
                        >
                          <ChevronsUp className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onLayerShift(layer.id, "forward")}
                          aria-label="Move layer forward"
                        >
                          <ChevronUp className="h-3 w-3" aria-hidden />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onLayerShift(layer.id, "backward")}
                          aria-label="Move layer backward"
                        >
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onLayerShift(layer.id, "back")}
                          aria-label="Send layer to back"
                        >
                          <ChevronsDown className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        Opacity
                      </span>
                      <Slider
                        value={[Math.round((layer.opacity ?? 1) * 100)]}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                        onValueChange={(value) =>
                          onLayerOpacityChange(
                            layer.id,
                            (value[0] ?? 100) / 100,
                          )
                        }
                        aria-label="Layer opacity"
                      />
                      <span className="w-10 text-right text-[10px] font-semibold text-muted-foreground">
                        {Math.round((layer.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800/50">
          {selectedElement ? (
            <ElementInspector
              element={selectedElement}
              onUpdate={onUpdateElement}
              onDelete={onDeleteSelected}
              onDuplicate={onDuplicateSelected}
              maskEditor={maskEditor}
              onBeginMaskEditing={onBeginMaskEditing}
              onMaskUndo={onMaskUndo}
              onMaskCommit={onMaskCommit}
              onMaskCancel={onMaskCancel}
              onMaskClear={onMaskClear}
            />
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Select a layer to expose typography, imagery, and layout
                controls.
              </p>
              <p>
                Use ⌘/Ctrl + D to duplicate and arrow keys to nudge 1px (⇧ +
                arrows for 10px).
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type ElementInspectorProps = {
  element: DesignerElement;
  onUpdate: (id: string, changes: Partial<DesignerElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  maskEditor: MaskEditorState | null;
  onBeginMaskEditing: (id: string) => void;
  onMaskUndo: () => void;
  onMaskCommit: () => void;
  onMaskCancel: () => void;
  onMaskClear: (id: string) => void;
};

function ElementInspector({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  maskEditor,
  onBeginMaskEditing,
  onMaskUndo,
  onMaskCommit,
  onMaskCancel,
  onMaskClear,
}: ElementInspectorProps) {
  const handleChange = (changes: Partial<DesignerElement>) => {
    onUpdate(element.id, changes);
  };

  const isMaskEditing = Boolean(
    maskEditor && maskEditor.elementId === element.id,
  );
  const currentMaskPointCount = isMaskEditing
    ? (maskEditor?.points.length ?? 0)
    : element.mask?.type === "polygon"
      ? element.mask.points.length
      : 0;
  const hasMask = Boolean(
    element.mask?.type === "polygon" && (element.mask.points?.length ?? 0) >= 3,
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Label
          </Label>
          <Input
            value={element.name}
            onChange={(event) => handleChange({ name: event.target.value })}
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            X
          </Label>
          <Input
            type="number"
            value={Math.round(element.x)}
            onChange={(event) =>
              handleChange({ x: Number(event.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Y
          </Label>
          <Input
            type="number"
            value={Math.round(element.y)}
            onChange={(event) =>
              handleChange({ y: Number(event.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Width
          </Label>
          <Input
            type="number"
            value={Math.round(element.width)}
            onChange={(event) =>
              handleChange({
                width: clamp(Number(event.target.value), 40, 2000),
              })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Height
          </Label>
          <Input
            type="number"
            value={Math.round(element.height)}
            onChange={(event) =>
              handleChange({
                height: clamp(Number(event.target.value), 10, 2000),
              })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Rotation
          </Label>
          <Input
            type="number"
            value={Math.round(element.rotation)}
            onChange={(event) =>
              handleChange({ rotation: Number(event.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Opacity
          </Label>
          <Slider
            value={[Math.round(element.opacity * 100)]}
            min={0}
            max={100}
            onValueChange={(value) =>
              handleChange({ opacity: (value[0] ?? 100) / 100 })
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDuplicate}
        >
          <Copy className="mr-2 h-4 w-4" aria-hidden />
          Duplicate
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Delete
        </Button>
      </div>
      {element.type === "heading" ||
      element.type === "subheading" ||
      element.type === "body" ? (
        <TextElementControls element={element} onChange={handleChange} />
      ) : null}
      {element.type === "menu-item" ? (
        <MenuItemControls element={element} onChange={handleChange} />
      ) : null}
      {element.type === "image" ? (
        <ImageControls
          element={element}
          onChange={handleChange}
          onBeginMaskEditing={() => onBeginMaskEditing(element.id)}
          onMaskUndo={onMaskUndo}
          onMaskCommit={onMaskCommit}
          onMaskCancel={onMaskCancel}
          onMaskClear={() => onMaskClear(element.id)}
          isMaskEditing={isMaskEditing}
          maskPointCount={currentMaskPointCount}
          hasMask={hasMask}
        />
      ) : null}
      {element.type === "shape" ? (
        <ShapeControls element={element} onChange={handleChange} />
      ) : null}
      {element.type === "divider" ? (
        <DividerControls element={element} onChange={handleChange} />
      ) : null}
    </div>
  );
}

type TextElementControlsProps = {
  element: DesignerElement;
  onChange: (changes: Partial<DesignerElement>) => void;
};

function TextElementControls({ element, onChange }: TextElementControlsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Content
        </Label>
        <Textarea
          value={element.text ?? ""}
          onChange={(event) => onChange({ text: event.target.value })}
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Font size
          </Label>
          <Input
            type="number"
            value={Math.round(element.fontSize ?? 16)}
            onChange={(event) =>
              onChange({ fontSize: Number(event.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Line height
          </Label>
          <Input
            type="number"
            step={0.05}
            value={Number(element.lineHeight ?? 1.4).toFixed(2)}
            onChange={(event) =>
              onChange({ lineHeight: Number(event.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Letter spacing
          </Label>
          <Input
            type="number"
            step={0.1}
            value={Number(element.letterSpacing ?? 0).toFixed(1)}
            onChange={(event) =>
              onChange({ letterSpacing: Number(event.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Weight
          </Label>
          <Input
            type="number"
            value={element.fontWeight ?? 400}
            onChange={(event) =>
              onChange({ fontWeight: Number(event.target.value) })
            }
          />
        </div>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Typeface
        </Label>
        <Select
          value={element.fontFamily ?? DEFAULT_FONT_VALUE}
          onValueChange={(value) => onChange({ fontFamily: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_LIBRARY.map((font) => (
              <SelectItem
                key={font.value}
                value={font.value}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={element.align === "left" ? "default" : "outline"}
          size="icon"
          onClick={() => onChange({ align: "left" })}
          aria-label="Align left"
        >
          <AlignLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant={element.align === "center" ? "default" : "outline"}
          size="icon"
          onClick={() => onChange({ align: "center" })}
          aria-label="Align center"
        >
          <AlignCenter className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant={element.align === "right" ? "default" : "outline"}
          size="icon"
          onClick={() => onChange({ align: "right" })}
          aria-label="Align right"
        >
          <AlignRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Color
        </Label>
        <input
          type="color"
          value={element.color ?? "#111827"}
          onChange={(event) => onChange({ color: event.target.value })}
          className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-slate-200"
        />
      </div>
    </div>
  );
}

type MenuItemControlsProps = {
  element: DesignerElement;
  onChange: (changes: Partial<DesignerElement>) => void;
};

function MenuItemControls({ element, onChange }: MenuItemControlsProps) {
  const currentTags = element.allergenTags ?? [];
  const allOptions = Object.values(ALLERGEN_TAG_MAP);

  const toggleTag = (slug: string) => {
    const next = currentTags.includes(slug)
      ? currentTags.filter((s) => s !== slug)
      : [...currentTags, slug];
    onChange({ allergenTags: next });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Dish name
        </Label>
        <Input
          value={element.text ?? ""}
          onChange={(event) => onChange({ text: event.target.value })}
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Description
        </Label>
        <Textarea
          value={element.description ?? ""}
          onChange={(event) => onChange({ description: event.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Price
          </Label>
          <Input
            type="number"
            value={element.price ?? 0}
            onChange={(event) =>
              onChange({ price: Number(event.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Currency
          </Label>
          <Input
            value={element.currency ?? "USD"}
            onChange={(event) => onChange({ currency: event.target.value })}
          />
        </div>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Allergens & Diets
        </Label>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded border border-dashed border-slate-300 dark:border-slate-600 p-2" data-testid="menu-item-allergen-controls">
          {allOptions.map((tag) => (
            <label
              key={tag.slug}
              className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
            >
              <input
                type="checkbox"
                className="scale-75"
                checked={currentTags.includes(tag.slug)}
                onChange={() => toggleTag(tag.slug)}
              />
              <span
                className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold leading-none"
                style={{ backgroundColor: tag.color, color: tag.textColor }}
              >
                ({tag.code})
              </span>
              <span className="truncate">{tag.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Text color
        </Label>
        <input
          type="color"
          value={element.color ?? "#111827"}
          onChange={(event) => onChange({ color: event.target.value })}
          className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-slate-200"
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Accent color
        </Label>
        <input
          type="color"
          value={element.accentColor ?? "#38bdf8"}
          onChange={(event) => onChange({ accentColor: event.target.value })}
          className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-slate-200"
        />
      </div>
    </div>
  );
}

type ImageControlsProps = {
  element: DesignerElement;
  onChange: (changes: Partial<DesignerElement>) => void;
  onBeginMaskEditing: () => void;
  onMaskUndo: () => void;
  onMaskCommit: () => void;
  onMaskCancel: () => void;
  onMaskClear: () => void;
  isMaskEditing: boolean;
  maskPointCount: number;
  hasMask: boolean;
};

function ImageControls({
  element,
  onChange,
  onBeginMaskEditing,
  onMaskUndo,
  onMaskCommit,
  onMaskCancel,
  onMaskClear,
  isMaskEditing,
  maskPointCount,
  hasMask,
}: ImageControlsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Image URL
        </Label>
        <Input
          value={element.imageUrl ?? ""}
          onChange={(event) => onChange({ imageUrl: event.target.value })}
          placeholder="https://"
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Object fit
        </Label>
        <Select
          value={element.objectFit ?? "cover"}
          onValueChange={(value) =>
            onChange({ objectFit: value as "cover" | "contain" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Corner radius
        </Label>
        <Slider
          value={[element.borderRadius ?? 0]}
          min={0}
          max={180}
          onValueChange={(value) => onChange({ borderRadius: value[0] ?? 0 })}
        />
      </div>
      <div className="space-y-3 rounded-xl border border-dashed border-slate-300/70 p-3">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          <span>Background</span>
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
        </div>
        {isMaskEditing ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-blue-700 dark:text-blue-300 mb-2">
                ℹ️ Editing Instructions
              </p>
              <ul className="text-[11px] leading-relaxed text-blue-600 dark:text-blue-200 space-y-1">
                <li>✓ Click on the image to add selection points around the subject you want to keep</li>
                <li>✓ Minimum 3 points required to create a mask</li>
                <li>✓ Click &quot;Undo point&quot; to remove the last point</li>
                <li>✓ Press <kbd className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-700 rounded text-xs font-mono">Enter</kbd> or double-click to apply</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={onMaskCommit}
                disabled={maskPointCount < 3}
                title={maskPointCount < 3 ? `Need ${3 - maskPointCount} more points` : "Apply mask"}
              >
                Apply selection
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onMaskUndo}
                disabled={maskPointCount === 0}
                title="Undo last point"
              >
                Undo point
              </Button>
              <Button size="sm" variant="ghost" onClick={onMaskCancel} title="Exit mask editor without saving">
                Cancel
              </Button>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
              Points added: <span className="text-blue-600 dark:text-blue-400">{maskPointCount}/3+</span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-700 dark:text-amber-300 mb-2">
                💡 Background Removal
              </p>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-200">
                Remove the background from your image by creating a selection around the subject. The outlined area will be kept, and the rest will become transparent.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={onBeginMaskEditing}>
              Start background selection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onMaskClear}
              disabled={!hasMask}
              title="Remove current mask and start over"
            >
              Clear mask
            </Button>
            {hasMask ? (
              <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
                ✓ Mask applied
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

type ShapeControlsProps = {
  element: DesignerElement;
  onChange: (changes: Partial<DesignerElement>) => void;
};

function ShapeControls({ element, onChange }: ShapeControlsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant={element.shape === "rectangle" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => onChange({ shape: "rectangle" })}
        >
          <Square className="mr-2 h-4 w-4" aria-hidden />
          Rectangle
        </Button>
        <Button
          variant={element.shape === "ellipse" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => onChange({ shape: "ellipse" })}
        >
          <Circle className="mr-2 h-4 w-4" aria-hidden />
          Ellipse
        </Button>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Fill
        </Label>
        <input
          type="color"
          value={element.fill ?? "#e2e8f0"}
          onChange={(event) => onChange({ fill: event.target.value })}
          className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-slate-200"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Border color
          </Label>
          <input
            type="color"
            value={element.borderColor ?? element.fill ?? "#e2e8f0"}
            onChange={(event) => onChange({ borderColor: event.target.value })}
            className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Border width
          </Label>
          <Input
            type="number"
            value={element.borderWidth ?? 0}
            onChange={(event) =>
              onChange({ borderWidth: Number(event.target.value) })
            }
          />
        </div>
      </div>
    </div>
  );
}

type DividerControlsProps = {
  element: DesignerElement;
  onChange: (changes: Partial<DesignerElement>) => void;
};

function DividerControls({ element, onChange }: DividerControlsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Color
        </Label>
        <input
          type="color"
          value={element.color ?? "#cbd5e1"}
          onChange={(event) => onChange({ color: event.target.value })}
          className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-slate-200"
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Thickness
        </Label>
        <Input
          type="number"
          value={element.thickness ?? 2}
          onChange={(event) =>
            onChange({ thickness: Number(event.target.value) })
          }
        />
      </div>
    </div>
  );
}

type FloatingToolbarPanelProps = {
  containerRef: React.RefObject<HTMLDivElement>;
  bounds?: "container" | "viewport";
  state: FloatingPanelState;
  onStateChange: (changes: Partial<FloatingPanelState>) => void;
  onTogglePin: () => void;
  onAddHeading: () => void;
  onAddBody: () => void;
  onAddMenuItem: () => void;
  onAddDivider: () => void;
  onAddShape: (shape: "rectangle" | "ellipse") => void;
  canvasSettings: CanvasSettings;
  onToggleGrid: () => void;
  onToggleColumns: () => void;
  onToggleMargins: () => void;
  selectedElement: DesignerElement | null;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onAdjustFontSize: (delta: number) => void;
  onAdjustLetterSpacing: (delta: number) => void;
  onAdjustLineHeight: (delta: number) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onSelectionUpdate: (id: string, changes: Partial<DesignerElement>) => void;
};

function FloatingToolbarPanel({
  containerRef,
  bounds = "container",
  state,
  onStateChange,
  onTogglePin,
  onAddHeading,
  onAddBody,
  onAddMenuItem,
  onAddDivider,
  onAddShape,
  canvasSettings,
  onToggleGrid,
  onToggleColumns,
  onToggleMargins,
  selectedElement,
  onAlignChange,
  onAdjustFontSize,
  onAdjustLetterSpacing,
  onAdjustLineHeight,
  onDuplicateSelected,
  onDeleteSelected,
  onSelectionUpdate,
}: FloatingToolbarPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragData = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    availableWidth: number;
    availableHeight: number;
    panelWidth: number;
    panelHeight: number;
  } | null>(null);

  const getAvailableSpace = useCallback(() => {
    if (bounds === "viewport" && typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    if (typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 0, height: 0 };
  }, [bounds, containerRef]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragData.current) return;
      const {
        startX,
        startY,
        originX,
        originY,
        availableWidth,
        availableHeight,
        panelWidth,
        panelHeight,
      } = dragData.current;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const maxX = Math.max(0, availableWidth - panelWidth);
      const maxY = Math.max(0, availableHeight - panelHeight);
      onStateChange({
        x: clamp(originX + deltaX, 0, maxX),
        y: clamp(originY + deltaY, 0, maxY),
      });
    },
    [onStateChange],
  );

  const handlePointerUp = useCallback(() => {
    dragData.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  const beginDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (state.pinned) return;
      if (
        event.button !== 0 &&
        event.pointerType !== "touch" &&
        event.pointerType !== "pen"
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        target.closest(
          "button, a, input, textarea, select, label, [contenteditable='true'], [role='textbox'], [role='spinbutton'], [role='slider'], [data-floating-panel-interactive='true']",
        )
      ) {
        return;
      }
      const panel = panelRef.current;
      if (!panel) return;
      const { width, height } = getAvailableSpace();
      dragData.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: state.x,
        originY: state.y,
        availableWidth: width,
        availableHeight: height,
        panelWidth: panel.offsetWidth,
        panelHeight: panel.offsetHeight,
      };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      event.stopPropagation();
      event.preventDefault();
    },
    [
      getAvailableSpace,
      handlePointerMove,
      handlePointerUp,
      state.pinned,
      state.x,
      state.y,
    ],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const applyClamp = (availableWidth: number, availableHeight: number) => {
      const maxX = Math.max(0, availableWidth - panel.offsetWidth);
      const maxY = Math.max(0, availableHeight - panel.offsetHeight);
      const nextX = clamp(state.x, 0, maxX);
      const nextY = clamp(state.y, 0, maxY);
      if (nextX !== state.x || nextY !== state.y) {
        onStateChange({ x: nextX, y: nextY });
      }
    };

    if (bounds === "viewport") {
      if (typeof window === "undefined") {
        return;
      }
      const handleResize = () => {
        const { width, height } = getAvailableSpace();
        applyClamp(width, height);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      applyClamp(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [
    bounds,
    containerRef,
    getAvailableSpace,
    onStateChange,
    state.x,
    state.y,
  ]);

  const hasSelection = Boolean(selectedElement);
  const selectionLocked = Boolean(selectedElement?.locked);
  const canAdjustTypography =
    hasSelection &&
    selectedElement &&
    !selectionLocked &&
    ["heading", "subheading", "body", "menu-item"].includes(
      selectedElement.type,
    );
  const canMutateSelection = hasSelection && !selectionLocked;

  return (
    <div
      ref={panelRef}
      data-floating-panel="toolbar"
      className={cn(
        "pointer-events-auto z-40 w-[260px] rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/80",
        bounds === "viewport" ? "fixed" : "absolute",
      )}
      style={{
        top: bounds === "viewport" ? 0 : undefined,
        left: bounds === "viewport" ? 0 : undefined,
        transform: `translate(${state.x}px, ${state.y}px)`,
        touchAction: state.pinned ? "auto" : "none",
      }}
      onPointerDownCapture={beginDrag}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-200",
            state.pinned ? "cursor-default" : "cursor-move",
          )}
        >
          <Move className="h-3.5 w-3.5" aria-hidden />
          Toolbox
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onTogglePin}
          title={state.pinned ? "Unpin toolbar" : "Pin toolbar"}
          aria-label={state.pinned ? "Unpin toolbar" : "Pin toolbar"}
        >
          {state.pinned ? (
            <Pin className="h-4 w-4" aria-hidden />
          ) : (
            <PinOff className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>

      <div className="mt-3 space-y-3 text-xs">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Quick add
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onAddHeading}>
              <Type className="mr-2 h-3.5 w-3.5" aria-hidden />
              Heading
            </Button>
            <Button variant="outline" size="sm" onClick={onAddBody}>
              <Type className="mr-2 h-3.5 w-3.5" aria-hidden />
              Body copy
            </Button>
            <Button variant="outline" size="sm" onClick={onAddMenuItem}>
              <Ruler className="mr-2 h-3.5 w-3.5" aria-hidden />
              Menu item
            </Button>
            <Button variant="outline" size="sm" onClick={onAddDivider}>
              <LayoutGrid className="mr-2 h-3.5 w-3.5" aria-hidden />
              Divider
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddShape("rectangle")}
            >
              <Square className="mr-2 h-3.5 w-3.5" aria-hidden />
              Rectangle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddShape("ellipse")}
            >
              <Circle className="mr-2 h-3.5 w-3.5" aria-hidden />
              Ellipse
            </Button>
          </div>
        </div>

        {selectedElement ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Content
            </p>
            {selectionLocked ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-100/70 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                <Lock className="h-3 w-3" aria-hidden />
                <span>Unlock layer to edit</span>
              </div>
            ) : null}
            {selectedElement.type === "menu-item" ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Label
                  </span>
                  <Input
                    value={selectedElement.name}
                    disabled={selectionLocked}
                    onChange={(event) => {
                      if (selectionLocked) return;
                      onSelectionUpdate(selectedElement.id, {
                        name: event.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Title
                  </span>
                  <Input
                    value={selectedElement.text ?? ""}
                    disabled={selectionLocked}
                    onChange={(event) => {
                      if (selectionLocked) return;
                      onSelectionUpdate(selectedElement.id, {
                        text: event.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Description
                  </span>
                  <Textarea
                    rows={3}
                    value={selectedElement.description ?? ""}
                    disabled={selectionLocked}
                    onChange={(event) => {
                      if (selectionLocked) return;
                      onSelectionUpdate(selectedElement.id, {
                        description: event.target.value,
                      });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                      Price
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={
                        selectedElement.price != null
                          ? selectedElement.price
                          : ""
                      }
                      disabled={selectionLocked}
                      onChange={(event) => {
                        if (selectionLocked) return;
                        const nextValue = event.target.value;
                        const parsed = Number.parseFloat(nextValue);
                        onSelectionUpdate(selectedElement.id, {
                          price:
                            nextValue === "" || Number.isNaN(parsed)
                              ? undefined
                              : parsed,
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                      Currency
                    </span>
                    <Input
                      value={selectedElement.currency ?? "USD"}
                      disabled={selectionLocked}
                      onChange={(event) => {
                        if (selectionLocked) return;
                        onSelectionUpdate(selectedElement.id, {
                          currency: event.target.value,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : selectedElement.text != null ? (
              <Textarea
                rows={Math.min(
                  6,
                  Math.max(3, Math.ceil((selectedElement.height || 60) / 60)),
                )}
                value={selectedElement.text ?? ""}
                disabled={selectionLocked}
                onChange={(event) => {
                  if (selectionLocked) return;
                  onSelectionUpdate(selectedElement.id, {
                    text: event.target.value,
                  });
                }}
              />
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Canvas helpers
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={canvasSettings.showGrid ? "default" : "outline"}
              size="icon"
              className="h-9 w-full"
              onClick={onToggleGrid}
              title="Toggle grid"
              aria-label="Toggle grid"
            >
              <Grid3X3 className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant={canvasSettings.showColumns ? "default" : "outline"}
              size="icon"
              className="h-9 w-full"
              onClick={onToggleColumns}
              title="Toggle columns"
              aria-label="Toggle columns"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant={canvasSettings.showMargins ? "default" : "outline"}
              size="icon"
              className="h-9 w-full"
              onClick={onToggleMargins}
              title="Toggle margins"
              aria-label="Toggle margins"
            >
              <Square className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Typography
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAdjustFontSize(-2)}
              title="Decrease font size"
              aria-label="Decrease font size"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAdjustFontSize(2)}
              title="Increase font size"
              aria-label="Increase font size"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAdjustLetterSpacing(0.2)}
              title="Loosen letter spacing"
              aria-label="Loosen letter spacing"
            >
              <BetweenHorizontalStart className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAdjustLetterSpacing(-0.2)}
              title="Tighten letter spacing"
              aria-label="Tighten letter spacing"
            >
              <BetweenHorizontalStart
                className="h-4 w-4 rotate-180"
                aria-hidden
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAdjustLineHeight(0.1)}
              title="Increase line height"
              aria-label="Increase line height"
            >
              <BetweenVerticalStart className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAdjustLineHeight(-0.1)}
              title="Decrease line height"
              aria-label="Decrease line height"
            >
              <BetweenVerticalStart
                className="h-4 w-4 rotate-180"
                aria-hidden
              />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={
                selectedElement?.align === "left" ? "default" : "outline"
              }
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAlignChange("left")}
              title="Align left"
              aria-label="Align left"
            >
              <AlignLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant={
                selectedElement?.align === "center" ? "default" : "outline"
              }
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAlignChange("center")}
              title="Align center"
              aria-label="Align center"
            >
              <AlignCenter className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant={
                selectedElement?.align === "right" ? "default" : "outline"
              }
              size="icon"
              className="h-9 w-full"
              disabled={!canAdjustTypography}
              onClick={() => onAlignChange("right")}
              title="Align right"
              aria-label="Align right"
            >
              <AlignRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Selection
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canMutateSelection}
              onClick={onDuplicateSelected}
            >
              <Copy className="mr-2 h-3.5 w-3.5" aria-hidden />
              Duplicate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!canMutateSelection}
              onClick={onDeleteSelected}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type FloatingLayersPanelProps = {
  containerRef: React.RefObject<HTMLDivElement>;
  bounds?: "container" | "viewport";
  state: FloatingPanelState;
  onStateChange: (changes: Partial<FloatingPanelState>) => void;
  onTogglePin: () => void;
  layers: DesignerElement[];
  selectedId: string | null;
  onSelectLayer: (id: string) => void;
  onLayerShift: (
    id: string,
    direction: "forward" | "backward" | "front" | "back",
  ) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
  onToggleLock: (id: string) => void;
};

function FloatingLayersPanel({
  containerRef,
  bounds = "container",
  state,
  onStateChange,
  onTogglePin,
  layers,
  selectedId,
  onSelectLayer,
  onLayerShift,
  onChangeOpacity,
  onToggleLock,
}: FloatingLayersPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragData = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    availableWidth: number;
    availableHeight: number;
    panelWidth: number;
    panelHeight: number;
  } | null>(null);

  const getAvailableSpace = useCallback(() => {
    if (bounds === "viewport" && typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    if (typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 0, height: 0 };
  }, [bounds, containerRef]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragData.current) return;
      const {
        startX,
        startY,
        originX,
        originY,
        availableWidth,
        availableHeight,
        panelWidth,
        panelHeight,
      } = dragData.current;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const maxX = Math.max(0, availableWidth - panelWidth);
      const maxY = Math.max(0, availableHeight - panelHeight);
      onStateChange({
        x: clamp(originX + deltaX, 0, maxX),
        y: clamp(originY + deltaY, 0, maxY),
      });
    },
    [onStateChange],
  );

  const handlePointerUp = useCallback(() => {
    dragData.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  const beginDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (state.pinned) return;
      if (
        event.button !== 0 &&
        event.pointerType !== "touch" &&
        event.pointerType !== "pen"
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        target.closest(
          "button, a, input, textarea, select, label, [contenteditable='true'], [role='textbox'], [role='spinbutton'], [role='slider'], [data-floating-panel-interactive='true']",
        )
      ) {
        return;
      }
      const panel = panelRef.current;
      if (!panel) return;
      const { width, height } = getAvailableSpace();
      dragData.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: state.x,
        originY: state.y,
        availableWidth: width,
        availableHeight: height,
        panelWidth: panel.offsetWidth,
        panelHeight: panel.offsetHeight,
      };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      event.stopPropagation();
      event.preventDefault();
    },
    [
      getAvailableSpace,
      handlePointerMove,
      handlePointerUp,
      state.pinned,
      state.x,
      state.y,
    ],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const applyClamp = (availableWidth: number, availableHeight: number) => {
      const maxX = Math.max(0, availableWidth - panel.offsetWidth);
      const maxY = Math.max(0, availableHeight - panel.offsetHeight);
      const nextX = clamp(state.x, 0, maxX);
      const nextY = clamp(state.y, 0, maxY);
      if (nextX !== state.x || nextY !== state.y) {
        onStateChange({ x: nextX, y: nextY });
      }
    };

    if (bounds === "viewport") {
      if (typeof window === "undefined") {
        return;
      }
      const handleResize = () => {
        const { width, height } = getAvailableSpace();
        applyClamp(width, height);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      applyClamp(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [
    bounds,
    containerRef,
    getAvailableSpace,
    onStateChange,
    state.x,
    state.y,
  ]);

  return (
    <div
      ref={panelRef}
      className={cn(
        "pointer-events-auto z-30 w-[220px] rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/80",
        bounds === "viewport" ? "fixed" : "absolute",
      )}
      style={{
        top: bounds === "viewport" ? 0 : undefined,
        left: bounds === "viewport" ? 0 : undefined,
        transform: `translate(${state.x}px, ${state.y}px)`,
        touchAction: state.pinned ? "auto" : "none",
      }}
      onPointerDownCapture={beginDrag}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-200",
            state.pinned ? "cursor-default" : "cursor-move",
          )}
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Layers
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onTogglePin}
          title={state.pinned ? "Unpin layers" : "Pin layers"}
          aria-label={state.pinned ? "Unpin layers" : "Pin layers"}
        >
          {state.pinned ? (
            <Pin className="h-4 w-4" aria-hidden />
          ) : (
            <PinOff className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>

      <ScrollArea className="mt-3 h-[200px] pr-2">
        <div className="space-y-2 text-xs">
          {layers.map((layer) => {
            const active = layer.id === selectedId;
            const locked = layer.locked ?? false;
            return (
              <div
                key={layer.id}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition",
                  active
                    ? "border-[#c8a97e] bg-[#c8a97e]/08"
                    : "border-slate-200 bg-white hover:border-[#c8a97e] dark:border-slate-800 dark:bg-slate-900/70",
                  locked ? "opacity-80" : undefined,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectLayer(layer.id)}
                    className="flex flex-1 flex-col text-left"
                    data-floating-panel-interactive="true"
                  >
                    <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                      {layer.name}
                      {locked ? (
                        <Lock className="h-3 w-3 text-amber-500" aria-hidden />
                      ) : null}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
                      {layer.type}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onToggleLock(layer.id)}
                      aria-label={locked ? "Unlock layer" : "Lock layer"}
                      data-floating-panel-interactive="true"
                    >
                      {locked ? (
                        <Unlock className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onLayerShift(layer.id, "front")}
                      aria-label="Bring layer to front"
                      data-floating-panel-interactive="true"
                    >
                      <ChevronsUp className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onLayerShift(layer.id, "forward")}
                      aria-label="Move layer forward"
                      data-floating-panel-interactive="true"
                    >
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onLayerShift(layer.id, "backward")}
                      aria-label="Move layer backward"
                      data-floating-panel-interactive="true"
                    >
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onLayerShift(layer.id, "back")}
                      aria-label="Send layer to back"
                      data-floating-panel-interactive="true"
                    >
                      <ChevronsDown className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
                <div
                  className="mt-2 flex items-center gap-2"
                  data-floating-panel-interactive="true"
                >
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Opacity
                  </span>
                  <Slider
                    value={[Math.round((layer.opacity ?? 1) * 100)]}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                    onValueChange={(value) =>
                      onChangeOpacity(layer.id, (value[0] ?? 100) / 100)
                    }
                    aria-label="Layer opacity"
                  />
                  <span className="w-10 text-right text-[10px] font-semibold text-muted-foreground">
                    {Math.round((layer.opacity ?? 1) * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
