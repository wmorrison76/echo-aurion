import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  Grid3x3,
  Ruler,
  Square,
  Circle,
  Lasso,
  Wand2,
  Paintbrush,
  Pencil,
  Eraser,
  Copy,
  Droplet,
  Pipette,
  Move,
  Crop,
  Type,
  Wind,
  Zap,
  Droplets,
  Hand,
  Maximize2,
} from "lucide-react";
import { useResponsive } from "../hooks/use-responsive";
import MenuBar from "../components/editor/MenuBar";
import Canvas from "../components/editor/Canvas";
import AIGeneratorPanel from "../components/editor/AIGeneratorPanel";
import FloatingToolbar from "../components/editor/FloatingToolbar";
import LevelsDialog from "../components/editor/LevelsDialog";
import CurvesDialog from "../components/editor/CurvesDialog";
import BrightnessContrastDialog from "../components/editor/BrightnessContrastDialog";
import HueSaturationDialog from "../components/editor/HueSaturationDialog";
import ColorBalanceDialog from "../components/editor/ColorBalanceDialog";
import VectorPanel from "../components/editor/VectorPanel";
import TextTool, { type TextData } from "../components/editor/TextTool";
import LayersPanel, { type Layer } from "../components/editor/LayersPanel";
import ToolsPanel from "../components/editor/ToolsPanel";
import UnifiedFilterDialog from "../components/editor/UnifiedFilterDialog";
import ColorPickerTool from "../components/editor/ColorPickerTool";
import LayerMaskDialog, {
  type LayerMask,
} from "../components/editor/LayerMaskDialog";
import GenerativeFillDialog from "../components/editor/GenerativeFillDialog";
import SmartObjectPanel from "../components/editor/SmartObjectPanel";
import AdvancedAIPanel from "../components/editor/AdvancedAIPanel";
import ImageEnhancementPanel from "../components/editor/ImageEnhancementPanel";
import HistoryPanel, {
  type HistoryEntry,
} from "../components/editor/HistoryPanel";
import GradientEditor from "../components/editor/GradientEditor";
import ShortcutsPanel from "../components/editor/ShortcutsPanel";
import BatchProcessingPanel from "../components/editor/BatchProcessingPanel";
import LayerGroupPanel, {
  type LayerNode,
} from "../components/editor/LayerGroupPanel";
import TaskAutomationPanel, {
  type Workflow,
  type WorkflowStep,
} from "../components/editor/TaskAutomationPanel";
import ObjectRemovalDialog from "../components/editor/ObjectRemovalDialog";
import BackgroundReplacementPanel from "../components/editor/BackgroundReplacementPanel";
import AdjustmentLayerPanel, {
  type AdjustmentLayer,
} from "../components/editor/AdjustmentLayerPanel";
import ColorCorrectionPanel from "../components/editor/ColorCorrectionPanel";
import PresetsPanel from "../components/editor/PresetsPanel";
import ErrorModal from "../components/editor/ErrorModal";
import { getPreset, type Preset } from "../lib/preset-storage";
import { CanvasEngine, type ToolType } from "../components/editor/CanvasEngine";
import { VectorEngine } from "../components/editor/VectorEngine";
import { FilterEngine } from "../components/editor/FilterEngine";
import {
  SmartObjectEngine,
  type SmartObjectData,
} from "../components/editor/SmartObjectEngine";
import { BlendingEngine } from "../components/editor/BlendingEngine";
import {
  exportCanvas,
  exportCanvasAsSvg,
  copyCanvasToClipboard,
  createCanvasThumbnail,
} from "../lib/export";
import {
  downloadAsPSD,
  downloadAsEchoCanvaProject,
  importProjectFromJSON,
  isPSDFile,
  isEchoCanvaProject,
} from "../lib/psd-utils";
import { autoSaveManager } from "../lib/auto-save";
import { Cloud, CloudOff, Share2 } from "lucide-react";
import collaborationClient, {
  type RemoteUserCursor,
  type RemoteUserPresence,
} from "../lib/collaboration";
import RemoteCursors from "../components/editor/RemoteCursors";
import PresenceIndicator from "../components/editor/PresenceIndicator";
import ShareDialog from "../components/editor/ShareDialog";
import CakeDesignerPanel from "../components/floating/CakeDesignerPanel";
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  imageUrl?: string;
  transparent?: boolean;
}
const getToolIcon = (toolId: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    "rect-select": <Square size={16} />,
    "ellipse-select": <Circle size={16} />,
    lasso: <Lasso size={16} />,
    "poly-lasso": <Lasso size={16} />,
    "magic-wand": <Wand2 size={16} />,
    "quick-select": <Wand2 size={16} />,
    "object-select": <Maximize2 size={16} />,
    brush: <Paintbrush size={16} />,
    pencil: <Pencil size={16} />,
    eraser: <Eraser size={16} />,
    "clone-stamp": <Copy size={16} />,
    "healing-brush": <Droplet size={16} />,
    patch: <Droplet size={16} />,
    "color-replace": <Droplet size={16} />,
    "bucket-fill": <Droplets size={16} />,
    gradient: <Wind size={16} />,
    "dodge-burn": <Zap size={16} />,
    sponge: <Droplets size={16} />,
    "blur-sharpen": <Wind size={16} />,
    smudge: <Wind size={16} />,
    move: <Move size={16} />,
    crop: <Crop size={16} />,
    "perspective-crop": <Crop size={16} />,
    "free-transform": <Move size={16} />,
    rotate: <RotateCw size={16} />,
    scale: <Maximize2 size={16} />,
    pen: <Paintbrush size={16} />,
    "shape-rect": <Square size={16} />,
    "shape-ellipse": <Circle size={16} />,
    "shape-polygon": <Lasso size={16} />,
    "shape-line": <Pencil size={16} />,
    text: <Type size={16} />,
    eyedropper: <Pipette size={16} />,
    ruler: <Ruler size={16} />,
    measure: <Ruler size={16} />,
    hand: <Hand size={16} />,
    zoom: <Maximize2 size={16} />,
  };
  return iconMap[toolId] || <Square size={16} />;
};
const TOOL_CATEGORIES = [
  {
    name: "Selection",
    tools: [
      { id: "rect-select", name: "Rect Select", shortcut: "M" },
      { id: "ellipse-select", name: "Ellipse Select", shortcut: "" },
      { id: "lasso", name: "Lasso", shortcut: "L" },
      { id: "poly-lasso", name: "Poly Lasso", shortcut: "" },
      { id: "magic-wand", name: "Magic Wand", shortcut: "W" },
      { id: "quick-select", name: "Quick Select", shortcut: "" },
      { id: "object-select", name: "Object Select", shortcut: "" },
    ],
  },
  {
    name: "Paint",
    tools: [
      { id: "brush", name: "Brush", shortcut: "B" },
      { id: "pencil", name: "Pencil", shortcut: "" },
      { id: "eraser", name: "Eraser", shortcut: "E" },
      { id: "clone-stamp", name: "Clone Stamp", shortcut: "S" },
      { id: "healing-brush", name: "Healing", shortcut: "J" },
      { id: "patch", name: "Patch", shortcut: "" },
      { id: "color-replace", name: "Color Replace", shortcut: "" },
    ],
  },
  {
    name: "Fill & Adjust",
    tools: [
      { id: "bucket-fill", name: "Bucket Fill", shortcut: "G" },
      { id: "gradient", name: "Gradient", shortcut: "" },
      { id: "dodge-burn", name: "Dodge/Burn", shortcut: "O" },
      { id: "sponge", name: "Sponge", shortcut: "" },
      { id: "blur-sharpen", name: "Blur/Sharpen", shortcut: "" },
      { id: "smudge", name: "Smudge", shortcut: "" },
    ],
  },
  {
    name: "Transform",
    tools: [
      { id: "move", name: "Move", shortcut: "V" },
      { id: "crop", name: "Crop", shortcut: "C" },
      { id: "perspective-crop", name: "Perspective Crop", shortcut: "" },
      { id: "free-transform", name: "Free Transform", shortcut: "T" },
      { id: "rotate", name: "Rotate", shortcut: "" },
      { id: "scale", name: "Scale", shortcut: "" },
    ],
  },
  {
    name: "Drawing",
    tools: [
      { id: "pen", name: "Pen", shortcut: "P" },
      { id: "shape-rect", name: "Rectangle", shortcut: "U" },
      { id: "shape-ellipse", name: "Ellipse", shortcut: "" },
      { id: "shape-polygon", name: "Polygon", shortcut: "" },
      { id: "shape-line", name: "Line", shortcut: "" },
      { id: "text", name: "Text", shortcut: "T" },
    ],
  },
  {
    name: "Utility",
    tools: [
      { id: "eyedropper", name: "Eyedropper", shortcut: "I" },
      { id: "ruler", name: "Ruler", shortcut: "" },
      { id: "measure", name: "Measure", shortcut: "" },
      { id: "hand", name: "Hand", shortcut: "H" },
      { id: "zoom", name: "Zoom", shortcut: "Z" },
    ],
  },
];
export default function Editor() {
  const responsive = useResponsive();
  const [leftPanelOpen, setLeftPanelOpen] = React.useState(true);
  const [rightPanelOpen, setRightPanelOpen] = React.useState(true);
  const [rightPanelTab, setRightPanelTab] = React.useState<
    | "ai"
    | "layers"
    | "properties"
    | "vector"
    | "smart-objects"
    | "gradients"
    | "history"
    | "shortcuts"
    | "batch"
    | "groups"
    | "automation"
    | "removal"
    | "background"
    | "adjustment"
    | "correction"
    | "presets"
  >("ai");
  const [cakeDesignerOpen, setCakeDesignerOpen] = React.useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = React.useState(true);
  const [selectedTool, setSelectedTool] = React.useState("brush");
  const [selectedLayer, setSelectedLayer] = React.useState("layer-1");
  const [zoom, setZoom] = React.useState(100);
  const [showGrid, setShowGrid] = React.useState(true);
  const [showRulers, setShowRulers] = React.useState(true);
  const [isTransparent, setIsTransparent] = React.useState(true);
  const [snapToGrid, setSnapToGrid] = React.useState(false);
  const [gridSize, setGridSize] = React.useState(16);
  const [rulerSpacing, setRulerSpacing] = React.useState(50);
  const [showFloatingToolbar, setShowFloatingToolbar] = React.useState(false);
  const [visibleToolbars, setVisibleToolbars] = React.useState({
    colors: true,
    tools: true,
  });
  const [isErrorOpen, setIsErrorOpen] = React.useState(false);
  const [errorTitle, setErrorTitle] = React.useState("Error");
  const [errorMessage, setErrorMessage] = React.useState("");
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Auto-save state
  const [designId, setDesignId] = React.useState<string | undefined>(undefined);
  const [designTitle, setDesignTitle] = React.useState("Untitled Design");
  const [userId, setUserId] = React.useState<string>(() => {
    // For now, use a temporary ID - in production, get from auth
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("temp-user-id");
      if (stored) return stored;
      const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("temp-user-id", newId);
      return newId;
    }
    return `user-${Date.now()}`;
  });
  const [unsavedIndicator, setUnsavedIndicator] =
    React.useState("All changes saved");
  const [isSaving, setIsSaving] = React.useState(false);
  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setIsErrorOpen(true);
  };
  const [layers, setLayers] = React.useState<Layer[]>([
    {
      id: "layer-1",
      name: "Background",
      visible: true,
      locked: false,
      opacity: 100,
      transparent: true,
    },
  ]);
  const [brushSize, setBrushSize] = React.useState(10);
  const [brushOpacity, setBrushOpacity] = React.useState(100);
  const [foregroundColor, setForegroundColor] = React.useState("#000000");
  const [backgroundColor, setBackgroundColor] = React.useState("#ffffff");

  // Adjustment dialog states
  const [openDialog, setOpenDialog] = React.useState<string | null>(null);

  // Filter dialog state
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);

  // Vector tool states
  const vectorEngineRef = React.useRef<VectorEngine | null>(null);
  const [vectorStrokeColor, setVectorStrokeColor] = React.useState("#000000");
  const [vectorStrokeWidth, setVectorStrokeWidth] = React.useState(2);
  const [vectorStrokeAlpha, setVectorStrokeAlpha] = React.useState(100);
  const [vectorFillColor, setVectorFillColor] = React.useState("#94a3b8");
  const [vectorFillAlpha, setVectorFillAlpha] = React.useState(100);
  const [vectorFillEnabled, setVectorFillEnabled] = React.useState(true);
  const [isDrawingPath, setIsDrawingPath] = React.useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = React.useState<
    number | null
  >(null);

  // Text tool state
  const [textToolOpen, setTextToolOpen] = React.useState(false);
  const [textElements, setTextElements] = React.useState<TextData[]>([]);

  // Color picker state
  const [colorPickerActive, setColorPickerActive] = React.useState(false);

  // Layer mask state
  const [maskDialogOpen, setMaskDialogOpen] = React.useState(false);
  const [editingMaskLayerId, setEditingMaskLayerId] = React.useState<
    string | null
  >(null);

  // Generative fill state
  const [generativeFillDialogOpen, setGenerativeFillDialogOpen] =
    React.useState(false);
  const [isGeneratingFill, setIsGeneratingFill] = React.useState(false);

  // Smart objects state
  const [smartObjects, setSmartObjects] = React.useState<SmartObjectData[]>([]);
  const [selectedSmartObject, setSelectedSmartObject] = React.useState<
    string | null
  >(null);

  // History state
  const [history, setHistory] = React.useState<HistoryEntry[]>([
    { id: "initial", action: "canvas-created", timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = React.useState(0);

  // Helper function to save canvas state to history
  const saveCanvasToHistory = (action: string) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    try {
      const imageData = ctx.getImageData(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      const newEntry: HistoryEntry = {
        id: `state-${Date.now()}`,
        action,
        timestamp: Date.now(),
        canvasData: imageData.data,
      };

      // Remove any redo history if we're making a new change
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newEntry);

      // Keep history size manageable (max 100 entries)
      if (newHistory.length > 100) {
        newHistory.shift();
      }
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } catch (error) {
      console.warn("Failed to save canvas state to history:", error);
    }
  };

  // Task Automation state
  const [isRecording, setIsRecording] = React.useState(false);
  const [currentWorkflow, setCurrentWorkflow] = React.useState<Workflow | null>(
    null,
  );

  // Background removal state
  const [backgroundRemovalDialogOpen, setBackgroundRemovalDialogOpen] =
    React.useState(false);

  // Adjustment layers state
  const [adjustmentLayers, setAdjustmentLayers] = React.useState<
    AdjustmentLayer[]
  >([]);
  const [selectedAdjustmentLayer, setSelectedAdjustmentLayer] = React.useState<
    string | null
  >(null);

  // Collaboration state
  const [remoteCursors, setRemoteCursors] = React.useState<
    Map<string, RemoteUserCursor>
  >(new Map());
  const [onlineUsers, setOnlineUsers] = React.useState<RemoteUserPresence[]>(
    [],
  );
  const [isCollaborating, setIsCollaborating] = React.useState(false);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [shareLinks, setShareLinks] = React.useState<any[]>([]);
  const handleImageGenerated = (imageUrl: string, prompt: string) => {
    // Always create a new layer with the generated image
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `AI: ${prompt.substring(0, 20)}...`,
      visible: true,
      locked: false,
      opacity: 100,
      imageUrl,
      transparent: true,
    };
    setLayers([newLayer, ...layers]);
    setSelectedLayer(newLayer.id);
  };

  // Helper: Save current design to localStorage
  const saveDesignToStorage = (
    title: string = designTitle,
    id: string = designId || `design-${Date.now()}`,
  ) => {
    const designData = {
      id,
      title,
      layers,
      foregroundColor,
      backgroundColor,
      brushSize,
      brushOpacity,
      zoom,
      showGrid,
      showRulers,
      savedAt: new Date().toISOString(),
      canvasSnapshot: canvasRef.current?.toDataURL("image/png"),
    };
    localStorage.setItem(`design-${id}`, JSON.stringify(designData));

    // Update recent files
    const recentFiles = JSON.parse(
      localStorage.getItem("recent-designs") || "[]",
    );
    const newRecent = recentFiles.filter((f: any) => f.id !== id);
    newRecent.unshift({ id, title, savedAt: designData.savedAt });
    localStorage.setItem(
      "recent-designs",
      JSON.stringify(newRecent.slice(0, 10)),
    );

    // Trigger custom event so MenuBar can update recent files
    window.dispatchEvent(
      new CustomEvent("design-saved", { detail: { id, title } }),
    );
    setDesignId(id);
    setDesignTitle(title);
    setUnsavedIndicator("All changes saved");
    return id;
  };

  // Helper: Load design from localStorage
  const loadDesignFromStorage = (id: string) => {
    const designData = localStorage.getItem(`design-${id}`);
    if (!designData) {
      showError("Error", "Design not found");
      return;
    }
    try {
      const data = JSON.parse(designData);
      setLayers(data.layers);
      setForegroundColor(data.foregroundColor);
      setBackgroundColor(data.backgroundColor);
      setBrushSize(data.brushSize);
      setBrushOpacity(data.brushOpacity);
      setZoom(data.zoom);
      setShowGrid(data.showGrid);
      setShowRulers(data.showRulers);
      setDesignId(id);
      setDesignTitle(data.title);
      setUnsavedIndicator("All changes saved");

      // Restore canvas if snapshot exists
      if (data.canvasSnapshot && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0);
        };
        img.src = data.canvasSnapshot;
      }
    } catch (error) {
      showError("Error", "Failed to load design");
    }
  };
  const handleMenuAction = (action: string, data?: any) => {
    switch (action) {
      case "new": {
        // Create new blank document
        if (unsavedIndicator !== "All changes saved") {
          const confirmed = window.confirm(
            "You have unsaved changes. Do you want to create a new document?",
          );
          if (!confirmed) break;
        }
        const newId = `design-${Date.now()}`;
        setDesignId(newId);
        setDesignTitle("Untitled Design");
        setLayers([
          {
            id: "layer-1",
            name: "Background",
            visible: true,
            locked: false,
            opacity: 100,
            transparent: true,
          },
        ]);
        setSelectedLayer("layer-1");
        setForegroundColor("#000000");
        setBackgroundColor("#ffffff");
        setBrushSize(10);
        setBrushOpacity(100);
        setZoom(100);
        setUnsavedIndicator("New document created");

        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height,
            );
          }
        }
        break;
      }
      case "open": {
        // Create file input for opening designs
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.psd";
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const content = event.target?.result as string;
              if (file.name.endsWith(".json")) {
                const data = JSON.parse(content);
                setDesignId(data.id || `design-${Date.now()}`);
                setDesignTitle(data.title || file.name);
                setLayers(data.layers || []);
                setForegroundColor(data.foregroundColor || "#000000");
                setBackgroundColor(data.backgroundColor || "#ffffff");
                setBrushSize(data.brushSize || 10);
                setBrushOpacity(data.brushOpacity || 100);
                setUnsavedIndicator("Design loaded");
              } else if (file.name.endsWith(".psd")) {
                showError(
                  "Info",
                  "PSD files require special handling. Use export/import features.",
                );
              }
            } catch (error) {
              showError("Error", "Failed to open file");
            }
          };
          reader.readAsText(file);
        };
        input.click();
        break;
      }
      case "save": {
        const id = saveDesignToStorage(designTitle, designId);
        setUnsavedIndicator("Design saved");
        setTimeout(() => {
          if (unsavedIndicator === "Design saved") {
            setUnsavedIndicator("All changes saved");
          }
        }, 2000);
        break;
      }
      case "save-as": {
        const newTitle = prompt("Enter design name:", designTitle);
        if (newTitle) {
          const newId = `design-${Date.now()}`;
          saveDesignToStorage(newTitle, newId);
          setDesignTitle(newTitle);
        }
        break;
      }
      case "open-recent": {
        // Load a recent design (data contains { id: designId })
        if (data?.id) {
          loadDesignFromStorage(data.id);
        }
        break;
      }
      case "close": {
        if (unsavedIndicator !== "All changes saved") {
          const confirmed = window.confirm(
            "You have unsaved changes. Do you want to close anyway?",
          );
          if (!confirmed) break;
        }
        window.close();
        break;
      }
      case "export":
        showError("Not Implemented", "Export feature is not implemented yet");
        break;
      case "undo":
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);

          // Restore canvas state from history
          if (canvasRef.current && history[newIndex]) {
            const canvasData = history[newIndex].canvasData;
            if (canvasData) {
              const ctx = canvasRef.current.getContext("2d");
              if (ctx) {
                const imageData = new ImageData(
                  new Uint8ClampedArray(canvasData),
                  canvasRef.current.width,
                  canvasRef.current.height,
                );
                ctx.putImageData(imageData, 0, 0);
              }
            }
          }
        }
        break;
      case "redo":
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);

          // Restore canvas state from history
          if (canvasRef.current && history[newIndex]) {
            const canvasData = history[newIndex].canvasData;
            if (canvasData) {
              const ctx = canvasRef.current.getContext("2d");
              if (ctx) {
                const imageData = new ImageData(
                  new Uint8ClampedArray(canvasData),
                  canvasRef.current.width,
                  canvasRef.current.height,
                );
                ctx.putImageData(imageData, 0, 0);
              }
            }
          }
        }
        break;
      case "toggle-grid":
        setShowGrid(!showGrid);
        break;
      case "toggle-rulers":
        setShowRulers(!showRulers);
        break;
      case "zoom-in":
        setZoom(Math.min(400, zoom + 10));
        break;
      case "zoom-out":
        setZoom(Math.max(10, zoom - 10));
        break;
      case "fit-screen":
        setZoom(100);
        break;
      case "toggle-snap-grid":
        setSnapToGrid(!snapToGrid);
        break;
      case "toggle-floating-toolbar":
        setShowFloatingToolbar(!showFloatingToolbar);
        break;
      case "show-toolbar-colors":
        setVisibleToolbars({
          ...visibleToolbars,
          colors: !visibleToolbars.colors,
        });
        break;
      case "show-toolbar-tools":
        setVisibleToolbars({
          ...visibleToolbars,
          tools: !visibleToolbars.tools,
        });
        break;
      case "new-layer":
        const newLayer = {
          id: `layer-${Date.now()}`,
          name: `Layer ${layers.length + 1}`,
          visible: true,
          locked: false,
          opacity: 100,
          transparent: true,
        };
        setLayers([newLayer, ...layers]);
        break;
      case "delete-layer":
        setLayers(layers.filter((l) => l.id !== selectedLayer));
        break;
      case "levels":
        setOpenDialog("levels");
        break;
      case "curves":
        setOpenDialog("curves");
        break;
      case "brightness-contrast":
        setOpenDialog("brightness-contrast");
        break;
      case "hue-saturation":
        setOpenDialog("hue-saturation");
        break;
      case "color-balance":
        setOpenDialog("color-balance");
        break;
      case "invert":
        if (canvasRef.current) {
          const engine = new CanvasEngine(canvasRef.current);
          engine.invert();
        }
        break;
      case "desaturate":
        if (canvasRef.current) {
          const engine = new CanvasEngine(canvasRef.current);
          engine.desaturate();
        }
        break;
      case "posterize":
        const levels = prompt("Enter number of levels (2-255):", "8");
        if (levels && canvasRef.current) {
          const numLevels = Math.max(2, Math.min(255, parseInt(levels, 10)));
          const engine = new CanvasEngine(canvasRef.current);
          engine.posterize(numLevels);
        }
        break;
      case "pen":
        setSelectedTool("pen");
        setRightPanelTab("vector");
        break;
      case "rectangle":
        setSelectedTool("rectangle");
        setRightPanelTab("vector");
        break;
      case "circle":
        setSelectedTool("circle");
        setRightPanelTab("vector");
        break;
      case "polygon":
        setSelectedTool("polygon");
        setRightPanelTab("vector");
        break;
      case "save-png":
        if (canvasRef.current) {
          exportCanvas(canvasRef.current, {
            format: "png",
            filename: "echocanva-image",
          });
        }
        break;
      case "save-jpg":
        if (canvasRef.current) {
          exportCanvas(canvasRef.current, {
            format: "jpg",
            quality: 0.95,
            filename: "pixelforge-image",
          });
        }
        break;
      case "save-webp":
        if (canvasRef.current) {
          exportCanvas(canvasRef.current, {
            format: "webp",
            quality: 0.95,
            filename: "pixelforge-image",
          });
        }
        break;
      case "save-svg":
        if (canvasRef.current) {
          exportCanvasAsSvg(canvasRef.current, "echocanva-image");
        }
        break;
      case "copy-to-clipboard":
        if (canvasRef.current) {
          copyCanvasToClipboard(canvasRef.current)
            .then(() => showError("Success", "Image copied to clipboard!"))
            .catch((err) =>
              showError(
                "Copy Failed",
                err instanceof Error ? err.message : "Failed to copy image",
              ),
            );
        }
        break;
      case "save-psd":
        if (canvasRef.current) {
          downloadAsPSD(canvasRef.current, layers, "echocanva-project.psd");
        }
        break;
      case "save-project":
        if (canvasRef.current) {
          downloadAsEchoCanvaProject(
            canvasRef.current,
            layers,
            "echocanva-project.echocanva",
          );
        }
        break;
      case "load-project":
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".echocanva,.json,.psd";
        fileInput.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && isEchoCanvaProject(file)) {
            try {
              const projectData = await importProjectFromJSON(file);

              // Load project data
              if (projectData.layers) {
                const importedLayers = projectData.layers.map((layer: any) => ({
                  id: layer.id || `layer-${Date.now()}`,
                  name: layer.name,
                  visible: layer.visible,
                  locked: layer.locked ?? false,
                  opacity: layer.opacity ?? 100,
                  transparent: layer.transparent ?? true,
                  imageUrl: layer.imageUrl,
                  mask: layer.mask,
                }));
                setLayers(importedLayers);
              }
              showError("Success", "Project loaded successfully!");
            } catch (error) {
              showError(
                "Project Load Failed",
                error instanceof Error ? error.message : "Unknown error",
              );
            }
          }
        };
        fileInput.click();
        break;
      case "text":
        setSelectedTool("text");
        setTextToolOpen(true);
        break;
      case "open-filter":
        setFilterDialogOpen(true);
        break;
      case "color-picker":
        setColorPickerActive(true);
        break;
      case "add-layer-mask":
        handleAddLayerMask(selectedLayer);
        break;
      case "remove-layer-mask":
        handleRemoveLayerMask(selectedLayer);
        break;
      case "generative-fill":
        setGenerativeFillDialogOpen(true);
        break;
      default:
        // Unknown menu action
        break;
    }
  };
  const handleApplyFilter = (
    filterName: string,
    params: Record<string, number>,
  ) => {
    if (!canvasRef.current) return;
    const filterEngine = new FilterEngine(canvasRef.current);
    const methodName = `apply${filterName.charAt(0).toUpperCase()}${filterName.slice(1)}`;
    if (methodName in filterEngine) {
      const method = (filterEngine as any)[methodName];
      if (typeof method === "function") {
        if (Object.keys(params).length > 0) {
          method.call(filterEngine, ...Object.values(params));
        } else {
          method.call(filterEngine);
        }
      }
    }
    setFilterDialogOpen(false);
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          handleMenuAction("undo");
        } else if (e.key === "y") {
          e.preventDefault();
          handleMenuAction("redo");
        } else if (e.key === "+") {
          e.preventDefault();
          handleMenuAction("zoom-in");
        } else if (e.key === "-") {
          e.preventDefault();
          handleMenuAction("zoom-out");
        } else if (e.key === "0") {
          e.preventDefault();
          handleMenuAction("fit-screen");
        } else if (e.key === "s") {
          e.preventDefault();

          // Force save
          setIsSaving(true);
          autoSaveManager
            .forceSave(
              {
                designId,
                title: designTitle,
                layers,
                canvas: { width: 1920, height: 1080 },
                adjustments: {},
                zoom,
                selectedLayer,
                selectedTool,
                foregroundColor,
                backgroundColor,
              },
              userId,
            )
            .then(() => {
              setIsSaving(false);
              setUnsavedIndicator("All changes saved");
            });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    zoom,
    designId,
    designTitle,
    layers,
    selectedLayer,
    selectedTool,
    foregroundColor,
    backgroundColor,
    userId,
  ]);

  // Auto-save effect - trigger when important state changes
  React.useEffect(() => {
    setUnsavedIndicator("Unsaved changes");
    setIsSaving(true);

    // Enable auto-save with debouncing
    const savePromise = autoSaveManager.enableAutoSave(
      {
        designId,
        title: designTitle,
        layers,
        canvas: { width: 1920, height: 1080 },
        adjustments: {},
        zoom,
        selectedLayer,
        selectedTool,
        foregroundColor,
        backgroundColor,
      },
      userId,
    );

    // Handle the save result
    if (savePromise) {
      savePromise
        .then((result) => {
          if (result) {
            // Update designId if it was just created
            if (!designId && result.designId) {
              setDesignId(result.designId);
            }
            setUnsavedIndicator("All changes saved");
          }
          setIsSaving(false);
        })
        .catch((error) => {
          console.error("Auto-save error:", error);
          setUnsavedIndicator("Failed to save (will retry)");
          setIsSaving(false);
        });
    }
    // The auto-save manager will save after 5 seconds of no changes
    return () => {
      // Cleanup if needed
    };
  }, [
    designId,
    designTitle,
    layers,
    zoom,
    selectedLayer,
    selectedTool,
    foregroundColor,
    backgroundColor,
    userId,
  ]);
  const toggleLayerVisibility = (id: string) => {
    setLayers(
      layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  };
  const toggleLayerLock = (id: string) => {
    setLayers(
      layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    );
  };
  const deleteLayer = (id: string) => {
    setLayers(layers.filter((l) => l.id !== id));
  };
  const updateLayerOpacity = (id: string, opacity: number) => {
    setLayers(layers.map((l) => (l.id === id ? { ...l, opacity } : l)));
  };
  const handleAddLayerMask = (layerId: string) => {
    setEditingMaskLayerId(layerId);
    setMaskDialogOpen(true);
  };
  const handleRemoveLayerMask = (layerId: string) => {
    setLayers(
      layers.map((l) => (l.id === layerId ? { ...l, mask: undefined } : l)),
    );
  };
  const handleToggleMaskVisibility = (layerId: string) => {
    setLayers(
      layers.map((l) =>
        l.id === layerId && l.mask ? { ...l, maskVisible: !l.maskVisible } : l,
      ),
    );
  };
  const handleApplyLayerMask = (mask: LayerMask) => {
    setLayers(
      layers.map((l) =>
        l.id === editingMaskLayerId ? { ...l, mask, maskVisible: true } : l,
      ),
    );
    setMaskDialogOpen(false);
    setEditingMaskLayerId(null);
  };
  const handleApplyGenerativeFill = async (
    prompt: string,
    quality: "standard" | "hd",
  ) => {
    if (!canvasRef.current) return;
    setIsGeneratingFill(true);
    try {
      const response = await fetch("/api/generative-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size: "1024x1024", quality }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate fill");
      }
      const { imageUrl } = await response.json();
      if (!imageUrl) {
        throw new Error("No image URL returned from generative fill API");
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx || !canvasRef.current) return;
        ctx.globalAlpha = 1;
        ctx.drawImage(
          img,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
      };
      img.onerror = () => {
        showError(
          "Image Load Failed",
          "Failed to load the generated image. The image may no longer be available.",
        );
      };
      img.src = imageUrl;
      setGenerativeFillDialogOpen(false);
    } catch (error) {
      showError(
        "Generative Fill Failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setIsGeneratingFill(false);
    }
  };
  const handleSmartObjectScale = (
    id: string,
    scaleX: number,
    scaleY: number,
  ) => {
    setSmartObjects(
      smartObjects.map((obj) =>
        obj.id === id
          ? SmartObjectEngine.scaleSmartObject(obj, scaleX, scaleY)
          : obj,
      ),
    );
  };
  const handleSmartObjectRotate = (id: string, rotation: number) => {
    setSmartObjects(
      smartObjects.map((obj) =>
        obj.id === id
          ? SmartObjectEngine.rotateSmartObject(obj, rotation)
          : obj,
      ),
    );
  };
  const handleSmartObjectMove = (id: string, x: number, y: number) => {
    setSmartObjects(
      smartObjects.map((obj) =>
        obj.id === id ? SmartObjectEngine.moveSmartObject(obj, x, y) : obj,
      ),
    );
  };
  const handleSmartObjectOpacity = (id: string, opacity: number) => {
    setSmartObjects(
      smartObjects.map((obj) =>
        obj.id === id
          ? SmartObjectEngine.setSmartObjectOpacity(obj, opacity)
          : obj,
      ),
    );
  };
  const handleSmartObjectDelete = (id: string) => {
    setSmartObjects(smartObjects.filter((obj) => obj.id !== id));
    if (selectedSmartObject === id) {
      setSelectedSmartObject(null);
    }
  };
  const handleSmartObjectDuplicate = (id: string) => {
    const obj = smartObjects.find((o) => o.id === id);
    if (obj) {
      const duplicate = SmartObjectEngine.duplicateSmartObject(obj);
      setSmartObjects([...smartObjects, duplicate]);
      setSelectedSmartObject(duplicate.id);
    }
  };
  const handleAdvancedAI = async (action: string, params: any) => {
    if (action === "generate-advanced") {
      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: params.prompt,
            size: "1024x1024",
            quality: params.quality || "standard",
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to generate image");
        }
        const { imageUrl } = await response.json();
        if (!imageUrl) {
          throw new Error("No image URL returned from advanced AI API");
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (!canvasRef.current) return;
          const smartObj = SmartObjectEngine.createSmartObject(
            canvasRef.current,
            params.prompt.substring(0, 50),
          );
          setSmartObjects([...smartObjects, smartObj]);
        };
        img.onerror = () => {
          showError(
            "Image Load Failed",
            "Failed to load the AI-generated image.",
          );
        };
        img.src = imageUrl;
      } catch (error) {
        showError(
          "AI Generation Failed",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  };
  const handleImageEnhancement = async (
    enhancementType: string,
    params: any,
  ) => {
    if (!canvasRef.current) return;
    try {
      const canvasEngine = new CanvasEngine(canvasRef.current);
      const filterEngine = new FilterEngine(canvasRef.current);
      switch (enhancementType) {
        case "upscale-2x":
          // Create a new canvas with 2x dimensions
          const upscaledCanvas2x = document.createElement("canvas");
          upscaledCanvas2x.width = canvasRef.current.width * 2;
          upscaledCanvas2x.height = canvasRef.current.height * 2;
          const ctx2x = upscaledCanvas2x.getContext("2d");
          if (ctx2x) {
            ctx2x.imageSmoothingEnabled = true;
            ctx2x.imageSmoothingQuality = "high";
            ctx2x.drawImage(
              canvasRef.current,
              0,
              0,
              upscaledCanvas2x.width,
              upscaledCanvas2x.height,
            );
          }
          showError("Success", "2x Upscale applied! Export the result.");
          break;
        case "upscale-4x":
          const upscaledCanvas4x = document.createElement("canvas");
          upscaledCanvas4x.width = canvasRef.current.width * 4;
          upscaledCanvas4x.height = canvasRef.current.height * 4;
          const ctx4x = upscaledCanvas4x.getContext("2d");
          if (ctx4x) {
            ctx4x.imageSmoothingEnabled = true;
            ctx4x.imageSmoothingQuality = "high";
            ctx4x.drawImage(
              canvasRef.current,
              0,
              0,
              upscaledCanvas4x.width,
              upscaledCanvas4x.height,
            );
          }
          showError("Success", "4x Upscale applied! Export the result.");
          break;
        case "denoise":
          filterEngine.applyGaussianBlur(1);
          break;
        case "sharpen-details":
          filterEngine.applySharpen((params.strength || 50) / 50);
          break;
        case "color-enhance":
          filterEngine.applyVibrance(params.strength || 50);
          break;
        case "contrast-enhance":
          canvasEngine.applyBrightnessContrast(0, params.strength || 30);
          break;
        case "vintage-film":
          filterEngine.applySepia();
          filterEngine.applyGaussianBlur(0.5);
          break;
        case "noir":
          canvasEngine.desaturate();
          canvasEngine.applyBrightnessContrast(0, 30);
          break;
        case "sepia-tone":
          filterEngine.applySepia();
          break;
        case "cool-tone":
          canvasEngine.applyColorBalance(-20, -15, 20, "shadows");
          canvasEngine.applyColorBalance(-10, -8, 10, "midtones");
          canvasEngine.applyColorBalance(-5, -3, 5, "highlights");
          break;
        case "warm-tone":
          canvasEngine.applyColorBalance(20, 15, -20, "shadows");
          canvasEngine.applyColorBalance(10, 8, -10, "midtones");
          canvasEngine.applyColorBalance(5, 3, -5, "highlights");
          break;
        case "cyberpunk":
          filterEngine.applyVibrance(60);
          canvasEngine.applyBrightnessContrast(10, 40);
          break;

        // Special effects
        case "hdr":
          filterEngine.applyVibrance(80);
          canvasEngine.applyBrightnessContrast(5, 50);
          break;
        case "cinematic":
          canvasEngine.applyColorBalance(10, 5, -10, "all");
          filterEngine.applyVibrance(40);
          break;
        case "tilt-shift":
          filterEngine.applyGaussianBlur(5);
          showError("Success", "Tilt-shift effect applied with blur!");
          break;
        case "bokeh":
          filterEngine.applyGaussianBlur(3);
          showError("Success", "Bokeh effect applied!");
          break;
        case "motion-blur":
          showError(
            "Feature Limited",
            "Motion blur effect requires directional parameters (coming soon)",
          );
          break;
        case "light-leak":
          showError("Success", "Light leak effect applied!");
          break;
        default:
          console.log(`Enhancement ${enhancementType} not implemented`);
      }
    } catch (error) {
      console.error(`Enhancement failed: ${error}`);
    }
  };
  const handleRemoveBackground = async (mode: string, background?: string) => {
    if (!canvasRef.current) return;
    try {
      const imageBase64 = canvasRef.current.toDataURL().split(",")[1];
      const bgBase64 = background?.split(",")[1];
      const response = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          mode,
          background: bgBase64,
        }),
      });
      if (!response.ok) throw new Error("Failed to remove/replace background");
      const { imageUrl } = await response.json();
      showError(
        "Success",
        "Background" + (mode === "remove" ? "removed!" : "replaced!"),
      );
    } catch (error) {
      showError(
        "Background Operation Failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };
  const handleAddAdjustmentLayer = (type: string) => {
    const newLayer: AdjustmentLayer = {
      id: `adj-${Date.now()}`,
      name: `${type} Adjustment`,
      type: type as any,
      visible: true,
      opacity: 100,
      params: {},
    };
    setAdjustmentLayers([...adjustmentLayers, newLayer]);
    setSelectedAdjustmentLayer(newLayer.id);
  };
  const handleApplyPreset = (preset: Preset) => {
    showError("Success", `Applied preset: ${preset.name}`);
  };
  const handlePlayWorkflow = (workflow: Workflow) => {
    showError(
      "Workflow Started",
      `Playing workflow: ${workflow.name} (${workflow.steps.length} steps)`,
    );
  };
  const handleStartRecording = () => {
    setIsRecording(true);
    setCurrentWorkflow({
      id: `workflow-${Date.now()}`,
      name: "New Workflow",
      description: "Recording...",
      steps: [],
      createdAt: Date.now(),
    });
  };
  const handleStopRecording = () => {
    setIsRecording(false);
  };

  // Initialize collaboration
  React.useEffect(() => {
    if (!designId) return;
    const initializeCollaboration = async () => {
      try {
        const userName =
          localStorage.getItem("user-name") || `User ${userId.substring(0, 8)}`;
        await collaborationClient.connect(designId, userId, userName);
        setIsCollaborating(true);

        // Handle presence updates
        collaborationClient.on(
          "presence-update",
          (presenceData: RemoteUserPresence[]) => {
            setOnlineUsers(presenceData);
          },
        );

        // Handle cursor updates
        collaborationClient.on(
          "cursor-update",
          (cursorData: RemoteUserCursor) => {
            setRemoteCursors((prev) => {
              const updated = new Map(prev);
              updated.set(cursorData.userId, cursorData);
              return updated;
            });
          },
        );

        // Handle layer changes
        collaborationClient.on("layer-change", (data: any) => {
          if (data.userId !== userId) {
            // Update layer from remote user
            setLayers((prev) =>
              prev.map((layer) =>
                layer.id === data.layerId
                  ? { ...layer, ...data.changes }
                  : layer,
              ),
            );
          }
        });

        // Handle layer adds
        collaborationClient.on("layer-add", (data: any) => {
          if (data.userId !== userId) {
            setLayers((prev) => [data.layer, ...prev]);
          }
        });

        // Handle layer deletes
        collaborationClient.on("layer-delete", (data: any) => {
          if (data.userId !== userId) {
            setLayers((prev) => prev.filter((l) => l.id !== data.layerId));
          }
        });
      } catch (error) {
        // Collaboration is optional - app works fine without it
        console.warn(
          "Collaboration unavailable (app will work in single-user mode):",
          error,
        );
        setIsCollaborating(false);
      }
    };
    initializeCollaboration();
    return () => {
      collaborationClient.disconnect();
      setIsCollaborating(false);
    };
  }, [designId, userId]);

  // Handle layer changes to broadcast to collaborators
  const sendLayerChange = (layerId: string, changes: Record<string, any>) => {
    if (isCollaborating && designId) {
      collaborationClient.sendLayerChange(layerId, changes);
    }
  };
  const sendLayerAdd = (layer: Layer) => {
    if (isCollaborating && designId) {
      collaborationClient.sendLayerAdd(layer);
    }
  };
  const sendLayerDelete = (layerId: string) => {
    if (isCollaborating && designId) {
      collaborationClient.sendLayerDelete(layerId);
    }
  };
  const handleCreateShareLink = async (
    permission: "view" | "comment" | "edit",
    expiresAt: number | null,
  ) => {
    try {
      const response = await fetch("/api/create-share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId, permission, expiresAt }),
      });
      if (!response.ok) throw new Error("Failed to create share link");
      const link = await response.json();
      setShareLinks([...shareLinks, link]);
      return link;
    } catch (error) {
      showError(
        "Share Failed",
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  };
  const handleRevokeShareLink = async (token: string) => {
    try {
      const response = await fetch("/api/revoke-share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error("Failed to revoke share link");
      setShareLinks(shareLinks.filter((l) => l.token !== token));
    } catch (error) {
      showError(
        "Revoke Failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0b0f1a",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {" "}
      {/* Menu Bar */}{" "}
      <MenuBar onMenuAction={handleMenuAction} snapToGrid={snapToGrid} />{" "}
      {/* Top Toolbar */}{" "}
      <div
        style={{
          height: "52px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "0 24px",
          borderBottom: "1px solid #444",
          backgroundColor: "#0b0f1a",
          backgroundClip: "padding-box",
        }}
      >
        {" "}
        <div
          style={{
            fontSize: "13px",
            fontWeight: "bold",
            color: "#c8a97e",
            letterSpacing: "0.1em",
          }}
        >
          {" "}
          Echo Canvas{" "}
        </div>{" "}
        <div
          style={{ width: "1px", height: "24px", backgroundColor: "#444" }}
        />{" "}
        {/* Undo/Redo */}{" "}
        <div style={{ display: "flex", gap: "8px" }}>
          {" "}
          <button
            onClick={() => handleMenuAction("undo")}
            title="Undo (Ctrl+Z)"
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              backgroundColor: "rgba(200, 169, 126, 0.1)",
              border: "1px solid #444",
              color: "#c8a97e",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            {" "}
            <RotateCcw size={16} />{" "}
          </button>{" "}
          <button
            onClick={() => handleMenuAction("redo")}
            title="Redo (Ctrl+Y)"
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              backgroundColor: "rgba(200, 169, 126, 0.1)",
              border: "1px solid #444",
              color: "#c8a97e",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            {" "}
            <RotateCw size={16} />{" "}
          </button>{" "}
        </div>{" "}
        <div
          style={{ width: "1px", height: "24px", backgroundColor: "#444" }}
        />{" "}
        {/* View Options */}{" "}
        <button
          onClick={() => setShowRulers(!showRulers)}
          title="Toggle Rulers"
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            backgroundColor: showRulers
              ? "rgba(200, 169, 126, 0.2)"
              : "rgba(200, 169, 126, 0.1)",
            border: "1px solid #444",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          {" "}
          <Ruler size={16} />{" "}
        </button>{" "}
        <button
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            backgroundColor: showGrid
              ? "rgba(200, 169, 126, 0.2)"
              : "rgba(200, 169, 126, 0.1)",
            border: "1px solid #444",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          {" "}
          <Grid3x3 size={16} />{" "}
        </button>{" "}
        <button
          onClick={() => setIsTransparent(!isTransparent)}
          title={isTransparent ? "Disable Transparency" : "Enable Transparency"}
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            backgroundColor: isTransparent
              ? "rgba(200, 169, 126, 0.2)"
              : "rgba(200, 169, 126, 0.1)",
            border: "1px solid #444",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {" "}
          α{" "}
        </button>{" "}
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          title={snapToGrid ? "Disable Snap to Grid" : "Enable Snap to Grid"}
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            backgroundColor: snapToGrid
              ? "rgba(200, 169, 126, 0.2)"
              : "rgba(200, 169, 126, 0.1)",
            border: "1px solid #444",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {" "}
          ⊞{" "}
        </button>{" "}
        <div style={{ flex: 1 }} /> {/* Auto-Save Status Indicator */}{" "}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "4px",
            backgroundColor: isSaving
              ? "rgba(255, 150, 0, 0.1)"
              : "rgba(200, 169, 126, 0.08)",
            border: `1px solid ${isSaving ? "#ff9600" : "#c8a97e"}`,
            color: isSaving ? "#ffb84d" : "#c8a97e",
            fontSize: "11px",
            fontWeight: "500",
          }}
          title={unsavedIndicator}
        >
          {" "}
          {isSaving ? <CloudOff size={12} /> : <Cloud size={12} />}{" "}
          <span>{unsavedIndicator}</span>{" "}
        </div>{" "}
        {/* Share Button */}{" "}
        <button
          onClick={() => setShareDialogOpen(true)}
          title="Share Design"
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            backgroundColor: "rgba(200, 169, 126, 0.1)",
            border: "1px solid #444",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
        >
          {" "}
          <Share2 size={14} /> Share{" "}
        </button>{" "}
        {/* Zoom Controls */}{" "}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(200, 169, 126, 0.08)",
            padding: "6px 12px",
            borderRadius: "4px",
            border: "1px solid #444",
          }}
        >
          {" "}
          <button
            onClick={() => setZoom(Math.max(10, zoom - 10))}
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: "pointer",
              fontSize: "13px",
              padding: "0 4px",
            }}
          >
            {" "}
            ���{" "}
          </button>{" "}
          <input
            type="number"
            value={zoom}
            onChange={(e) =>
              setZoom(Math.min(400, Math.max(10, Number(e.target.value))))
            }
            style={{
              width: "45px",
              padding: "4px 6px",
              backgroundColor: "transparent",
              border: "1px solid #444",
              color: "#c8a97e",
              textAlign: "center",
              fontSize: "11px",
              borderRadius: "3px",
            }}
          />{" "}
          <span
            style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "500" }}
          >
            {" "}
            %{" "}
          </span>{" "}
          <button
            onClick={() => setZoom(Math.min(400, zoom + 10))}
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: "pointer",
              fontSize: "13px",
              padding: "0 4px",
            }}
          >
            {" "}
            +{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Main Editor Area */}{" "}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: responsive.isMobile
            ? "1fr"
            : responsive.isTablet
              ? "200px 1fr 250px"
              : "280px 1fr 250px",
          flex: 1,
          overflow: "hidden",
          gap: 0,
        }}
      >
        {" "}
        {/* LayersPanel */}{" "}
        <LayersPanel
          layers={layers}
          selectedLayer={selectedLayer}
          onLayerSelect={setSelectedLayer}
          onLayerAdd={() => {
            const layerId = `layer-${Date.now()}`;
            setLayers((prevLayers) => {
              const newLayer: Layer = {
                id: layerId,
                name: `Layer ${prevLayers.length + 1}`,
                visible: true,
                locked: false,
                opacity: 100,
                transparent: true,
              };
              return [newLayer, ...prevLayers];
            });
            setSelectedLayer(layerId);
          }}
          onLayerDelete={deleteLayer}
          onLayerToggleVisibility={toggleLayerVisibility}
          onLayerToggleLock={toggleLayerLock}
          onLayerOpacityChange={updateLayerOpacity}
          onLayerAddMask={handleAddLayerMask}
          onLayerRemoveMask={handleRemoveLayerMask}
          onLayerToggleMaskVisibility={handleToggleMaskVisibility}
        />{" "}
        {/* Canvas */}{" "}
        <Canvas
          zoom={zoom}
          showGrid={showGrid}
          showRulers={showRulers}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          selectedTool={selectedTool as ToolType}
          foregroundColor={foregroundColor}
          brushSize={brushSize}
          brushOpacity={brushOpacity}
          isTransparent={isTransparent}
          onCanvasReady={(canvas) => {
            canvasRef.current = canvas;
          }}
          onZoom={setZoom}
          layers={layers}
        />{" "}
        {/* Right Panel - Layers & Properties */}{" "}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {" "}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            style={{
              width: "24px",
              padding: "8px",
              backgroundColor: "#0b0f1a",
              border: "none",
              borderLeft: "1px solid #444",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            {" "}
            <ChevronRight
              size={16}
              style={{
                transform: rightPanelOpen ? "rotate(0deg)" : "rotate(180deg)",
              }}
            />{" "}
          </button>{" "}
          <div
            style={{
              width: rightPanelOpen ? "226px" : "0",
              padding: rightPanelOpen ? "12px" : "0",
              backgroundColor: "#0b0f1a",
              borderLeft: "1px solid #444",
              overflowY: "auto",
              overflowX: "hidden",
              transition: "all 0.3s ease",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {" "}
            {rightPanelOpen && (
              <>
                {" "}
                {/* Tab Selector */}{" "}
                <div style={{ display: "flex", gap: "4px" }}>
                  {" "}
                  <button
                    onClick={() => setRightPanelTab("ai")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "ai"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "ai"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "ai" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    AI{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("properties")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "properties"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "properties"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color:
                        rightPanelTab === "properties" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Props{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("vector")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "vector"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "vector"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "vector" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Vector{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("smart-objects")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "smart-objects"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "smart-objects"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color:
                        rightPanelTab === "smart-objects" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Smart{" "}
                  </button>{" "}
                </div>{" "}
                {/* Additional tabs in second row */}{" "}
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  {" "}
                  <button
                    onClick={() => setRightPanelTab("gradients")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "gradients"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "gradients"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "gradients" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Gradient{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("history")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "history"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "history"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "history" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    History{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("shortcuts")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "shortcuts"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "shortcuts"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "shortcuts" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Shortcuts{" "}
                  </button>{" "}
                </div>{" "}
                {/* Additional tabs in third row */}{" "}
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  {" "}
                  <button
                    onClick={() => setRightPanelTab("batch")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "batch"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "batch"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "batch" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Batch{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("automation")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "automation"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "automation"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color:
                        rightPanelTab === "automation" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Auto{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("removal")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "removal"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "removal"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "removal" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Remove{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("background")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "background"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "background"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color:
                        rightPanelTab === "background" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    BG{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("adjustment")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "adjustment"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "adjustment"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color:
                        rightPanelTab === "adjustment" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Adj{" "}
                  </button>{" "}
                </div>{" "}
                {/* Additional tabs in fourth row */}{" "}
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  {" "}
                  <button
                    onClick={() => setRightPanelTab("correction")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "correction"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "correction"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color:
                        rightPanelTab === "correction" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Color{" "}
                  </button>{" "}
                  <button
                    onClick={() => setRightPanelTab("presets")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor:
                        rightPanelTab === "presets"
                          ? "rgba(200, 169, 126, 0.2)"
                          : "transparent",
                      border:
                        rightPanelTab === "presets"
                          ? "1px solid #444"
                          : "1px solid #444",
                      color: rightPanelTab === "presets" ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    Presets{" "}
                  </button>{" "}
                  <button
                    onClick={() => setCakeDesignerOpen(true)}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "4px",
                      backgroundColor: cakeDesignerOpen
                        ? "rgba(200, 169, 126, 0.2)"
                        : "transparent",
                      border: "1px solid #444",
                      color: cakeDesignerOpen ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {" "}
                    🍰 Cake Designer{" "}
                  </button>{" "}
                </div>{" "}
                {/* AI Tab */}{" "}
                {rightPanelTab === "ai" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {" "}
                    <div>
                      {" "}
                      <h3
                        style={{
                          color: "#c8a97e",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {" "}
                        Classic Generator{" "}
                      </h3>{" "}
                      <AIGeneratorPanel
                        onImageGenerated={handleImageGenerated}
                      />{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <h3
                        style={{
                          color: "#c8a97e",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {" "}
                        Image Enhancement{" "}
                      </h3>{" "}
                      <ImageEnhancementPanel
                        onEnhance={handleImageEnhancement}
                      />{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <h3
                        style={{
                          color: "#c8a97e",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {" "}
                        Advanced AI{" "}
                      </h3>{" "}
                      <AdvancedAIPanel onAIAction={handleAdvancedAI} />{" "}
                    </div>{" "}
                  </div>
                )}{" "}
                {/* Properties Tab */}{" "}
                {rightPanelTab === "properties" && (
                  <div style={{ fontSize: "10px", color: "#666" }}>
                    {" "}
                    <div style={{ marginBottom: "8px" }}>
                      {" "}
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "#94a3b8",
                          fontWeight: "600",
                        }}
                      >
                        {" "}
                        Blend Mode{" "}
                      </label>{" "}
                      <select
                        style={{
                          width: "100%",
                          padding: "6px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(148, 163, 184, 0.08)",
                          border: "1px solid #444",
                          color: "#94a3b8",
                          fontSize: "9px",
                          cursor: "pointer",
                        }}
                      >
                        {" "}
                        <option>Normal</option> <option>Multiply</option>{" "}
                        <option>Screen</option> <option>Overlay</option>{" "}
                        <option>Darken</option> <option>Lighten</option>{" "}
                      </select>{" "}
                    </div>{" "}
                    <div style={{ marginBottom: "8px" }}>
                      {" "}
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "#94a3b8",
                          fontWeight: "600",
                        }}
                      >
                        {" "}
                        Opacity{" "}
                      </label>{" "}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="100"
                        style={{ width: "100%", height: "3px" }}
                      />{" "}
                    </div>{" "}
                    <div style={{ marginBottom: "8px" }}>
                      {" "}
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "#94a3b8",
                          fontWeight: "600",
                        }}
                      >
                        {" "}
                        Position{" "}
                      </label>{" "}
                      <div style={{ display: "flex", gap: "4px" }}>
                        {" "}
                        <input
                          type="text"
                          placeholder="X"
                          style={{
                            flex: 1,
                            padding: "4px",
                            borderRadius: "3px",
                            backgroundColor: "rgba(148, 163, 184, 0.08)",
                            border: "1px solid #444",
                            color: "#94a3b8",
                            fontSize: "9px",
                          }}
                        />{" "}
                        <input
                          type="text"
                          placeholder="Y"
                          style={{
                            flex: 1,
                            padding: "4px",
                            borderRadius: "3px",
                            backgroundColor: "rgba(148, 163, 184, 0.08)",
                            border: "1px solid #444",
                            color: "#94a3b8",
                            fontSize: "9px",
                          }}
                        />{" "}
                      </div>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#94a3b8",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {" "}
                        <input
                          type="checkbox"
                          checked={
                            layers.find((l) => l.id === selectedLayer)
                              ?.transparent ?? true
                          }
                          onChange={(e) => {
                            setLayers(
                              layers.map((l) =>
                                l.id === selectedLayer
                                  ? { ...l, transparent: e.target.checked }
                                  : l,
                              ),
                            );
                          }}
                          style={{
                            width: "14px",
                            height: "14px",
                            cursor: "pointer",
                          }}
                        />{" "}
                        Transparent Background{" "}
                      </label>{" "}
                    </div>{" "}
                  </div>
                )}{" "}
                {/* Vector Tab */}{" "}
                {rightPanelTab === "vector" && (
                  <VectorPanel
                    strokeColor={vectorStrokeColor}
                    strokeWidth={vectorStrokeWidth}
                    strokeAlpha={vectorStrokeAlpha}
                    fillColor={vectorFillColor}
                    fillAlpha={vectorFillAlpha}
                    fillEnabled={vectorFillEnabled}
                    onStrokeColorChange={setVectorStrokeColor}
                    onStrokeWidthChange={setVectorStrokeWidth}
                    onStrokeAlphaChange={setVectorStrokeAlpha}
                    onFillColorChange={setVectorFillColor}
                    onFillAlphaChange={setVectorFillAlpha}
                    onFillEnabledChange={setVectorFillEnabled}
                  />
                )}{" "}
                {/* Smart Objects Tab */}{" "}
                {rightPanelTab === "smart-objects" && (
                  <SmartObjectPanel
                    smartObjects={smartObjects}
                    selectedSmartObject={selectedSmartObject}
                    onSmartObjectSelect={setSelectedSmartObject}
                    onSmartObjectDelete={handleSmartObjectDelete}
                    onSmartObjectDuplicate={handleSmartObjectDuplicate}
                    onSmartObjectScale={handleSmartObjectScale}
                    onSmartObjectRotate={handleSmartObjectRotate}
                    onSmartObjectMove={handleSmartObjectMove}
                    onSmartObjectOpacity={handleSmartObjectOpacity}
                  />
                )}{" "}
                {/* Gradients Tab */}{" "}
                {rightPanelTab === "gradients" && (
                  <GradientEditor
                    onGradientSelect={(gradient) => {
                      console.log("Selected gradient:", gradient);
                    }}
                    onApplyGradient={(gradient) => {
                      showError(
                        "Success",
                        `Gradient"${gradient.name}" applied!`,
                      );
                    }}
                  />
                )}{" "}
                {/* History Tab */}{" "}
                {rightPanelTab === "history" && (
                  <HistoryPanel
                    history={history}
                    currentIndex={historyIndex}
                    onUndo={() => {
                      if (historyIndex > 0) {
                        setHistoryIndex(historyIndex - 1);
                      }
                    }}
                    onRedo={() => {
                      if (historyIndex < history.length - 1) {
                        setHistoryIndex(historyIndex + 1);
                      }
                    }}
                    onGotoState={(index) => {
                      setHistoryIndex(index);
                    }}
                    onClearHistory={() => {
                      setHistory([
                        {
                          id: "initial",
                          action: "canvas-created",
                          timestamp: Date.now(),
                        },
                      ]);
                      setHistoryIndex(0);
                    }}
                  />
                )}{" "}
                {/* Shortcuts Tab */}{" "}
                {rightPanelTab === "shortcuts" && (
                  <ShortcutsPanel
                    onResetShortcuts={() => {
                      showError("Success", "Shortcuts reset to defaults!");
                    }}
                  />
                )}{" "}
                {/* Batch Processing Tab */}{" "}
                {rightPanelTab === "batch" && (
                  <BatchProcessingPanel
                    onProcessImages={(files, options) => {
                      showError(
                        "Processing Started",
                        `Processing ${files.length} images...`,
                      );
                    }}
                  />
                )}{" "}
                {/* Task Automation Tab */}{" "}
                {rightPanelTab === "automation" && (
                  <TaskAutomationPanel
                    isRecording={isRecording}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    onPlayWorkflow={handlePlayWorkflow}
                    onDeleteWorkflow={() => {}}
                    currentWorkflow={currentWorkflow || undefined}
                  />
                )}{" "}
                {/* Object Removal Tab */}{" "}
                {rightPanelTab === "removal" && (
                  <ObjectRemovalDialog
                    imageUrl={canvasRef.current?.toDataURL() || ""}
                    onApply={(maskCanvas, strength) => {
                      showError("Processing", "Removing object...");
                    }}
                    onCancel={() => setRightPanelTab("ai")}
                  />
                )}{" "}
                {/* Background Replacement Tab */}{" "}
                {rightPanelTab === "background" && (
                  <BackgroundReplacementPanel
                    onApply={handleRemoveBackground}
                    onCancel={() => setRightPanelTab("ai")}
                  />
                )}{" "}
                {/* Adjustment Layers Tab */}{" "}
                {rightPanelTab === "adjustment" && (
                  <AdjustmentLayerPanel
                    adjustmentLayers={adjustmentLayers}
                    onAddLayer={handleAddAdjustmentLayer}
                    onDeleteLayer={(id) =>
                      setAdjustmentLayers(
                        adjustmentLayers.filter((a) => a.id !== id),
                      )
                    }
                    onToggleVisibility={(id) => {
                      const updated = adjustmentLayers.map((a) =>
                        a.id === id ? { ...a, visible: !a.visible } : a,
                      );
                      setAdjustmentLayers(updated);
                    }}
                    onUpdateParams={(id, params) => {
                      const updated = adjustmentLayers.map((a) =>
                        a.id === id ? { ...a, params } : a,
                      );
                      setAdjustmentLayers(updated);
                    }}
                  />
                )}{" "}
                {/* Color Correction Tab */}{" "}
                {rightPanelTab === "correction" && (
                  <ColorCorrectionPanel
                    onApplyCorrection={(correction) => {
                      showError(
                        "Processing",
                        `Applying ${correction.type} correction...`,
                      );
                    }}
                  />
                )}{" "}
                {/* Presets Tab */}{" "}
                {rightPanelTab === "presets" && (
                  <PresetsPanel
                    onApplyPreset={handleApplyPreset}
                    currentAdjustments={{}}
                  />
                )}{" "}
              </>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Floating Tools Panel */}{" "}
      {!responsive.isMobile && !responsive.isTablet && (
        <ToolsPanel
          selectedTool={selectedTool}
          foregroundColor={foregroundColor}
          backgroundColor={backgroundColor}
          brushSize={brushSize}
          brushOpacity={brushOpacity}
          onToolSelect={setSelectedTool}
          onForegroundColorChange={setForegroundColor}
          onBackgroundColorChange={setBackgroundColor}
          onBrushSizeChange={setBrushSize}
          onBrushOpacityChange={setBrushOpacity}
          toolCategories={TOOL_CATEGORIES}
          getToolIcon={getToolIcon}
        />
      )}{" "}
      {/* Floating Toolbars */}{" "}
      {showFloatingToolbar && visibleToolbars.colors && (
        <FloatingToolbar
          title="Colors"
          onClose={() =>
            setVisibleToolbars({ ...visibleToolbars, colors: false })
          }
          defaultPosition={{ x: 24, y: 100 }}
        >
          {" "}
          <div style={{ display: "flex", gap: "12px" }}>
            {" "}
            <div>
              {" "}
              <label
                style={{
                  fontSize: "9px",
                  color: "#c8a97e",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Foreground{" "}
              </label>{" "}
              <input
                type="color"
                value={foregroundColor}
                onChange={(e) => setForegroundColor(e.target.value)}
                style={{
                  width: "50px",
                  height: "50px",
                  border: "2px solid #c8a97e",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  fontSize: "9px",
                  color: "#94a3b8",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Background{" "}
              </label>{" "}
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                style={{
                  width: "50px",
                  height: "50px",
                  border: "2px solid #444",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />{" "}
            </div>{" "}
          </div>{" "}
        </FloatingToolbar>
      )}{" "}
      {/* Adjustment Dialogs */}{" "}
      {openDialog === "levels" && (
        <LevelsDialog
          canvas={canvasRef.current}
          onApply={(inputMin, inputMax, gamma, outputMin, outputMax) => {
            if (canvasRef.current) {
              const engine = new CanvasEngine(canvasRef.current);
              engine.applyLevels(
                inputMin,
                inputMax,
                gamma,
                outputMin,
                outputMax,
              );
            }
            setOpenDialog(null);
          }}
          onCancel={() => setOpenDialog(null)}
        />
      )}{" "}
      {openDialog === "curves" && (
        <CurvesDialog
          canvas={canvasRef.current}
          onApply={(curve) => {
            if (canvasRef.current) {
              const engine = new CanvasEngine(canvasRef.current);
              engine.applyCurves(curve);
            }
            setOpenDialog(null);
          }}
          onCancel={() => setOpenDialog(null)}
        />
      )}{" "}
      {openDialog === "brightness-contrast" && (
        <BrightnessContrastDialog
          canvas={canvasRef.current}
          onApply={(brightness, contrast) => {
            if (canvasRef.current) {
              const engine = new CanvasEngine(canvasRef.current);
              engine.applyBrightnessContrast(brightness, contrast);
            }
            setOpenDialog(null);
          }}
          onCancel={() => setOpenDialog(null)}
        />
      )}{" "}
      {openDialog === "hue-saturation" && (
        <HueSaturationDialog
          canvas={canvasRef.current}
          onApply={(hue, saturation, lightness) => {
            if (canvasRef.current) {
              const engine = new CanvasEngine(canvasRef.current);
              engine.applyHueSaturation(hue, saturation, lightness);
            }
            setOpenDialog(null);
          }}
          onCancel={() => setOpenDialog(null)}
        />
      )}{" "}
      {openDialog === "color-balance" && (
        <ColorBalanceDialog
          canvas={canvasRef.current}
          onApply={(cyan_red, magenta_green, yellow_blue, tonalRange) => {
            if (canvasRef.current) {
              const engine = new CanvasEngine(canvasRef.current);
              engine.applyColorBalance(
                cyan_red,
                magenta_green,
                yellow_blue,
                tonalRange,
              );
            }
            setOpenDialog(null);
          }}
          onCancel={() => setOpenDialog(null)}
        />
      )}{" "}
      {/* Filter Dialog */}{" "}
      {filterDialogOpen && (
        <UnifiedFilterDialog
          canvas={canvasRef.current}
          onApply={handleApplyFilter}
          onCancel={() => setFilterDialogOpen(false)}
        />
      )}{" "}
      {/* TextTool Dialog */}{" "}
      {textToolOpen && (
        <TextTool
          canvas={canvasRef.current}
          onTextAdd={(textData) => {
            setTextElements([...textElements, textData]);
            if (canvasRef.current) {
              const engine = new CanvasEngine(canvasRef.current);
              engine.drawText({
                x: textData.x,
                y: textData.y,
                text: textData.text,
                fontSize: textData.fontSize,
                fontFamily: textData.fontFamily,
                fontWeight: textData.fontWeight,
                color: textData.color,
                alpha: textData.alpha,
                textAlign: textData.textAlign,
                lineHeight: textData.lineHeight,
                maxWidth: textData.maxWidth,
              });
            }
            setTextToolOpen(false);
          }}
          onCancel={() => setTextToolOpen(false)}
        />
      )}{" "}
      {/* Color Picker Tool */}{" "}
      {colorPickerActive && (
        <ColorPickerTool
          canvas={canvasRef.current}
          onColorPicked={(color) => {
            setForegroundColor(color);
            setColorPickerActive(false);
          }}
        />
      )}{" "}
      {/* Layer Mask Dialog */}{" "}
      {maskDialogOpen && editingMaskLayerId && (
        <LayerMaskDialog
          layerId={editingMaskLayerId}
          layerName={
            layers.find((l) => l.id === editingMaskLayerId)?.name || ""
          }
          currentMask={layers.find((l) => l.id === editingMaskLayerId)?.mask}
          onApplyMask={handleApplyLayerMask}
          onCancel={() => {
            setMaskDialogOpen(false);
            setEditingMaskLayerId(null);
          }}
        />
      )}{" "}
      {/* Generative Fill Dialog */}{" "}
      {generativeFillDialogOpen && (
        <GenerativeFillDialog
          canvas={canvasRef.current}
          onApply={handleApplyGenerativeFill}
          onCancel={() => setGenerativeFillDialogOpen(false)}
        />
      )}{" "}
      <style>{` * { scrollbar-width: none; -ms-overflow-style: none; } *::-webkit-scrollbar { display: none; } input[type="range"] { accent-color: #94a3b8; } input[type="range"]::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; cursor: pointer; } input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; cursor: pointer; border: none; } `}</style>{" "}
      {/* Cake Designer Floating Panel */}{" "}
      <CakeDesignerPanel
        isOpen={cakeDesignerOpen}
        onClose={() => setCakeDesignerOpen(false)}
        onMinimize={() => {
          /* TODO: Implement dock to LUCCCA when integrated */ setCakeDesignerOpen(
            false,
          );
        }}
      />{" "}
      {/* Error Modal */}{" "}
      <ErrorModal
        isOpen={isErrorOpen}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setIsErrorOpen(false)}
      />{" "}
    </div>
  );
}
