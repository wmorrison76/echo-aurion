import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Wifi, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "labelPrinter.connection";

const PRINTER_BRANDS = ["Zebra", "Brother", "DYMO"] as const;

type PrinterBrand = (typeof PRINTER_BRANDS)[number];

type PrinterConfig = {
  brand: PrinterBrand;
  deviceName: string;
  deviceId?: string;
};

export default function WirelessLabelPrinterPanel() {
  const [config, setConfig] = useState<PrinterConfig>({
    brand: "Zebra",
    deviceName: "",
  });
  const [status, setStatus] = useState<"idle" | "paired" | "printing">("idle");
  const [lastAction, setLastAction] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setConfig(parsed);
          setStatus("paired");
        }
      }
    } catch {
      // Ignore corrupted localStorage data
    }
  }, []);

  useEffect(() => {
    try {
      if (status === "paired" && config.deviceName) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
    } catch (error) {
      console.error("Failed to save printer config:", error);
    }
  }, [config, status]);

  const handlePair = () => {
    if (!config.deviceName.trim()) return;
    setStatus("paired");
    setLastAction(`Paired with ${config.brand} ${config.deviceName}`);
  };

  const sendTestLabel = async () => {
    if (status !== "paired") return;
    setStatus("printing");
    setLastAction("Sending test label...");
    try {
      const response = await fetch("/api/print/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "label",
          format: "html",
          deviceId: config.deviceId,
          data: {
            type: "inventory_label",
            productName: "Sample Receiving Label",
            quantity: 12,
            unit: "cases",
            vendor: "US Foods",
            received_date: new Date().toLocaleDateString(),
            dimensions: { width: 4, height: 2 },
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`Print failed: ${response.status}`);
      }
      setLastAction("Test label sent to printer.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reach printer endpoint.";
      setLastAction(message);
      console.error("Print error:", error);
    } finally {
      setStatus("paired");
    }
  };

  return (
    <Card className="border border-border bg-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          Wireless Label Printing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            value={config.brand}
            onValueChange={(value: PrinterBrand) =>
              setConfig((prev) => ({ ...prev, brand: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {PRINTER_BRANDS.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Printer name (e.g., Dock Labeler)"
            value={config.deviceName}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, deviceName: event.target.value }))
            }
          />
          <Button
            onClick={handlePair}
            disabled={!config.deviceName.trim()}
            className="w-full"
          >
            Pair Printer
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            {status === "paired" ? "Paired" : "Not paired"}
          </Badge>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            {status === "paired"
              ? `Connected to ${config.brand}`
              : "Connect a printer to enable labels"}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={sendTestLabel}
            disabled={status !== "paired"}
          >
            Send Test Label
          </Button>
          <Button variant="secondary" disabled={status !== "paired"}>
            Print Receiving Labels
          </Button>
          <Button variant="secondary" disabled={status !== "paired"}>
            Print Bin Labels
          </Button>
        </div>
        {lastAction && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {lastAction}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
