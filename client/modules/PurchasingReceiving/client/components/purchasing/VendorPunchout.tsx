import React, { useEffect, useMemo, useState } from "react";
import {
  Vendors,
  startPunchout,
  searchCatalog,
  hasMockData,
} from "@/lib/punchout";
import { PunchoutSession, CatalogItem, Vendor } from "@shared/punchout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pricePerOz, pricePerTsp } from "@/lib/pack";
import { deriveGLForName } from "@/lib/gl-utils";
export function VendorPunchout({
  onAdd,
  glCodeFilter,
  glLabel,
}: {
  onAdd: (
    items: {
      itemId?: string | null;
      productName: string;
      qty: number;
      unit: string;
    }[],
  ) => void;
  glCodeFilter?: string | null;
  glLabel?: string | null;
}) {
  const [vendor, setVendor] = useState<Vendor | null>(
    () => Vendors.find((v) => hasMockData(v.id)) || Vendors[0],
  );
  const [session, setSession] = useState<PunchoutSession | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [showWeb, setShowWeb] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!vendor) return;
      const s = await startPunchout(vendor);
      if (!active) return;
      setSession(s);
      const r = await searchCatalog(s, q);
      if (!active) return;
      setResults(r);
    })();
    return () => {
      active = false;
    };
  }, [vendor]);
  const runSearch = async () => {
    if (!session) return;
    setResults(await searchCatalog(session, q));
  };
  const filteredResults = useMemo(() => {
    if (!glCodeFilter || glCodeFilter === "all") return results;
    return results.filter((r) => {
      const { gl } = deriveGLForName(r.name);
      return gl ? gl.code === glCodeFilter : false;
    });
  }, [results, glCodeFilter]);
  const addSelected = () => {
    const items = filteredResults
      .filter((r) => (qty[r.sku] || 0) > 0)
      .map((r) => ({
        itemId: r.sku,
        productName: `${r.name} (${r.sku})`,
        qty: qty[r.sku],
        unit: r.unit,
      }));
    if (items.length) onAdd(items);
  };
  const vendorOptions = useMemo(() => Vendors, []);
  return (
    <Card className="border-2">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Vendor Punchout</CardTitle>{" "}
        <CardDescription>
          Search and import items from program vendors. Production connects via
          OCI/cXML/URL credentials.
        </CardDescription>{" "}
        {glLabel && (
          <div className="text-xs text-muted-foreground">
            Filtering by {glLabel}
          </div>
        )}{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {" "}
          <div className="sm:col-span-2">
            {" "}
            <select
              className="w-full rounded-md border bg-background p-2"
              value={vendor?.id}
              onChange={(e) =>
                setVendor(
                  vendorOptions.find((v) => v.id === e.target.value) || null,
                )
              }
            >
              {" "}
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} • {v.protocol}
                </option>
              ))}{" "}
            </select>{" "}
          </div>{" "}
          <div className="sm:col-span-2">
            {" "}
            <Input
              placeholder="Search catalog (SKU, name)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />{" "}
          </div>{" "}
          <div className="sm:col-span-1 flex gap-2">
            {" "}
            <Button className="w-full" onClick={runSearch}>
              Search
            </Button>{" "}
            {vendor?.homepage && (
              <Button
                variant="outline"
                className="whitespace-nowrap"
                onClick={() => setShowWeb((v) => !v)}
              >
                {showWeb ? "Hide" : "Open"} Website
              </Button>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {showWeb && vendor?.homepage && (
          <div className="mt-3 rounded-lg border">
            {" "}
            <div className="flex items-center justify-between border-b p-2 text-sm">
              {" "}
              <div>{vendor.name}</div>{" "}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowWeb(false)}
              >
                Close
              </Button>{" "}
            </div>{" "}
            <div className="h-[480px] w-full">
              {" "}
              <iframe
                src={vendor.homepage}
                className="h-full w-full"
                title={vendor.name}
              />{" "}
            </div>{" "}
          </div>
        )}{" "}
        <div className="mt-3 rounded-lg border">
          {" "}
          <Table>
            {" "}
            <TableHeader>
              {" "}
              <TableRow>
                {" "}
                <TableHead>SKU</TableHead> <TableHead>Product</TableHead>{" "}
                <TableHead>Pack</TableHead>{" "}
                <TableHead className="w-[12ch]">Unit</TableHead>{" "}
                <TableHead className="w-[12ch] text-right">Price</TableHead>{" "}
                <TableHead className="w-[12ch] text-right">$/oz</TableHead>{" "}
                <TableHead className="w-[12ch] text-right">$/tsp</TableHead>{" "}
                <TableHead className="w-[10ch]">Qty</TableHead>{" "}
              </TableRow>{" "}
            </TableHeader>{" "}
            <TableBody>
              {" "}
              {filteredResults.map((r) => (
                <TableRow key={r.sku}>
                  {" "}
                  <TableCell className="font-mono text-xs">
                    {r.sku}
                  </TableCell>{" "}
                  <TableCell>{r.name}</TableCell>{" "}
                  <TableCell className="text-sm text-muted-foreground">
                    {r.pack || "—"}
                  </TableCell>{" "}
                  <TableCell>{r.unit}</TableCell>{" "}
                  <TableCell className="text-right">
                    ${r.price.toFixed(2)}
                  </TableCell>{" "}
                  <TableCell className="text-right">
                    {(() => {
                      const v = pricePerOz(r.price, r.pack);
                      return v != null ? `$${v.toFixed(3)}` : "—";
                    })()}
                  </TableCell>{" "}
                  <TableCell className="text-right">
                    {(() => {
                      const v = pricePerTsp(r.name, r.price, r.pack);
                      return v != null ? `$${v.toFixed(3)}` : "—";
                    })()}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Input
                      type="number"
                      min={0}
                      value={qty[r.sku] || 0}
                      onChange={(e) =>
                        setQty({ ...qty, [r.sku]: Number(e.target.value) })
                      }
                    />{" "}
                  </TableCell>{" "}
                </TableRow>
              ))}{" "}
              {!filteredResults.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No results. Try searching.
                  </TableCell>
                </TableRow>
              )}{" "}
            </TableBody>{" "}
          </Table>{" "}
        </div>{" "}
        <div className="mt-3 flex justify-end">
          <Button onClick={addSelected}>Add to PO</Button>
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
