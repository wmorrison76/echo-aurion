import React, { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarcodeScanner } from "./BarcodeScanner";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

type ScanResult = {
  type: "invoice" | "purchase-order" | "item" | "unknown";
  code: string;
  timestamp: Date;
  status: "success" | "error" | "pending";
  message: string;
};

interface DockScannerPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onInvoiceMatch?: (invoiceCode: string) => void;
  onPOMatch?: (poCode: string) => void;
}

export function DockScannerPanel({
  panelId = "DOCK-1",
  onClose,
  onMinimize,
  onInvoiceMatch,
  onPOMatch,
}: DockScannerPanelProps) {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [useCameraMode, setUseCameraMode] = useState(true);

  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      // Determine scan type based on barcode pattern
      let type: ScanResult["type"] = "unknown";
      let message = "Unknown barcode format";

      // Example patterns - adjust based on actual barcode formats
      if (barcode.startsWith("INV")) {
        type = "invoice";
        message = `Invoice ${barcode} detected`;
        onInvoiceMatch?.(barcode);
      } else if (barcode.startsWith("PO")) {
        type = "purchase-order";
        message = `Purchase Order ${barcode} detected`;
        onPOMatch?.(barcode);
      } else if (barcode.match(/^\d{8,}$/)) {
        type = "item";
        message = `Item SKU ${barcode} scanned`;
      } else {
        type = "unknown";
        message = "Unrecognized barcode format";
      }

      const result: ScanResult = {
        type,
        code: barcode,
        timestamp: new Date(),
        status: type !== "unknown" ? "success" : "error",
        message,
      };

      setResults((prev) => [result, ...prev].slice(0, 20)); // Keep last 20
    },
    [onInvoiceMatch, onPOMatch]
  );

  const handleManualEntry = useCallback(() => {
    if (manualInput.trim()) {
      handleBarcodeScan(manualInput);
      setManualInput("");
    }
  }, [manualInput, handleBarcodeScan]);

  const handleClearHistory = useCallback(() => {
    setResults([]);
  }, []);

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{panelId}</h3>
          <p className="text-sm text-muted-foreground">
            Dock Scanner - Invoice & PO Intake
          </p>
        </div>
        <div className="flex gap-2">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Minimize
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={useCameraMode ? "default" : "outline"}
          size="sm"
          onClick={() => setUseCameraMode(true)}
        >
          Camera Scanner
        </Button>
        <Button
          variant={!useCameraMode ? "default" : "outline"}
          size="sm"
          onClick={() => setUseCameraMode(false)}
        >
          Manual Entry
        </Button>
      </div>

      {/* Camera Scanner */}
      {useCameraMode && (
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Camera Scanner</CardTitle>
            <CardDescription>Point at barcode to scan</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="w-full h-full max-h-96">
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onError={(error) => {
                  console.error("Scanner error:", error);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Entry */}
      {!useCameraMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Entry</CardTitle>
            <CardDescription>Type or paste barcode code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Enter invoice, PO, or item code..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleManualEntry();
                }
              }}
            />
            <Button onClick={handleManualEntry} className="w-full">
              Submit Code
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Scans</CardTitle>
              <CardDescription>Last {results.length} scanned items</CardDescription>
            </div>
            {results.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {results.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No scans yet. Start scanning.</p>
            </div>
          ) : (
            results.map((result, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {result.status === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {result.status === "error" && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  {result.status === "pending" && (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground capitalize">
                      {result.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-foreground mt-0.5 truncate">
                    {result.code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
