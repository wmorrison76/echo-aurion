import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Download, Printer, Copy } from "lucide-react";
import type { Database } from "../types/database";
type LayoutItem = Database["public"]["Tables"]["layout_items"]["Row"];
interface BOMExportProps {
  layoutItems: LayoutItem[];
  layoutName: string;
  roomName: string;
}
interface BOMItem {
  type: string;
  count: number;
  seats?: number;
  dimensions?: string;
}
export function BOMExport({
  layoutItems,
  layoutName,
  roomName,
}: BOMExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const generateBOM = (): BOMItem[] => {
    const itemMap = new Map<string, BOMItem>();
    layoutItems.forEach((item) => {
      const key = item.item_type;
      const existing = itemMap.get(key);
      if (existing) {
        existing.count += 1;
        if (item.seats && !existing.seats) {
          existing.seats = item.seats;
        }
      } else {
        itemMap.set(key, {
          type: item.label || item.item_type,
          count: 1,
          seats: item.seats,
          dimensions:
            item.width_ft && item.depth_ft
              ? `${item.width_ft}×${item.depth_ft}ft`
              : undefined,
        });
      }
    });
    return Array.from(itemMap.values()).sort((a, b) =>
      a.type.localeCompare(b.type),
    );
  };
  const exportCSV = () => {
    const bom = generateBOM();
    const headers = ["Item Type", "Quantity", "Seats", "Dimensions"];
    const rows = bom.map((item) => [
      item.type,
      item.count,
      item.seats || "",
      item.dimensions || "",
    ]);
    const csv =
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n") +
      "\n\n" +
      `Generated for: ${roomName} - ${layoutName}\n` +
      `Generated at: ${new Date().toLocaleString()}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layoutName}-bom.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "BOM exported as CSV" });
  };
  const exportPDF = () => {
    const bom = generateBOM();
    const totalItems = layoutItems.length;
    const totalSeats = layoutItems.reduce(
      (sum, item) => sum + (item.seats || 0),
      0,
    );
    const content = `
BILL OF MATERIALS
Dining Room Layout Report Room: ${roomName}
Layout: ${layoutName}
Generated: ${new Date().toLocaleString()} SUMMARY
Total Items: ${totalItems}
Total Seats: ${totalSeats} ITEMS
${bom.map((item, idx) => `${idx + 1}. ${item.type} (Qty: ${item.count}${item.seats ? `, Seats: ${item.seats}` : ""}${item.dimensions ? `, Size: ${item.dimensions}` : ""})`).join("\n")} SETUP NOTES
- Arrange items according to the layout plan
- Ensure proper spacing for egress and movement
- Verify all equipment is accounted for For Setup Team Use Only
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layoutName}-bom.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "BOM exported as text" });
  };
  const copyToClipboard = () => {
    const bom = generateBOM();
    const text = bom.map((item) => `${item.type} × ${item.count}`).join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      toast({ title: "BOM copied to clipboard" });
    });
  };
  const bom = generateBOM();
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {" "}
      <DialogTrigger asChild>
        {" "}
        <Button size="sm" variant="outline">
          {" "}
          <Download className="h-4 w-4 mr-1" /> BOM{" "}
        </Button>{" "}
      </DialogTrigger>{" "}
      <DialogContent className="max-w-2xl max-h-96">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Bill of Materials</DialogTitle>{" "}
        </DialogHeader>{" "}
        <div className="space-y-4">
          {" "}
          <div className="bg-muted p-3 rounded text-sm">
            {" "}
            <p>
              {" "}
              <strong>Room:</strong> {roomName}{" "}
            </p>{" "}
            <p>
              {" "}
              <strong>Layout:</strong> {layoutName}{" "}
            </p>{" "}
            <p>
              {" "}
              <strong>Total Items:</strong> {layoutItems.length}{" "}
            </p>{" "}
            <p>
              {" "}
              <strong>Total Seats:</strong>
              {""}{" "}
              {layoutItems.reduce(
                (sum, item) => sum + (item.seats || 0),
                0,
              )}{" "}
            </p>{" "}
          </div>{" "}
          <div className="max-h-64 overflow-y-auto">
            {" "}
            <table className="w-full text-sm">
              {" "}
              <thead className="sticky top-0 bg-muted border-b">
                {" "}
                <tr>
                  {" "}
                  <th className="text-left p-2">Item</th>{" "}
                  <th className="text-center p-2">Qty</th>{" "}
                  <th className="text-center p-2">Seats</th>{" "}
                  <th className="text-left p-2">Dimensions</th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody className="divide-y">
                {" "}
                {bom.map((item) => (
                  <tr key={item.type} className="hover:bg-muted/50">
                    {" "}
                    <td className="p-2">{item.type}</td>{" "}
                    <td className="text-center p-2">{item.count}</td>{" "}
                    <td className="text-center p-2">{item.seats || "-"}</td>{" "}
                    <td className="p-2">{item.dimensions || "-"}</td>{" "}
                  </tr>
                ))}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              className="flex-1"
            >
              {" "}
              <Download className="h-4 w-4 mr-1" /> CSV{" "}
            </Button>{" "}
            <Button
              size="sm"
              variant="outline"
              onClick={exportPDF}
              className="flex-1"
            >
              {" "}
              <Printer className="h-4 w-4 mr-1" /> Text{" "}
            </Button>{" "}
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="flex-1"
            >
              {" "}
              <Copy className="h-4 w-4 mr-1" /> Copy{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
