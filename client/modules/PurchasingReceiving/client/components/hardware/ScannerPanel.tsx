import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Radio } from "lucide-react";
import { hardwareManager, type HardwareDevice } from "@/lib/hardware";
import { scannerService, type ScannedBarcode } from "@/lib/scanner-service";
import { useToast } from "@/hooks/use-toast";
interface ScannedItem {
  barcode: string;
  timestamp: string;
  matched?: {
    vendorId?: string;
    itemId?: string;
    itemName?: string;
    invoiceNumber?: string;
  };
}
export interface ScannerPanelProps {
  onScannedBarcode?: (barcode: ScannedBarcode, matched: any) => void;
  onError?: (error: Error) => void;
}
export function ScannerPanel({ onScannedBarcode, onError }: ScannerPanelProps) {
  const { toast } = useToast();
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    loadScanners();
  }, []);
  const loadScanners = async () => {
    try {
      const allDevices = await hardwareManager.discoverDevices();
      const scanners = allDevices.filter((d) => d.type === "scanner");
      setDevices(scanners);
      if (scanners.length > 0) {
        setSelectedDeviceId(scanners[0].id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scanners",
        variant: "destructive",
      });
    } finally {
    }
  };
  const handleStartScanning = async () => {
    if (!selectedDeviceId) {
      toast({
        title: "Error",
        description: "Please select a scanner",
        variant: "destructive",
      });
      return;
    }
    setIsInitializing(true);
    try {
      await scannerService.initializeScanner(selectedDeviceId);
      await scannerService.startScanning();
      unsubscribeRef.current = scannerService.subscribe({
        onBarcode: handleNewBarcode,
        onError: (error: Error) => {
          toast({
            title: "Scanner Error",
            description: error.message,
            variant: "destructive",
          });
          if (onError) onError(error);
        },
      });
      setIsScanning(true);
      toast({ title: "Scanner active", description: "Ready to scan barcodes" });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to start scanner",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStopScanning = () => {
    scannerService.stopScanning();
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsScanning(false);
    toast({
      title: "Scanner stopped",
      description: "Scanning is now disabled",
    });
  };

  const handleNewBarcode = (barcode: ScannedBarcode) => {
    const item: ScannedItem = {
      barcode: barcode.value,
      timestamp: barcode.timestamp,
    };
    setScannedItems((prev) => [item, ...prev]);
    setManualInput("");
    if (onScannedBarcode) onScannedBarcode(barcode, item.matched);
  };

  const handleManualInput = (value: string) => {
    if (value.endsWith("\n") || value.endsWith("\r")) {
      const barcode = value.trim();
      if (barcode)
        handleNewBarcode({
          value: barcode,
          timestamp: new Date().toISOString(),
          deviceId: selectedDeviceId || "manual",
        });
      setManualInput("");
      return;
    }
    setManualInput(value);
  };

  const clearScannedItems = () => setScannedItems([]);

  const scanners = devices.filter((d) => d.type === "scanner");
  const activeDevice = scanners.find((d) => d.id === selectedDeviceId);

  return (
    <div className="space-y-4">
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Barcode Scanner</CardTitle>
          <CardDescription>
            Scan invoice barcodes, UPCs, or item codes to streamline receiving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanners.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No scanners found</AlertTitle>
              <AlertDescription>
                Connect a USB or WiFi scanner using the Hardware Management
                panel.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Active Scanner</label>
                  <Select
                    value={selectedDeviceId}
                    onValueChange={setSelectedDeviceId}
                    disabled={isScanning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scanners.map((scanner) => (
                        <SelectItem key={scanner.id} value={scanner.id}>
                          {scanner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  {isScanning ? (
                    <Button
                      onClick={handleStopScanning}
                      variant="destructive"
                      className="flex-1"
                    >
                      Stop Scanning
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartScanning}
                      disabled={isInitializing || !selectedDeviceId}
                      className="flex-1"
                    >
                      {isInitializing ? "Initializing..." : "Start Scanning"}
                    </Button>
                  )}
                </div>
              </div>
              {isScanning && (
                <div className="rounded-lg bg-green-50 p-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-green-600 animate-pulse" />
                  <span className="text-sm font-medium text-green-900">
                    Scanner is active and ready
                  </span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Manual Input</label>
                <Input
                  placeholder="Type or paste barcode and press Enter"
                  value={manualInput}
                  onChange={(e) => handleManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleManualInput(manualInput + "\n");
                  }}
                  className="font-mono text-sm"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {scannedItems.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Scanned Items</CardTitle>
              <CardDescription>
                {scannedItems.length} barcode
                {scannedItems.length !== 1 ? "s" : ""} scanned
              </CardDescription>
            </div>
            <Button onClick={clearScannedItems} variant="outline" size="sm">
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Scanned At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Item Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scannedItems.map((item, idx) => (
                    <TableRow key={`${item.barcode}-${idx}`}>
                      <TableCell className="font-mono text-sm">
                        {item.barcode}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {item.matched ? (
                          <Badge
                            variant="secondary"
                            className="flex w-fit items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Matched
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.matched?.itemName || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
