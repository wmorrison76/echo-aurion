import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import LayoutPanel from "@/components/LayoutPanel";
import QuickActionStack from "@/components/QuickActionStack";
import ProspectsManagement from "@/pages/ProspectsManagement";
interface LuccCAFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  page?:
    | "prospects"
    | "events"
    | "beo"
    | "menus"
    | "calendar"
    | "analytics"
    | "admin"
    | "dashboard";
  children?: React.ReactNode;
  showQuickActions?: boolean;
}
const pageComponents: Record<string, React.ComponentType> = {
  prospects: ProspectsManagement, // Add other pages as needed
};
export default function LuccCAFloatingPanel({
  isOpen,
  onClose,
  page = "prospects",
  children,
  showQuickActions = true,
}: LuccCAFloatingPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 920,
    y: 20,
  });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("input")
    ) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newX = Math.max(
      0,
      Math.min(e.clientX - dragStart.x, window.innerWidth - 900),
    );
    const newY = Math.max(
      0,
      Math.min(e.clientY - dragStart.y, window.innerHeight - 900),
    );
    setPosition({ x: newX, y: newY });
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  if (!isOpen) return null;
  const PageComponent = pageComponents[page];
  return (
    <div
      className={cn(
        "glass-panel fixed z-50 rounded-2xl border",
        isDragging && "cursor-grabbing",
      )}
      style={{
        width: "900px",
        height: "900px",
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: isDragging ? "none" : "auto",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {" "}
      {/* Header Bar - Draggable */}{" "}
      <div
        className="glass-panel flex items-center justify-between gap-2 border-b rounded-t-2xl px-4 py-3"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            {" "}
            <svg
              className="h-4 w-4 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              {" "}
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />{" "}
            </svg>{" "}
          </div>{" "}
          <span className="text-sm font-semibold">CRM Panel</span>{" "}
        </div>{" "}
        <button
          onClick={onClose}
          className="p-1 hover:bg-accent rounded-md transition-colors flex-shrink-0"
          title="Close panel"
        >
          {" "}
          <X className="h-5 w-5" />{" "}
        </button>{" "}
      </div>{" "}
      {/* Content Area */}{" "}
      <div className="h-[calc(900px-60px)] overflow-hidden bg-background relative">
        {" "}
        <LayoutPanel>
          {" "}
          {PageComponent ? (
            <PageComponent />
          ) : children ? (
            children
          ) : (
            <div className="flex items-center justify-center h-full">
              {" "}
              <p className="text-muted-foreground">No content loaded</p>{" "}
            </div>
          )}{" "}
        </LayoutPanel>{" "}
        {/* Quick Action Stack - Bottom Right */}{" "}
        {showQuickActions && (
          <div className="absolute bottom-4 right-4 z-50">
            {" "}
            <QuickActionStack position="bottom-right" />{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
