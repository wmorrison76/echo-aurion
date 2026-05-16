import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Zap, CheckCircle2 } from "lucide-react";

export interface ScannedItemData {
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  currentQty: number;
  parLevel?: number;
  lastScannedAt?: string;
}

export interface BarcodeScannerProps {
  sessionId: string;
  organizationId: string;
  outletId: string;
  onItemScanned?: (item: ScannedItemData) => void;
  onError?: (error: string) => void;
  autoFocus?: boolean;
}

export function BarcodeScanner({
  sessionId,
  organizationId,
  outletId,
  onItemScanned,
  onError,
  autoFocus = true,
}: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<ScannedItemData | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedItemData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(async () => {
    if (!barcode.trim()) {
      setError("Please enter a barcode");
      return;
    }
    const trimmed = barcode.trim();
    try {
      setLoading(true);
      setError(null);
      // Be #1: Try central barcode/GTIN service first for item matching
      try {
        const gtRes = await fetch("/api/barcode-gtin/scan", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: trimmed }),
        });
        if (gtRes.ok) {
          const gtJson = await gtRes.json();
          const d = gtJson.data;
          const match = d?.lookup?.matchedProductId
            ? {
                productId: d.lookup.matchedProductId,
                productName: d.lookup.productName || trimmed,
              }
            : d?.matches?.[0];
          if (match) {
            const result: ScannedItemData = {
              itemId: match.productId,
              itemName: match.productName || trimmed,
              sku: trimmed,
              unit: "ea",
              currentQty: 0,
            };
            setLastScanned(result);
            setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
            onItemScanned?.(result);
            setBarcode("");
            inputRef.current?.focus();
            return;
          }
        }
      } catch {
        // fall through to mobile-inventory
      }
      const response = await fetch("/api/mobile-inventory/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: trimmed,
          organizationId,
          outletId,
          sessionId,
        }),
      });
      if (!response.ok) throw new Error("Failed to scan barcode");
      const result = await response.json();
      if (!result.isValid) {
        setError(result.errorMessage || "Invalid barcode");
        onError?.(result.errorMessage);
        return;
      }
      setLastScanned(result);
      setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
      onItemScanned?.(result);
      setBarcode("");
      inputRef.current?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [barcode, sessionId, organizationId, outletId, onItemScanned, onError]);

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleScan();
      }
    },
    [handleScan],
  );

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Barcode Scanner</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Scan Barcode
            </label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Point camera at barcode or enter manually"
                disabled={loading}
                autoFocus={autoFocus}
                className="flex-1"
              />
              <Button
                onClick={handleScan}
                disabled={loading || !barcode.trim()}
              >
                {loading ? "Scanning..." : "Scan"}
              </Button>
            </div>
          </div>
          {error && (
            <Alert className="bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {lastScanned && (
            <Alert className="bg-green-50">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{lastScanned.itemName}</div>
                <div className="text-sm">
                  Current: {lastScanned.currentQty} {lastScanned.unit}
                  {lastScanned.parLevel && ` | Par: ${lastScanned.parLevel}`}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>
      {scanHistory.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">
            Recent Scans ({scanHistory.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scanHistory.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-surface rounded text-sm"
              >
                <div>
                  <p className="font-medium">{item.itemName}</p>
                  <p className="text-muted-foreground">{item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {item.currentQty} {item.unit}
                  </p>
                  {item.parLevel && (
                    <p
                      className={
                        item.currentQty < item.parLevel
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      Par: {item.parLevel}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
