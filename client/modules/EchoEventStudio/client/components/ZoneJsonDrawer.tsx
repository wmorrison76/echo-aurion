import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { serializeZones, deserializeZones, type Zone } from "@/lib/zones";
export default function ZoneJsonDrawer({
  zones,
  onChange,
}: {
  zones: Zone[];
  onChange: (next: Zone[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const openDrawer = () => {
    setText(JSON.stringify(serializeZones(zones), null, 2));
    setError(null);
    setOpen(true);
  };
  const apply = () => {
    try {
      const parsed = JSON.parse(text);
      const next = deserializeZones(parsed);
      onChange(next);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Invalid JSON");
    }
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {" "}
      <SheetTrigger asChild>
        {" "}
        <Button variant="secondary" size="sm" onClick={openDrawer}>
          {" "}
          Zones JSON{" "}
        </Button>{" "}
      </SheetTrigger>{" "}
      <SheetContent side="right" className="w-[480px]">
        {" "}
        <SheetHeader>
          {" "}
          <SheetTitle>Zones JSON</SheetTitle>{" "}
        </SheetHeader>{" "}
        <div className="mt-4 space-y-2">
          {" "}
          <Textarea
            className="min-h-[60vh]"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />{" "}
          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : null}{" "}
          <div className="flex gap-2 justify-end">
            {" "}
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {" "}
              Cancel{" "}
            </Button>{" "}
            <Button onClick={apply}>Apply</Button>{" "}
          </div>{" "}
        </div>{" "}
      </SheetContent>{" "}
    </Sheet>
  );
}
