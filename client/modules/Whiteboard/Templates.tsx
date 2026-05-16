import React, { useState } from "react";
import { ShapeElement, TextElement, DrawingStroke, CanvasState } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import {
  Layout,
  Grid3x3,
  GitBranch,
  MapPin,
  Calendar,
  Network,
  LayoutGrid,
  Lightbulb,
  ListTodo,
  Map,
} from "lucide-react";
import type { StickyNote } from "./types";

interface TemplatesProps {
  onApplyTemplate: (canvasUpdate: Partial<CanvasState>) => void;
  currentZoom: number;
  viewportX: number;
  viewportY: number;
}

interface Template {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  generate: (zoom: number, vpX: number, vpY: number) => Partial<CanvasState>;
}

const KANBAN_TEMPLATE = (
  zoom: number,
  vpX: number,
  vpY: number,
): Partial<CanvasState> => {
  const baseX = -vpX / zoom + 50;
  const baseY = -vpY / zoom + 50;
  const colWidth = 280;
  const colHeight = 600;
  const cols = ["To Do", "In Progress", "In Review", "Done"];
  const cardHeight = 100;
  const cardWidth = 240;
  const shapes: ShapeElement[] = [];
  const texts: TextElement[] = [];

  cols.forEach((col, colIdx) => {
    const colX = baseX + colIdx * colWidth;
    // Column header background
    shapes.push({
      id: uuidv4(),
      type: "rectangle",
      x: colX,
      y: baseY,
      width: colWidth,
      height: 50,
      color: "#e5e7eb",
      fillColor: "#e5e7eb",
      lineWidth: 2,
      opacity: 1,
      timestamp: Date.now(),
    });
    // Column header text
    texts.push({
      id: uuidv4(),
      text: col,
      x: colX + 20,
      y: baseY + 15,
      fontSize: 16,
      color: "#1f2937",
      fontFamily: "Arial",
      timestamp: Date.now(),
    });
    // Column background
    shapes.push({
      id: uuidv4(),
      type: "rectangle",
      x: colX,
      y: baseY + 50,
      width: colWidth,
      height: colHeight,
      color: "#f3f4f6",
      fillColor: "#f3f4f6",
      lineWidth: 1,
      opacity: 0.5,
      timestamp: Date.now(),
    });

    // Sample cards
    for (let i = 0; i < 3; i++) {
      const cardY = baseY + 60 + i * (cardHeight + 10);
      shapes.push({
        id: uuidv4(),
        type: "rectangle",
        x: colX + 15,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        color: "#ffffff",
        fillColor: "#ffffff",
        lineWidth: 1,
        opacity: 1,
        timestamp: Date.now(),
      });
      texts.push({
        id: uuidv4(),
        text: `Task ${i + 1}`,
        x: colX + 25,
        y: cardY + 10,
        fontSize: 13,
        color: "#374151",
        fontFamily: "Arial",
        timestamp: Date.now(),
      });
    }
  });

  return {
    shapes,
    texts,
    strokes: [],
    stickyNotes: [],
    panelEmbeds: [],
    connectors: [],
    comments: [],
    documents: [],
    images: [],
    pdfs: [],
    figmaEmbeds: [],
    jiraEmbeds: [],
    dataSourceEmbeds: [],
    googleSheetsEmbeds: [],
    crmEmbeds: [],
  };
};

