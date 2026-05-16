import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';

interface MoveablePanelProps {
  children: React.ReactNode;
  className?: string;
  isDraggable?: boolean;
  initialPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export default function MoveablePanel({
  children,
  className,
  isDraggable = true,
  initialPosition = { x: 0, y: 0 },
  onPositionChange,
}: MoveablePanelProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return;

    // Check if the click is on an interactive element (button, link, etc.)
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, a, [role="button"], [data-state]');

    if (isInteractive) {
      // Don't start dragging if clicking on interactive elements
      return;
    }

    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate offset from mouse to panel's current screen position
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    setIsDragging(true);
    e.preventDefault();
  }, [isDraggable]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isDraggable) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const parentElement = dragRef.current?.parentElement;
      if (!parentElement) return;

      const parentRect = parentElement.getBoundingClientRect();

      // Calculate new position relative to parent container
      let newX = e.clientX - parentRect.left - offsetRef.current.x;
      let newY = e.clientY - parentRect.top - offsetRef.current.y;

      // Constrain to parent bounds
      if (dragRef.current) {
        const panelRect = dragRef.current.getBoundingClientRect();
        const maxX = parentRect.width - panelRect.width;
        const maxY = parentRect.height - panelRect.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
      }

      const newPosition = { x: newX, y: newY };
      setPosition(newPosition);
      onPositionChange?.(newPosition);
    });
  }, [isDragging, isDraggable, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={dragRef}
      className={cn(
        'moveable-panel panel-glow relative rounded-xl',
        isDraggable && 'select-none',
        isDragging && 'z-50 cursor-move',
        className
      )}
      style={{
        ...(!isDragging && {
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'auto',
        }),
        ...(isDragging && {
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: 'none',
          willChange: 'transform',
          filter: 'brightness(1.1)',
          zIndex: 1000,
        })
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle indicator */}
      {isDraggable && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 bg-muted-foreground/30 rounded-full"
              />
            ))}
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}
