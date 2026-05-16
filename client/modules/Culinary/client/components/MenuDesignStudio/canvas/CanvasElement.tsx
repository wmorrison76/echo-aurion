import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { DesignerElement } from "../hooks";

interface CanvasElementProps {
  element: DesignerElement;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isEditing: boolean;
  isDragging: boolean;
  isResizing: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onUpdateElement: (updates: Partial<DesignerElement>) => void;
  onStartDrag: (clientX: number, clientY: number) => void;
  onStartResize: (handle: string, clientX: number, clientY: number) => void;
  onStartEditingText: () => void;
  onEndEditingText: () => void;
  scale?: number;
}

const RESIZE_HANDLES = ["nw", "ne", "sw", "se", "n", "s", "e", "w"] as const;

// Group renderer - just shows a container with a border
function renderGroupElement(
  element: DesignerElement,
  isSelected: boolean,
  isMultiSelected: boolean,
  scale: number
) {
  return (
    <div
      className={cn(
        "absolute border-2 border-dashed",
        isMultiSelected && "border-purple-500 bg-purple-50/10",
        isSelected && !isMultiSelected && "border-[#c8a97e] bg-amber-50/10",
        !isSelected && "border-gray-400 bg-transparent"
      )}
      style={{
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <div className="absolute -top-6 left-0 text-xs font-medium bg-white dark:bg-gray-900 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded">
        {element.name}
      </div>
    </div>
  );
}

export function CanvasElement({
  element,
  isSelected,
  isMultiSelected,
  isEditing,
  isDragging,
  isResizing,
  onSelect,
  onUpdateElement,
  onStartDrag,
  onStartResize,
  onStartEditingText,
  onEndEditingText,
  scale = 1,
}: CanvasElementProps) {
  const [localText, setLocalText] = useState(element.text || "");
  const elementRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Focus text input when editing
  useEffect(() => {
    if (isEditing && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || isDragging) return;
    e.stopPropagation();
    onSelect(e);
    onStartDrag(e.clientX, e.clientY);
  };

  const handleResizeStart = (
    handle: (typeof RESIZE_HANDLES)[number],
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    onStartResize(handle, e.clientX, e.clientY);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (["heading", "subheading", "body", "menu-item"].includes(element.type)) {
      onSelect(e);
      onStartEditingText();
    }
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setLocalText(e.target.value);
  };

  const handleTextBlur = () => {
    onUpdateElement({ text: localText });
    onEndEditingText();
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setLocalText(element.text || "");
      onEndEditingText();
    } else if (e.key === "Enter" && e.ctrlKey) {
      handleTextBlur();
    }
  };

  const renderContent = () => {
    switch (element.type) {
      case "heading":
      case "subheading":
      case "body":
        return isEditing ? (
          <textarea
            ref={textInputRef as React.Ref<HTMLTextAreaElement>}
            value={localText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="w-full h-full bg-transparent border-2 border-[#c8a97e] p-2 text-inherit font-inherit resize-none overflow-auto"
            style={{ outline: "none", zIndex: 1001, display: "block", minHeight: "100%" }}
            spellCheck="false"
          />
        ) : (
          <div className="w-full h-full overflow-hidden break-words whitespace-normal p-1">{element.text}</div>
        );

      case "menu-item":
        return (
          <div className="flex flex-col gap-1 w-full h-full">
            {isEditing ? (
              <input
                ref={textInputRef as React.Ref<HTMLInputElement>}
                value={localText}
                onChange={handleTextChange}
                onBlur={handleTextBlur}
                onKeyDown={handleTextKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent border-2 border-[#c8a97e] px-2 py-1 text-inherit font-inherit font-semibold"
                style={{ outline: "none", zIndex: 1001, display: "block" }}
                spellCheck="false"
              />
            ) : (
              <div className="font-semibold break-words">{element.text}</div>
            )}
            <div className="text-sm opacity-75 break-words">{element.description}</div>
            {element.price && (
              <div className="text-sm font-semibold">${element.price.toFixed(2)}</div>
            )}
          </div>
        );

      case "image":
        return element.imageUrl ? (
          <img
            src={element.imageUrl}
            alt={element.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
            Image
          </div>
        );

      case "shape":
        return null;

      case "divider":
        return null;

      default:
        return null;
    }
  };

  const baseStyles: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    zIndex: isSelected ? 1000 : isEditing ? 999 : element.zIndex,
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)`,
    fontFamily: element.fontFamily,
    fontSize: (element.fontSize || 16) * (scale || 1),
    fontWeight: element.fontWeight,
    lineHeight: element.lineHeight,
    letterSpacing: element.letterSpacing,
    color: element.color,
    textAlign: element.align,
    textTransform: element.textTransform as any,
    textDecoration: element.textDecoration as any,
  };

  if (element.type === "shape") {
    return (
      <div
        ref={elementRef}
        className={cn(
          "absolute cursor-move transition-shadow",
          isMultiSelected && "ring-2 ring-purple-500 ring-offset-1",
          isSelected && !isMultiSelected && "ring-2 ring-[#c8a97e] ring-offset-1"
        )}
        style={{
          ...baseStyles,
          backgroundColor: element.fill,
          borderColor: element.borderColor,
          borderWidth: element.borderWidth || 0.5,
          borderRadius: element.borderRadius,
          cursor: isSelected ? "move" : "pointer",
          outline: "0.5px solid rgba(0, 0, 0, 0.1)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
        }}
        onClick={onSelect}
        onMouseDown={handleMouseDown}
      >
        {isSelected && (
          <>
            {RESIZE_HANDLES.map((handle) => {
              const handleSize = 8 * scale;
              return (
                <div
                  key={handle}
                  className={cn(
                    "absolute bg-amber-500 border border-white cursor-pointer",
                    handle.includes("n") && "top-[-4px]",
                    handle.includes("s") && "bottom-[-4px]",
                    handle.includes("e") && "right-[-4px]",
                    handle.includes("w") && "left-[-4px]"
                  )}
                  onMouseDown={(e) => handleResizeStart(handle, e)}
                  style={{
                    width: handleSize,
                    height: handleSize,
                    ...(handle.includes("n") && !handle.includes("s") && { top: -handleSize / 2 }),
                    ...(handle.includes("s") && { bottom: -handleSize / 2 }),
                    ...(handle.includes("e") && { right: -handleSize / 2 }),
                    ...(handle.includes("w") && { left: -handleSize / 2 }),
                    ...(handle.includes("e") && handle.includes("w") && { left: "50%", marginLeft: -handleSize / 2 }),
                    ...(!handle.includes("e") && !handle.includes("w") && { left: "50%", marginLeft: -handleSize / 2 }),
                  }}
                />
              );
            })}
          </>
        )}
      </div>
    );
  }

  if (element.type === "group") {
    return (
      <div
        ref={elementRef}
        className={cn(
          "absolute cursor-move transition-shadow",
          isMultiSelected && "ring-2 ring-purple-500 ring-offset-1",
          isSelected && !isMultiSelected && "ring-2 ring-[#c8a97e] ring-offset-1"
        )}
        style={baseStyles}
        onClick={onSelect}
        onMouseDown={handleMouseDown}
      >
        {renderGroupElement(element, isSelected, isMultiSelected, scale)}
        {isSelected && (
          <>
            {RESIZE_HANDLES.map((handle) => {
              const handleSize = 8 * scale;
              return (
                <div
                  key={handle}
                  className={cn(
                    "absolute bg-amber-500 border border-white cursor-pointer",
                    handle.includes("n") && "top-[-4px]",
                    handle.includes("s") && "bottom-[-4px]",
                    handle.includes("e") && "right-[-4px]",
                    handle.includes("w") && "left-[-4px]"
                  )}
                  onMouseDown={(e) => handleResizeStart(handle, e)}
                  style={{
                    width: handleSize,
                    height: handleSize,
                    ...(handle.includes("n") && !handle.includes("s") && { top: -handleSize / 2 }),
                    ...(handle.includes("s") && { bottom: -handleSize / 2 }),
                    ...(handle.includes("e") && { right: -handleSize / 2 }),
                    ...(handle.includes("w") && { left: -handleSize / 2 }),
                    ...(handle.includes("e") && handle.includes("w") && { left: "50%", marginLeft: -handleSize / 2 }),
                    ...(!handle.includes("e") && !handle.includes("w") && { left: "50%", marginLeft: -handleSize / 2 }),
                  }}
                />
              );
            })}
          </>
        )}
      </div>
    );
  }

  if (element.type === "divider") {
    return (
      <div
        ref={elementRef}
        className={cn(
          "absolute transition-shadow",
          isMultiSelected && "ring-2 ring-purple-500",
          isSelected && !isMultiSelected && "ring-2 ring-[#c8a97e]"
        )}
        style={{
          ...baseStyles,
          backgroundColor: element.color,
          height: element.thickness || 2,
          cursor: isSelected ? "move" : "pointer",
        }}
        onClick={onSelect}
        onMouseDown={handleMouseDown}
      />
    );
  }

  return (
    <div
      ref={elementRef}
      className={cn(
        "absolute transition-shadow break-words",
        isMultiSelected && "ring-2 ring-purple-500 ring-offset-1",
        isSelected && !isMultiSelected && "ring-2 ring-[#c8a97e] ring-offset-1",
        isEditing && "ring-2 ring-[#c8a97e]"
      )}
      style={baseStyles}
      onClick={onSelect}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {renderContent()}

      {isSelected && !isEditing && (
        <>
          {/* Selection border and handles */}
          <div className="absolute inset-0 border border-dashed border-[#c8a97e] pointer-events-none" />

          {/* Resize handles */}
          {RESIZE_HANDLES.map((handle) => {
            const handleSize = 8 * scale;
            return (
              <div
                key={handle}
                className={cn(
                  "absolute bg-amber-500 border border-white cursor-pointer transition-opacity hover:opacity-100",
                  handle.includes("n") && "top-[-5px]",
                  handle.includes("s") && "bottom-[-5px]",
                  handle.includes("e") && "right-[-5px]",
                  handle.includes("w") && "left-[-5px]"
                )}
                style={{
                  width: handleSize,
                  height: handleSize,
                  ...(handle.includes("n") && !handle.includes("s") && { top: -handleSize / 2 }),
                  ...(handle.includes("s") && { bottom: -handleSize / 2 }),
                  ...(handle.includes("e") && { right: -handleSize / 2 }),
                  ...(handle.includes("w") && { left: -handleSize / 2 }),
                  ...(!handle.includes("e") && !handle.includes("w") && { left: "50%", marginLeft: -handleSize / 2 }),
                  ...(handle.includes("e") && handle.includes("w") && { display: "none" }),
                }}
                onMouseDown={(e) => handleResizeStart(handle, e)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
