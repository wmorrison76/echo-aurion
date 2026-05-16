import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Barcode,
  Plus,
  Check,
  AlertTriangle,
  Camera,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { useDashboardOrderIntegration } from "../../integrations/dashboard-integration"; // Mock PO data
const MOCK_PO = {
  id: "po-1",
  po_number: "PO-24002",
  vendor_name: "Sysco",
  total_items: 18,
  lines: [
    {
      id: "line-1",
      product_name: "Ribeye Steak 12oz",
      product_code: "BEEF-001",
      ordered_qty: 50,
      unit: "lbs",
      unit_price: 12.5,
      temp_sensitive: true,
      required_temp: 32,
    },
    {
      id: "line-2",
      product_name: "Chicken Breast Boneless",
      product_code: "PROTEINS-001",
      ordered_qty: 100,
      unit: "lbs",
      unit_price: 3.75,
      temp_sensitive: true,
      required_temp: 32,
    },
    {
      id: "line-3",
      product_name: "Broccoli Crown Fresh",
      product_code: "VEG-001",
      ordered_qty: 75,
      unit: "lbs",
      unit_price: 2.25,
      temp_sensitive: false,
      required_temp: null,
    },
    {
      id: "line-4",
      product_name: "Whole Milk Gallon",
      product_code: "DAIRY-001",
      ordered_qty: 30,
      unit: "gallons",
      unit_price: 4.5,
      temp_sensitive: true,
      required_temp: 38,
    },
  ],
};
interface ScannedItem {
  id: string;
  line_id: string;
  product_code: string;
  product_name: string;
  quantity_scanned: number;
  unit: string;
  timestamp: string;
  temperature?: number;
  notes?: string;
  has_issues: boolean;
}
export default function BarcodeReceiver() {
  const { currentOutlet } = useMultiOutlet();
  const { publishOrderChecking, publishOrderCheckedIn } =
    useDashboardOrderIntegration();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>(
    MOCK_PO.lines[0]?.id || "",
  );
  const [manualQty, setManualQty] = useState<number>(1);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [hasPublishedChecking, setHasPublishedChecking] = useState(false); // Focus on barcode input useEffect(() => { barcodeInputRef.current?.focus(); }, []); // Handle barcode scan const handleBarcodeScan = () => { if (!barcodeInput.trim()) return; // Find matching product const product = MOCK_PO.lines.find( (line) => line.product_code.toLowerCase() === barcodeInput.toLowerCase(), ); if (!product) { alert("Barcode not found in PO"); setBarcodeInput(""); return; } addScannedItem(product.id, product.product_code, product.product_name, 1); setBarcodeInput(""); barcodeInputRef.current?.focus(); }; // Add scanned item const addScannedItem = ( lineId: string, productCode: string, productName: string, quantity: number, temp?: number, itemNotes?: string, ) => { const newItem: ScannedItem = { id: `scanned-${Date.now()}`, line_id: lineId, product_code: productCode, product_name: productName, quantity_scanned: quantity, unit: MOCK_PO.lines.find((l) => l.id === lineId)?.unit ||"", timestamp: new Date().toISOString(), temperature: temp, notes: itemNotes, has_issues: Boolean(temp && itemNotes) || false, }; setScannedItems([...scannedItems, newItem]); setTemperature(null); setNotes(""); setManualQty(1); // Publish"checking in" event on first scan if (!hasPublishedChecking && scannedItems.length === 0) { publishOrderChecking({ orderId: MOCK_PO.id, poNumber: MOCK_PO.po_number, vendor: MOCK_PO.vendor_name, outletId: currentOutlet?.id, }); setHasPublishedChecking(true); } }; // Add item manually const handleAddManually = () => { if (!selectedLineId) return; const line = MOCK_PO.lines.find((l) => l.id === selectedLineId); if (!line) return; addScannedItem( selectedLineId, line.product_code, line.product_name, manualQty, temperature || undefined, notes || undefined, ); }; // Remove scanned item const removeScannedItem = (id: string) => { setScannedItems(scannedItems.filter((item) => item.id !== id)); }; // Calculate totals const totals = useMemo(() => { const byLine: Record<string, number> = {}; scannedItems.forEach((item) => { byLine[item.line_id] = (byLine[item.line_id] || 0) + item.quantity_scanned; }); return { byLine, total_scanned: scannedItems.reduce( (sum, item) => sum + item.quantity_scanned, 0, ), items_with_issues: scannedItems.filter((item) => item.has_issues).length, }; }, [scannedItems]); // Check for shortages const shortages = useMemo(() => { const shortageList: Array<{ product_name: string; ordered: number; scanned: number; unit: string; }> = []; MOCK_PO.lines.forEach((line) => { const scanned = totals.byLine[line.id] || 0; if (scanned < line.ordered_qty) { shortageList.push({ product_name: line.product_name, ordered: line.ordered_qty, scanned, unit: line.unit, }); } }); return shortageList; }, [totals]); const scanProgress = Math.round( (scannedItems.reduce((sum, item) => sum + item.quantity_scanned, 0) / MOCK_PO.lines.reduce((sum, line) => sum + line.ordered_qty, 0)) * 100, ); return ( <AppLayout> <div className="space-y-6"> <div> <h1 className="text-3xl font-bold flex items-center gap-2"> <Barcode className="h-8 w-8" /> Barcode Receiver </h1> <p className="text-muted-foreground mt-2"> Scan items or enter them manually to receive {MOCK_PO.po_number} </p> </div> <div className="grid gap-6 lg:grid-cols-3"> {/* Main Scanning Area */} <div className="lg:col-span-2 space-y-6"> {/* PO Summary */} <Card className="border-border bg-card/70"> <CardHeader> <CardTitle>{MOCK_PO.po_number}</CardTitle> <CardDescription>{MOCK_PO.vendor_name}</CardDescription> </CardHeader> <CardContent> <div className="space-y-4"> <div> <p className="text-sm text-muted-foreground mb-2"> Receipt Progress </p> <div className="w-full bg-muted rounded-full h-3"> <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${scanProgress}%` }} /> </div> <p className="text-xs text-muted-foreground mt-2"> {scannedItems.reduce( (sum, item) => sum + item.quantity_scanned, 0, )}{""} of{""} {MOCK_PO.lines.reduce( (sum, line) => sum + line.ordered_qty, 0, )}{""} items received ({scanProgress}%) </p> </div> </div> </CardContent> </Card> {/* Barcode Input */} <Card className="border-border bg-card/70"> <CardHeader> <CardTitle className="text-base">Scan Barcode</CardTitle> </CardHeader> <CardContent className="space-y-4"> <div> <label className="text-sm font-medium"> Barcode / Product Code </label> <Input ref={barcodeInputRef} type="text" placeholder="Scan barcode or enter product code..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyPress={(e) => { if (e.key ==="Enter") { handleBarcodeScan(); } }} className="mt-2 text-lg font-mono" autoFocus /> </div> <Button onClick={handleBarcodeScan} className="w-full"> <Barcode className="h-4 w-4 mr-2" /> Scan </Button> </CardContent> </Card> {/* Manual Entry */} <Card className="border-border bg-card/70"> <CardHeader> <CardTitle className="text-base">Manual Entry</CardTitle> </CardHeader> <CardContent className="space-y-4"> <div> <label className="text-sm font-medium">Product</label> <select value={selectedLineId} onChange={(e) => setSelectedLineId(e.target.value)} className="w-full bg-background border border-border rounded px-3 py-2 mt-2 text-sm text-foreground" > {MOCK_PO.lines.map((line) => ( <option key={line.id} value={line.id}> {line.product_name} ({line.product_code}) </option> ))} </select> </div> <div className="grid grid-cols-2 gap-3"> <div> <label className="text-sm font-medium">Quantity</label> <Input type="number" min="0" value={manualQty} onChange={(e) => setManualQty(parseInt(e.target.value) || 0) } className="mt-2" /> </div> <div> <label className="text-sm font-medium"> Temperature (°F) </label> <Input type="number" placeholder="Optional" value={temperature ||""} onChange={(e) => setTemperature( e.target.value ? parseInt(e.target.value) : null, ) } className="mt-2" /> </div> </div> <div> <label className="text-sm font-medium"> Notes (damage, shortage, etc) </label> <Input type="text" placeholder="Add notes if there are issues..." value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2" /> </div> <Button onClick={handleAddManually} className="w-full"> <Plus className="h-4 w-4 mr-2" /> Add Item </Button> </CardContent> </Card> </div> {/* Summary Panel */} <div className="space-y-4"> {/* Alerts */} {shortages.length > 0 && ( <Alert className="border-amber-200/30 bg-amber-500/5"> <AlertTriangle className="h-4 w-4 text-amber-600" /> <AlertTitle className="text-amber-600 ml-2"> Shortages Detected </AlertTitle> <AlertDescription className="text-amber-600 ml-2 mt-2 text-xs"> {shortages.length} items short from PO </AlertDescription> </Alert> )} {totals.items_with_issues > 0 && ( <Alert className="border-red-200/30 bg-red-500/5"> <AlertTriangle className="h-4 w-4 text-red-600" /> <AlertTitle className="text-red-600 ml-2"> Issues Detected </AlertTitle> <AlertDescription className="text-red-600 ml-2 mt-2 text-xs"> {totals.items_with_issues} items have issues </AlertDescription> </Alert> )} {/* Scanned Items Summary */} <Card className="border-border bg-surface sticky top-6"> <CardHeader> <CardTitle className="text-base">Scanned Items</CardTitle> <CardDescription> {scannedItems.length} line items received </CardDescription> </CardHeader> <CardContent className="space-y-3"> {MOCK_PO.lines.map((line) => { const scanned = totals.byLine[line.id] || 0; const isShort = scanned < line.ordered_qty; return ( <div key={line.id} className="p-2 bg-slate-800/20 rounded border border-border" > <p className="text-xs font-medium text-slate-300 mb-1"> {line.product_name} </p> <div className="flex items-center justify-between"> <span className={`text-sm font-semibold ${isShort ?"text-red-400" :"text-green-400"}`} > {scanned}/{line.ordered_qty} {line.unit} </span> {isShort && ( <Badge variant="destructive" className="text-xs"> Short </Badge> )} </div> </div> ); })} <div className="pt-3 border-t border-border space-y-2"> <div className="flex justify-between text-sm"> <span className="text-slate-400">Total Scanned</span> <span className="font-semibold"> {totals.total_scanned} </span> </div> <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => { // Publish"checked in" event when receiving is complete publishOrderCheckedIn({ orderId: MOCK_PO.id, poNumber: MOCK_PO.po_number, vendor: MOCK_PO.vendor_name, outletId: currentOutlet?.id, itemsCount: scannedItems.length, }); // In a real implementation, this would also save to the database alert(`Receiving complete! ${scannedItems.length} items checked in.`); }} > <Check className="h-4 w-4 mr-2" /> Complete Receiving </Button> </div> </CardContent> </Card> </div> </div> {/* Scanned Items Table */} {scannedItems.length > 0 && ( <Card className="border-border bg-card/70"> <CardHeader> <CardTitle className="text-base">Scan History</CardTitle> </CardHeader> <CardContent> <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow className="hover:bg-transparent"> <TableHead className="text-slate-300">Product</TableHead> <TableHead className="text-right text-slate-300"> Qty </TableHead> <TableHead className="text-center text-slate-300"> Temp </TableHead> <TableHead className="text-slate-300">Notes</TableHead> <TableHead className="text-right text-slate-300"> Action </TableHead> </TableRow> </TableHeader> <TableBody> {scannedItems.map((item) => ( <TableRow key={item.id} className="hover:bg-slate-800/30"> <TableCell className="font-medium text-sm"> {item.product_name} </TableCell> <TableCell className="text-right"> {item.quantity_scanned} {item.unit} </TableCell> <TableCell className="text-center"> {item.temperature ? `${item.temperature}°F` :"-"} </TableCell> <TableCell className="text-sm text-slate-400"> {item.notes ||"-"} </TableCell> <TableCell className="text-right"> <Button variant="ghost" size="sm" onClick={() => removeScannedItem(item.id)} > <Trash2 className="h-4 w-4 text-red-400" /> </Button> </TableCell> </TableRow> ))} </TableBody> </Table> </div> </CardContent> </Card> )} </div> </AppLayout> );
}
