import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Volume2, VolumeX } from "lucide-react";
import { useSceneStore } from "@/store/sceneStore";
export interface OutlinerPanelProps {
  onSelect?: (id: string) => void;
  onIsolate?: (id: string) => void;
}
export function OutlinerPanel({ onSelect, onIsolate }: OutlinerPanelProps) {
  const { objects, selectedId, setSelectedId } = useSceneStore();
  const [search, setSearch] = useState("");
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const filtered = objects.filter((obj) =>
    `${obj.id} ${obj.type}${obj.meta?.equipment || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect?.(id);
  };
  const handleIsolate = (id: string) => {
    setIsolatedId(isolatedId === id ? null : id);
    onIsolate?.(id);
  };
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Outliner</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        <Input
          placeholder="Search objects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />{" "}
        <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/20">
          {" "}
          {filtered.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              {" "}
              No objects found{" "}
            </div>
          ) : (
            filtered.map((obj) => (
              <div
                key={obj.id}
                className={`flex items-center justify-between border rounded px-2 py-1 text-xs cursor-pointer transition-colors ${selectedId === obj.id ? "bg-primary/20 border-primary" : "hover:bg-muted"}`}
                onClick={() => handleSelect(obj.id)}
              >
                {" "}
                <div className="truncate flex-1 min-w-0">
                  {" "}
                  <div className="font-mono text-[10px] truncate">
                    {obj.id}
                  </div>{" "}
                  <div className="text-muted-foreground">{obj.type}</div>{" "}
                </div>{" "}
                <div className="flex gap-1 flex-shrink-0 ml-2">
                  {" "}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIsolate(obj.id);
                    }}
                    title={isolatedId === obj.id ? "Show All" : "Isolate"}
                  >
                    {" "}
                    {isolatedId === obj.id ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 opacity-50" />
                    )}{" "}
                  </Button>{" "}
                </div>{" "}
              </div>
            ))
          )}{" "}
        </div>{" "}
        <div className="text-[10px] text-muted-foreground">
          {" "}
          {filtered.length} of {objects.length} objects{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
