import {
  Paintbrush,
  Pencil,
  Eraser,
  Copy,
  Droplet,
  Droplets,
  Wind,
  Zap,
} from "lucide-react";
import type { ToolType } from "../components/editor/CanvasEngine";

export type ToolDefinition = {
  id: ToolType;
  name: string;
  shortcut?: string;
  icon: typeof Paintbrush;
  category: string;
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: "brush",
    name: "Brush",
    shortcut: "B",
    icon: Paintbrush,
    category: "Paint",
  },
  {
    id: "pencil",
    name: "Pencil",
    shortcut: "P",
    icon: Pencil,
    category: "Paint",
  },
  {
    id: "eraser",
    name: "Eraser",
    shortcut: "E",
    icon: Eraser,
    category: "Paint",
  },
  {
    id: "clone-stamp",
    name: "Clone Stamp",
    shortcut: "S",
    icon: Copy,
    category: "Retouch",
  },
  {
    id: "bucket-fill",
    name: "Bucket Fill",
    shortcut: "G",
    icon: Droplets,
    category: "Fill",
  },
  {
    id: "gradient",
    name: "Gradient",
    shortcut: "Shift+G",
    icon: Droplet,
    category: "Fill",
  },
  {
    id: "smudge",
    name: "Smudge",
    shortcut: "R",
    icon: Wind,
    category: "Retouch",
  },
  {
    id: "blur-sharpen",
    name: "Blur/Sharpen",
    shortcut: "K",
    icon: Zap,
    category: "Retouch",
  },
];

export const TOOL_CATEGORIES = [
  {
    name: "Paint",
    tools: TOOL_DEFINITIONS.filter((tool) => tool.category === "Paint"),
  },
  {
    name: "Fill",
    tools: TOOL_DEFINITIONS.filter((tool) => tool.category === "Fill"),
  },
  {
    name: "Retouch",
    tools: TOOL_DEFINITIONS.filter((tool) => tool.category === "Retouch"),
  },
];
