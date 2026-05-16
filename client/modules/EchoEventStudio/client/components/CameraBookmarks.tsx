import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Save } from "lucide-react";
export interface CameraBookmarksProps {
  onSave: (slot: number) => void;
  onJump: (slot: number) => void;
  slots?: number;
  saved?: number[];
}
export function CameraBookmarks({
  onSave,
  onJump,
  slots = 4,
  saved = [],
}: CameraBookmarksProps) {
  const slotArray = Array.from({ length: slots }, (_, i) => i + 1);
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm flex items-center gap-2">
          {" "}
          <Bookmark className="h-4 w-4" /> Camera Bookmarks{" "}
        </CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          {slotArray.map((slot) => {
            const hasSaved = saved.includes(slot);
            return (
              <div key={slot} className="flex gap-1">
                {" "}
                <Button
                  onClick={() => onSave(slot)}
                  variant={hasSaved ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs flex-1 gap-1"
                  title={`Save camera position to slot ${slot}`}
                >
                  {" "}
                  <Save className="h-3 w-3" /> S{slot}{" "}
                </Button>{" "}
                <Button
                  onClick={() => onJump(slot)}
                  disabled={!hasSaved}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  title={`Load camera from slot ${slot}`}
                >
                  {" "}
                  Go {slot}{" "}
                </Button>{" "}
              </div>
            );
          })}{" "}
        </div>{" "}
        <div className="text-[10px] text-muted-foreground border-t pt-2">
          {" "}
          Save up to {slots} camera positions. Blue = saved.{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
