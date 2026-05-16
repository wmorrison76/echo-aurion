/**
 * Tablet-Optimized Menu Design View
 *
 * Optimized for tablet touch interactions
 */

import React, { useState } from "react";
const { useState } = React;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTouchGestures } from "@/lib/touch-gestures";
import { ZoomIn, ZoomOut, RotateCw, Save, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/glass";

interface TabletMenuDesignProps {
  menu: {
    id: string;
    name: string;
    sections: Array<{
      id: string;
      name: string;
      items: Array<{
        id: string;
        name: string;
        price: number;
        description?: string;
      }>;
    }>;
  };
  onSave?: () => void;
}

export function TabletMenuDesign({ menu, onSave }: TabletMenuDesignProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeSection, setActiveSection] = useState(0);

  const gestures = useTouchGestures({
    onSwipeLeft: () => {
      if (activeSection < menu.sections.length - 1) {
        setActiveSection((prev) => prev + 1);
      }
    },
    onSwipeRight: () => {
      if (activeSection > 0) {
        setActiveSection((prev) => prev - 1);
      }
    },
  });

  return (
    <div className="w-full h-full flex flex-col bg-background" {...gestures}>
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-border p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{menu.name}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.1))}
            className="h-12 w-12"
          >
            <ZoomOut className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoomLevel(1)}
            className="h-12 w-12"
          >
            <RotateCw className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoomLevel((prev) => Math.min(2, prev + 0.1))}
            className="h-12 w-12"
          >
            <ZoomIn className="h-6 w-6" />
          </Button>
          {onSave && (
            <Button onClick={onSave} className="h-12 px-6">
              <Save className="h-5 w-5 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex-shrink-0 border-b border-border p-2 overflow-x-auto">
        <div className="flex gap-2">
          {menu.sections.map((section, idx) => (
            <Button
              key={section.id}
              variant={idx === activeSection ? "default" : "outline"}
              onClick={() => setActiveSection(idx)}
              className="h-12 px-6 text-base whitespace-nowrap"
            >
              {section.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
          }}
          className="grid grid-cols-2 gap-4"
        >
          {menu.sections[activeSection]?.items.map((item) => (
            <Card key={item.id} className="touch-manipulation min-h-[200px]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {item.name}
                  </h3>
                  <span className="text-xl font-bold text-primary">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-base text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