const FLOWCHART_TEMPLATE = (
  zoom: number,
  vpX: number,
  vpY: number,
): Partial<CanvasState> => {
  const baseX = -vpX / zoom + 100;
  const baseY = -vpY / zoom + 100;
  const shapes: ShapeElement[] = [];
  const texts: TextElement[] = [];

  // Start node
  shapes.push({
    id: uuidv4(),
    type: "circle",
    x: baseX + 200,
    y: baseY,
    width: 80,
    height: 80,
    color: "#10b981",
    fillColor: "#10b981",
    lineWidth: 2,
    opacity: 1,
    timestamp: Date.now(),
  });
  texts.push({
    id: uuidv4(),
    text: "Start",
    x: baseX + 235,
    y: baseY + 35,
    fontSize: 14,
    color: "#ffffff",
    fontFamily: "Arial",
    timestamp: Date.now(),
  });

  // Decision node
  shapes.push({
    id: uuidv4(),
    type: "diamond",
    x: baseX + 150,
    y: baseY + 150,
    width: 180,
    height: 120,
    color: "#f59e0b",
    fillColor: "#f59e0b",
    lineWidth: 2,
    opacity: 1,
    timestamp: Date.now(),
  });
  texts.push({
    id: uuidv4(),
    text: "Condition?",
    x: baseX + 230,
    y: baseY + 205,
    fontSize: 13,
    color: "#ffffff",
    fontFamily: "Arial",
    timestamp: Date.now(),
  });

  // Process node left
  shapes.push({
    id: uuidv4(),
    type: "rectangle",
    x: baseX + 30,
    y: baseY + 320,
    width: 140,
    height: 80,
    color: "#3b82f6",
    fillColor: "#3b82f6",
    lineWidth: 2,
    opacity: 1,
    timestamp: Date.now(),
  });
  texts.push({
    id: uuidv4(),
    text: "Process A",
    x: baseX + 70,
    y: baseY + 360,
    fontSize: 13,
    color: "#ffffff",
    fontFamily: "Arial",
    timestamp: Date.now(),
  });

  // Process node right
  shapes.push({
    id: uuidv4(),
    type: "rectangle",
    x: baseX + 270,
    y: baseY + 320,
    width: 140,
    height: 80,
    color: "#3b82f6",
    fillColor: "#3b82f6",
    lineWidth: 2,
    opacity: 1,
    timestamp: Date.now(),
  });
  texts.push({
    id: uuidv4(),
    text: "Process B",
    x: baseX + 310,
    y: baseY + 360,
    fontSize: 13,
    color: "#ffffff",
    fontFamily: "Arial",
    timestamp: Date.now(),
  });

  return {
    shapes,
    texts,
    strokes: [],
    stickyNotes: [],
    panelEmbeds: [],
    connectors: [],
    comments: [],
    documents: [],
    images: [],
    pdfs: [],
    figmaEmbeds: [],
    jiraEmbeds: [],
    dataSourceEmbeds: [],
    googleSheetsEmbeds: [],
    crmEmbeds: [],
  };
};

const JOURNEY_MAP_TEMPLATE = (
  zoom: number,
  vpX: number,
  vpY: number,
): Partial<CanvasState> => {
  const baseX = -vpX / zoom + 50;
  const baseY = -vpY / zoom + 100;
  const stageWidth = 200;
  const stages = [
    "Awareness",
    "Consideration",
    "Decision",
    "Onboarding",
    "Retention",
  ];
  const shapes: ShapeElement[] = [];
  const texts: TextElement[] = [];

  // Timeline
  shapes.push({
    id: uuidv4(),
    type: "line",
    x: baseX + 50,
    y: baseY + 250,
    width: 1100,
    height: 0,
    color: "#9ca3af",
    lineWidth: 3,
    opacity: 0.5,
    timestamp: Date.now(),
  });

  stages.forEach((stage, idx) => {
    const stageX = baseX + 100 + idx * stageWidth;
    // Timeline node
    shapes.push({
      id: uuidv4(),
      type: "circle",
      x: stageX - 15,
      y: baseY + 235,
      width: 30,
      height: 30,
      color: "#8b5cf6",
      fillColor: "#8b5cf6",
      lineWidth: 2,
      opacity: 1,
      timestamp: Date.now(),
    });
    // Stage label
    texts.push({
      id: uuidv4(),
      text: stage,
      x: stageX - 50,
      y: baseY + 270,
      fontSize: 13,
      color: "#374151",
      fontFamily: "Arial",
      timestamp: Date.now(),
    });
    // Emotion curve (sample)
    shapes.push({
      id: uuidv4(),
      type: "rectangle",
      x: stageX - 40,
      y: baseY + 330,
      width: 80,
      height: 100,
      color: "transparent",
      lineWidth: 1,
      opacity: 0.3,
      timestamp: Date.now(),
    });
    texts.push({
      id: uuidv4(),
      text: "Touch Points",
      x: stageX - 35,
      y: baseY + 380,
      fontSize: 11,
      color: "#6b7280",
      fontFamily: "Arial",
      timestamp: Date.now(),
    });
  });

  return {
    shapes,
    texts,
    strokes: [],
    stickyNotes: [],
    panelEmbeds: [],
    connectors: [],
    comments: [],
    documents: [],
    images: [],
    pdfs: [],
    figmaEmbeds: [],
    jiraEmbeds: [],
    dataSourceEmbeds: [],
    googleSheetsEmbeds: [],
    crmEmbeds: [],
  };
};

