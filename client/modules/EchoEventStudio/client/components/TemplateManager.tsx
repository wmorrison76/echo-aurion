import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Item } from "@/pages/Planner";
const KEY = "planner-templates";
function loadAll(): Record<string, Item[]> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveAll(map: Record<string, Item[]>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}
export default function TemplateManager({
  items,
  onLoad,
}: {
  items: Item[];
  onLoad: (next: Item[]) => void;
}) {
  const [name, setName] = useState("My Preset");
  const [templates, setTemplates] = useState<Record<string, Item[]>>(loadAll());
  const save = () => {
    const next = {
      ...templates,
      [name]: items.map((i) => ({
        ...i,
        id: Math.random().toString(36).slice(2, 9),
      })),
    };
    setTemplates(next);
    saveAll(next);
  };
  const del = (key: string) => {
    const next = { ...templates };
    delete next[key];
    setTemplates(next);
    saveAll(next);
  };
  const keys = Object.keys(templates).sort();
  return (
    <div className="space-y-2">
      {" "}
      <div className="text-sm font-semibold">Template Manager</div>{" "}
      <div className="flex gap-2 items-end">
        {" "}
        <div className="flex-1">
          {" "}
          <label className="text-[10px] text-muted-foreground">Name</label>{" "}
          <Input
            className="h-8"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />{" "}
        </div>{" "}
        <Button size="sm" onClick={save}>
          {" "}
          Save{" "}
        </Button>{" "}
      </div>{" "}
      <Separator />{" "}
      <div className="space-y-1 text-xs">
        {" "}
        {keys.length === 0 ? (
          <div className="text-muted-foreground">No presets yet.</div>
        ) : null}{" "}
        {keys.map((k) => (
          <div key={k} className="flex items-center gap-2">
            {" "}
            <div className="flex-1 truncate">{k}</div>{" "}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onLoad(templates[k])}
            >
              {" "}
              Load{" "}
            </Button>{" "}
            <Button size="sm" variant="destructive" onClick={() => del(k)}>
              {" "}
              Delete{" "}
            </Button>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
