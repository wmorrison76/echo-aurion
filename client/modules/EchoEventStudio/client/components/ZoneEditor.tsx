import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Zone } from "@/lib/zones";
import { makeZoneId } from "@/lib/zones";
interface Props {
  zones: Zone[];
  onChange: (next: Zone[]) => void;
}
export default function ZoneEditor({ zones, onChange }: Props) {
  const [draft, setDraft] = useState<Zone>({
    id: makeZoneId(),
    kind: "rect",
    x: 10,
    y: 10,
    width: 10,
    height: 4,
    label: "Exit",
  });
  const add = () => {
    onChange([...zones, { ...draft, id: makeZoneId() }]);
  };
  const remove = (id: string) => {
    onChange(zones.filter((z) => z.id !== id));
  };
  const update = (id: string, patch: Partial<Zone>) => {
    onChange(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  };
  return (
    <div className="space-y-2">
      {" "}
      <div className="text-sm font-semibold">No-Obstruction Zones</div>{" "}
      <div className="grid grid-cols-5 gap-2 items-end">
        {" "}
        <div className="col-span-2">
          {" "}
          <label className="text-[10px] text-muted-foreground">
            Label
          </label>{" "}
          <Input
            className="h-8"
            value={draft.label || ""}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">
            X(ft)
          </label>{" "}
          <Input
            className="h-8"
            type="number"
            step="0.5"
            value={draft.x}
            onChange={(e) => setDraft({ ...draft, x: Number(e.target.value) })}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">
            Y(ft)
          </label>{" "}
          <Input
            className="h-8"
            type="number"
            step="0.5"
            value={draft.y}
            onChange={(e) => setDraft({ ...draft, y: Number(e.target.value) })}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">Add</label>{" "}
          <Button className="w-full h-8" size="sm" onClick={add}>
            {" "}
            Add{" "}
          </Button>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">
            W(ft)
          </label>{" "}
          <Input
            className="h-8"
            type="number"
            step="0.5"
            value={draft.width}
            onChange={(e) =>
              setDraft({ ...draft, width: Number(e.target.value) })
            }
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="text-[10px] text-muted-foreground">
            H(ft)
          </label>{" "}
          <Input
            className="h-8"
            type="number"
            step="0.5"
            value={draft.height}
            onChange={(e) =>
              setDraft({ ...draft, height: Number(e.target.value) })
            }
          />{" "}
        </div>{" "}
      </div>{" "}
      <Separator />{" "}
      <div className="space-y-2">
        {" "}
        {zones.length === 0 ? (
          <div className="text-xs text-muted-foreground">No zones yet.</div>
        ) : null}{" "}
        {zones.map((z) => (
          <div key={z.id} className="flex items-center gap-2 text-xs">
            {" "}
            <div className="flex-1 truncate">
              {" "}
              {z.label || "Zone"} • center ({z.x},{z.y}) • {z.width}×{z.height}
              {""} ft{" "}
            </div>{" "}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => update(z.id, { x: z.x, y: z.y })}
            >
              {" "}
              Edit{" "}
            </Button>{" "}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove(z.id)}
            >
              {" "}
              Delete{" "}
            </Button>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
