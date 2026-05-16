// src/modules/pastry/cake/components/WraparoundDecorationTool.jsx

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const WraparoundDecorationTool = ({ onApply }) => {
  const [imageURL, setImageURL] = useState("");
  const [opacity, setOpacity] = useState(1);
  const [wrapType, setWrapType] = useState("full");
  const [isEdible, setIsEdible] = useState(true);

  const handleApply = () => {
    onApply({
      imageURL,
      opacity,
      wrapType,
      isEdible,
    });
  };

  return (
    <Card className="p-4 border border-indigo-400 bg-indigo-50 space-y-4">
      <h3 className="text-sm font-semibold text-indigo-800">
        Wraparound Decoration (Transparent PNG)
      </h3>

      <Input
        placeholder="Paste PNG URL or upload path"
        value={imageURL}
        onChange={(e) => setImageURL(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Button
          variant={wrapType === "full" ? "default" : "outline"}
          onClick={() => setWrapType("full")}
        >
          Full Wrap
        </Button>
        <Button
          variant={wrapType === "front" ? "default" : "outline"}
          onClick={() => setWrapType("front")}
        >
          Front-Facing Only
        </Button>
      </div>

      <div className="text-xs space-y-2">
        <label className="block">
          Opacity: {Math.round(opacity * 100)}%
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full"
          />
        </label>

        <label className="block">
          <input
            type="checkbox"
            checked={isEdible}
            onChange={() => setIsEdible((prev) => !prev)}
          />{" "}
          Decoration is edible
        </label>
      </div>

      <Button onClick={handleApply}>Apply Decoration</Button>
    </Card>
  );
};

export default WraparoundDecorationTool;
