import React, { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/glass";
import type { ShapeElement } from "./types";
import { v4 as uuidv4 } from "uuid";
interface Shape {
  id: string;
  name: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
}
interface ShapesLibraryProps {
  onShapeInsert: (shape: ShapeElement) => void;
  userId: string;
}
const SHAPES: Shape[] = [
  {
    id: "rectangle",
    name: "Rectangle",
    icon: "▭",
    defaultWidth: 120,
    defaultHeight: 80,
  },
  {
    id: "circle",
    name: "Circle",
    icon: "◯",
    defaultWidth: 100,
    defaultHeight: 100,
  },
  {
    id: "triangle",
    name: "Triangle",
    icon: "△",
    defaultWidth: 100,
    defaultHeight: 100,
  },
  {
    id: "diamond",
    name: "Diamond",
    icon: "◇",
    defaultWidth: 100,
    defaultHeight: 100,
  },
  { id: "line", name: "Line", icon: "─", defaultWidth: 200, defaultHeight: 2 },
  {
    id: "arrow",
    name: "Arrow",
    icon: "→",
    defaultWidth: 200,
    defaultHeight: 40,
  },
];
export const ShapesLibrary: React.FC<ShapesLibraryProps> = ({
  onShapeInsert,
  userId,
}) => {
  const handleDragStart = (shape: Shape) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/x-shape",
      JSON.stringify({ shapeType: shape.id }),
    );
  };
  const handleQuickInsert = (shape: Shape) => {
    const newShape: ShapeElement = {
      id: uuidv4(),
      type: shape.id as any,
      x: 100,
      y: 100,
      width: shape.defaultWidth,
      height: shape.defaultHeight,
      color: "#3B82F6",
      fillColor: "transparent",
      lineWidth: 2,
      opacity: 1,
      userId,
      timestamp: Date.now(),
    };
    onShapeInsert(newShape);
  };
  return (
    <DropdownMenu>
      {" "}
      <DropdownMenuTrigger asChild>
        {" "}
        <button className="w-full p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-between border border-border/20 transition-colors">
          {" "}
          <span className="flex items-center gap-2">
            {" "}
            <Plus size={14} /> Insert Shape{" "}
          </span>{" "}
          <ChevronDown size={14} />{" "}
        </button>{" "}
      </DropdownMenuTrigger>{" "}
      <DropdownMenuContent className="w-56 p-3">
        {" "}
        <div className="space-y-2">
          {" "}
          {SHAPES.map((shape) => (
            <div
              key={shape.id}
              draggable
              onDragStart={handleDragStart(shape)}
              onClick={() => handleQuickInsert(shape)}
              className={cn(
                "flex items-center gap-3 p-2 rounded cursor-move transition-colors",
                "bg-secondary/40 hover:bg-secondary/60 border border-border/20",
              )}
              title={`Drag to canvas or click to insert at (100, 100)`}
            >
              {" "}
              <span className="text-xl">{shape.icon}</span>{" "}
              <div className="flex-1">
                {" "}
                <p className="text-xs font-semibold text-foreground">
                  {" "}
                  {shape.name}{" "}
                </p>{" "}
                <p className="text-xs text-foreground/50">
                  {" "}
                  {shape.defaultWidth}×{shape.defaultHeight}px{" "}
                </p>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="text-xs text-foreground/50 mt-2 pt-2 border-t border-border/20">
          {" "}
          💡 Drag shapes to canvas or click to insert{" "}
        </div>{" "}
      </DropdownMenuContent>{" "}
    </DropdownMenu>
  );
};