const GANTT_TEMPLATE = (
  zoom: number,
  vpX: number,
  vpY: number,
): Partial<CanvasState> => {
  const baseX = -vpX / zoom + 80;
  const baseY = -vpY / zoom + 60;
  const rowH = 44;
  const dayWidth = 36;
  const headerH = 40;
  const shapes: ShapeElement[] = [];
  const texts: TextElement[] = [];

  // Timeline header (days 1–14)
  shapes.push({
    id: uuidv4(),
    type: "rectangle",
    x: baseX + 180,
    y: baseY,
    width: 14 * dayWidth,
    height: headerH,
    color: "#e5e7eb",
    fillColor: "#f3f4f6",
    lineWidth: 1,
    opacity: 1,
    timestamp: Date.now(),
  });
  for (let d = 1; d <= 14; d++) {
    texts.push({
      id: uuidv4(),
      text: `${d}`,
      x: baseX + 180 + (d - 1) * dayWidth + dayWidth / 2 - 4,
      y: baseY + 12,
      fontSize: 11,
      color: "#374151",
      fontFamily: "Arial",
      timestamp: Date.now(),
    });
  }
  texts.push({
    id: uuidv4(),
    text: "Task",
    x: baseX + 10,
    y: baseY + 12,
    fontSize: 12,
    color: "#1f2937",
    fontFamily: "Arial",
    timestamp: Date.now(),
  });

  // Task rows with horizontal bars
  const tasks: { name: string; start: number; duration: number }[] = [
    { name: "Research", start: 1, duration: 3 },
    { name: "Design", start: 3, duration: 4 },
    { name: "Development", start: 5, duration: 5 },
    { name: "Testing", start: 9, duration: 3 },
    { name: "Launch", start: 12, duration: 2 },
  ];
  tasks.forEach((task, i) => {
    const y = baseY + headerH + 8 + i * rowH;
    texts.push({
      id: uuidv4(),
      text: task.name,
      x: baseX + 10,
      y: y + 8,
      fontSize: 12,
      color: "#374151",
      fontFamily: "Arial",
      timestamp: Date.now(),
    });
    const barX = baseX + 180 + (task.start - 1) * dayWidth;
    const barW = task.duration * dayWidth - 4;
    shapes.push({
      id: uuidv4(),
      type: "rectangle",
      x: barX,
      y: y,
      width: barW,
      height: 24,
      color: "#3b82f6",
      fillColor: "#3b82f6",
      lineWidth: 1,
      opacity: 1,
      timestamp: Date.now(),
    });
  });

  return {
    shapes,
    texts,
    strokes: [],
    stickyNotes: [],
    panelEmbeds: [],
    connectors: [],
    comments: [],
    documents: [],
    images: [],
    pdfs: [],
    figmaEmbeds: [],
    jiraEmbeds: [],
    dataSourceEmbeds: [],
    googleSheetsEmbeds: [],
    crmEmbeds: [],
  };
};

