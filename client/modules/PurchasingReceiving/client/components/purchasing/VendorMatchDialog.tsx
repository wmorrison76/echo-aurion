import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store } from "@/lib/store";
import { deriveGLForName } from "@/lib/gl-utils";
export interface VendorPick {
  vendorId: string | null;
  unitPrice: number | null;
}
export function VendorMatchDialog({
  open,
  onOpenChange,
  productName,
  qty,
  glCode,
  glLabel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  qty: number;
  glCode?: string | null;
  glLabel?: string | null;
  onSelect: (pick: VendorPick) => void;
}) {
  const [filter, setFilter] = useState("");
  const vendors = useMemo(() => Store.listVendors(), [open]);
  const receipts = useMemo(() => Store.listReceipts(), [open]);
  useEffect(() => {
    if (open) setFilter("");
  }, [open]);
  const rows = useMemo(() => {
    const q = (filter || productName || "").toLowerCase();
    const list: {
      vendorId: string | null;
      vendorName: string;
      lastDate: string;
      lastUnitPrice: number;
      sample: string;
    }[] = [];
    const byVendor = new Map<
      string | null,
      {
        vendorId: string | null;
        vendorName: string;
        lastDate: string;
        lastUnitPrice: number;
        sample: string;
      }
    >();
    for (const r of receipts) {
      for (const l of r.lines) {
        const text = `${l.productName}`.toLowerCase();
        if (q && !text.includes(q)) continue;
        if (glCode) {
          const glInfo = deriveGLForName(l.productName).gl;
          if (!glInfo || glInfo.code !== glCode) continue;
        }
        const vendorId = (r.vendorId as any) || null;
        const vendorName =
          vendors.find((v) => v.id === vendorId)?.name || "Unknown Vendor";
        const unitPrice = l.qty ? l.totalCost / l.qty : 0;
        const prev = byVendor.get(vendorId);
        if (
          !prev ||
          new Date(r.date).getTime() > new Date(prev.lastDate).getTime()
        ) {
          const entry = {
            vendorId,
            vendorName,
            lastDate: r.date,
            lastUnitPrice: unitPrice,
            sample: l.productName,
          };
          byVendor.set(vendorId, entry);
        }
      }
    }
    for (const v of byVendor.values()) list.push(v);
    list.sort(
      (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
    );
    return list;
  }, [receipts, vendors, filter, productName, glCode]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-3xl">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Select vendor and price</DialogTitle>{" "}
          <DialogDescription>
            Last prices from recent invoices matching “{productName}”.
          </DialogDescription>{" "}
          {glLabel && (
            <div className="text-xs text-muted-foreground">
              Filtered by {glLabel}
            </div>
          )}{" "}
        </DialogHeader>{" "}
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {" "}
          <div className="sm:col-span-2">
            {" "}
            <Input
              placeholder="Filter by item text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />{" "}
          </div>{" "}
          <div className="text-sm text-muted-foreground self-center">
            Qty: {qty}
          </div>{" "}
        </div>{" "}
        <div className="rounded-lg border">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>Vendor</TableHead> <TableHead>Last Item</TableHead>{" "}
                <TableHead className="w-[12ch] text-right">
                  Last Price
                </TableHead>{" "}
                <TableHead className="w-[16ch]">Date</TableHead>{" "}
                <TableHead className="w-[12ch]"></TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {rows.map((r) => (
                <TableRow key={`${r.vendorId}-${r.lastDate}`}>
                  {" "}
                  <TableCell>{r.vendorName}</TableCell>{" "}
                  <TableCell className="text-sm text-muted-foreground">
                    {r.sample}
                  </TableCell>{" "}
                  <TableCell className="text-right">
                    ${r.lastUnitPrice.toFixed(2)}
                  </TableCell>{" "}
                  <TableCell>
                    {new Date(r.lastDate).toLocaleDateString()}
                  </TableCell>{" "}
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => {
                        onSelect({
                          vendorId: r.vendorId,
                          unitPrice: r.lastUnitPrice,
                        });
                        onOpenChange(false);
                      }}
                    >
                      Use
                    </Button>
                  </TableCell>{" "}
                </TableRow>
              ))}{" "}
              {!rows.length && (
                <TableRow>
                  {" "}
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No matches from receipts.
                  </TableCell>{" "}
                </TableRow>
              )}{" "}
            </TableBody>{" "}
          </Table>{" "}
        </div>{" "}
        <div className="mt-3 text-xs text-muted-foreground">
          You can also browse vendor catalogs below the order form to add new
          items.
        </div>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
