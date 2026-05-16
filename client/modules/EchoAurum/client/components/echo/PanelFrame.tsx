import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Minimize2, Maximize2 } from "lucide-react";
interface PanelFrameProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  className?: string;
  [key: string]: any;
}
export const PanelFrame: React.FC<PanelFrameProps> = ({
  title,
  icon,
  children,
  onClose,
  onMinimize,
  className,
  ...props
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg",
        className,
      )}
      {...props}
    >
      {" "}
      {/* Header Chrome */}{" "}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          {icon && <span className="text-lg">{icon}</span>}{" "}
          <h2 className="text-sm font-semibold text-white">{title}</h2>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          {onMinimize && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsMinimized(!isMinimized);
                onMinimize?.();
              }}
              className="h-6 w-6 p-0"
            >
              {" "}
              {isMinimized ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5" />
              )}{" "}
            </Button>
          )}{" "}
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              {" "}
              <X className="h-3.5 w-3.5" />{" "}
            </Button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      {!isMinimized && (
        <div className="flex-1 overflow-auto">{children}</div>
      )}{" "}
    </div>
  );
};