const HIERARCHY_TEMPLATE = (
  zoom: number,
  vpX: number,
  vpY: number,
): Partial<CanvasState> => {
  const baseX = -vpX / zoom + 120;
  const baseY = -vpY / zoom + 80;
  const boxW = 140;
  const boxH = 56;
  const vGap = 90;
  const hGap = 200;
  const shapes: ShapeElement[] = [];
  const texts: TextElement[] = [];

  // Root
  shapes.push({
    id: uuidv4(),
    type: "rectangle",
    x: baseX + 280,
    y: baseY,
    width: boxW,
    height: boxH,
    color: "#1e40af",
    fillColor: "#3b82f6",
    lineWidth: 2,
    opacity: 1,
    timestamp: Date.now(),
  });
  texts.push({
    id: uuidv4(),
    text: "CEO",
    x: baseX + 320,
    y: baseY + 18,
    fontSize: 14,
    color: "#fff",
    fontFamily: "Arial",
    timestamp: Date.now(),
  });

  // Level 2
  ["CTO", "COO", "CFO"].forEach((label, i) => {
    const x = baseX + 120 + i * (boxW + hGap);
    const y = baseY + boxH + vGap;
    shapes.push({
      id: uuidv4(),
      type: "rectangle",
      x,
      y,
      width: boxW,
      height: boxH,
      color: "#1e3a8a",
      fillColor: "#60a5fa",
      lineWidth: 1,
      opacity: 1,
      timestamp: Date.now(),
    });
    texts.push({
      id: uuidv4(),
      text: label,
      x: x + 50,
      y: y + 18,
      fontSize: 13,
      color: "#1f2937",
      fontFamily: "Arial",
      timestamp: Date.now(),
    });
    // Connector line to root
    const rootCx = baseX + 280 + boxW / 2;
    const rootBottom = baseY + boxH;
    const childCx = x + boxW / 2;
    shapes.push({
      id: uuidv4(),
      type: "line",
      x: rootCx,
      y: rootBottom,
      width: childCx - rootCx,
      height: vGap,
      color: "#94a3b8",
      lineWidth: 1,
      opacity: 0.8,
      timestamp: Date.now(),
    });
  });

  return {
    shapes,
    texts,
    strokes: [],
    stickyNotes: [],
    panelEmbeds: [],
    connectors: [],
    comments: [],
    documents: [],
    images: [],
    pdfs: [],
    figmaEmbeds: [],
    jiraEmbeds: [],
    dataSourceEmbeds: [],
    googleSheetsEmbeds: [],
    crmEmbeds: [],
  };
};

const TEMPLATES: Template[] = [
  {
    id: "kanban",
    name: "Kanban Board",
    icon: <Grid3x3 size={20} />,
    description: "4-column Kanban board (To Do, In Progress, Review, Done)",
    generate: KANBAN_TEMPLATE,
  },
  {
    id: "flowchart",
    name: "Flowchart",
    icon: <GitBranch size={20} />,
    description: "Decision tree with process nodes",
    generate: FLOWCHART_TEMPLATE,
  },
  {
    id: "journey-map",
    name: "Journey Map",
    icon: <MapPin size={20} />,
    description: "Customer journey map with 5 stages",
    generate: JOURNEY_MAP_TEMPLATE,
  },
  {
    id: "gantt",
    name: "Gantt Chart",
    icon: <Calendar size={20} />,
    description: "Timeline with tasks as horizontal bars and date axis",
    generate: GANTT_TEMPLATE,
  },
  {
    id: "hierarchy",
    name: "Org Chart",
    icon: <Network size={20} />,
    description: "Hierarchy / org chart with nodes and connectors",
    generate: HIERARCHY_TEMPLATE,
  },
];

export const Templates: React.FC<TemplatesProps> = ({
  onApplyTemplate,
  currentZoom,
  viewportX,
  viewportY,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleApplyTemplate = (template: Template) => {
    const update = template.generate(currentZoom, viewportX, viewportY);
    onApplyTemplate(update);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 rounded-lg border-blue-400/30 hover:border-blue-400",
          "text-primary dark:text-blue-400",
        )}
      >
        <Layout size={16} /> Templates
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background dark:bg-slate-800",
        "border border-slate-200 dark:border-border rounded-lg",
        "shadow-2xl p-6 z-50 max-w-md w-96",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground dark:text-white">
          Templates
        </h3>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          ✕
        </Button>
      </div>
      <div className="space-y-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleApplyTemplate(template)}
            className={cn(
              "w-full p-4 rounded-lg border-2 border-slate-200 dark:border-slate-600",
              "hover:border-blue-500 dark:hover:border-blue-400",
              "hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors",
              "text-left group",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="text-primary dark:text-blue-400 mt-1">
                {template.icon}
              </div>
              <div>
                <p className="font-semibold text-foreground dark:text-white">
                  {template.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {template.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Templates;
