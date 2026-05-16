import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Store, id } from "@/lib/store";
import type { InventoryItem, CountSession } from "@shared/inventory";
export function CountDialog({
  open,
  onOpenChange,
  outletId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  outletId: string;
}) {
  const all = useMemo(
    () => Store.listItems().filter((i) => i.outletId === outletId),
    [open, outletId],
  );
  const [q, setQ] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase();
    return all
      .filter((i) => !s || i.name.toLowerCase().includes(s))
      .slice(0, 100);
  }, [q, all]);
  const post = () => {
    const lines = Object.entries(qty)
      .filter(([, v]) => (v || 0) > 0)
      .map(([itemId, v]) => ({
        itemId,
        qty: v,
        unit:
          all.find((i) => i.id === itemId)?.purchaseUnits[0]?.unit || "each",
      }));
    if (!lines.length) {
      onOpenChange(false);
      return;
    }
    const session: CountSession = {
      id: id(),
      outletId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      lines,
    };
    Store.applyCountSession(session);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-3xl">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Quick Count</DialogTitle>{" "}
        </DialogHeader>{" "}
        <div className="mb-2">
          <Input
            placeholder="Search items…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>{" "}
        <div className="rounded-lg border">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>Item</TableHead>{" "}
                <TableHead className="w-[12ch]">Qty</TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {filtered.map((it) => (
                <TableRow key={it.id}>
                  {" "}
                  <TableCell>{it.name}</TableCell>{" "}
                  <TableCell>
                    <Input
                      type="number"
                      value={qty[it.id] || 0}
                      onChange={(e) =>
                        setQty({ ...qty, [it.id]: Number(e.target.value) })
                      }
                    />
                  </TableCell>{" "}
                </TableRow>
              ))}{" "}
              {!filtered.length && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No items.
                  </TableCell>
                </TableRow>
              )}{" "}
            </TableBody>{" "}
          </Table>{" "}
        </div>{" "}
        <div className="mt-3 flex justify-end gap-2">
          {" "}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>{" "}
          <Button onClick={post}>Post Count</Button>{" "}
        </div>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
