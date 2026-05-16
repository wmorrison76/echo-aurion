// src/modules/pastry/cake/components/LayerBlock.jsx
import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, Edit3 } from "lucide-react";

export const LayerBlock = ({ layer, onUpdate, onRemove, isSelected, onSelect }) => {
  return (
    <Card
      onClick={onSelect}
      className={`p-3 mb-2 border-2 rounded-lg cursor-pointer ${
        isSelected ? "border-emerald-500 bg-white" : "border-slate-300 bg-slate-50"
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="font-medium capitalize text-sm text-gray-700">
          {layer.type === "cake" && "🍰 Cake Layer"}
          {layer.type === "filling" && "🥄 Filling"}
          {layer.type === "support" && "📐 Support"}
        </div>
        <div className="flex gap-2">
          <Edit3 size={16} className="text-blue-500" />
          <Trash2
            size={16}
            className="text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-600">
        <Input
          placeholder="Flavor / Filling"
          value={layer.flavor || layer.filling || ""}
          onChange={(e) =>
            onUpdate({
              flavor: layer.type === "cake" ? e.target.value : undefined,
              filling: layer.type === "filling" ? e.target.value : undefined,
            })
          }
        />
        <Input
          placeholder="Notes"
          value={layer.notes || ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
        />
      </div>

      {layer.decoration && (
        <div className="mt-2 text-xs italic text-emerald-700">
          🎨 Decoration: {layer.decoration}
        </div>
      )}
    </Card>
  );
};

export default LayerBlock;
