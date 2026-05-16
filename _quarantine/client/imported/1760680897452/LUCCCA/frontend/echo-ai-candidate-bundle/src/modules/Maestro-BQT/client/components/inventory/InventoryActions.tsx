import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useInventoryStore } from '../../stores/inventoryStore';
import { Brain, PackagePlus, ScanLine, FileSearch, FlaskConical } from 'lucide-react';

export default function InventoryActions() {
  const { items, generateAutoPO, suggestReorderQty, forecastDailyUse, onHandQty } = useInventoryStore() as any;
  const [open, setOpen] = useState<null | 'forecast' | 'po' | 'scan' | 'invoice' | 'whatif'>(null);
  const [barcode, setBarcode] = useState('');
  const [scanQty, setScanQty] = useState(1);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceResults, setInvoiceResults] = useState<any[]>([]);
  const { recordTx } = useInventoryStore();

  const autoPO = useMemo(() => generateAutoPO(), [items, generateAutoPO]);

  const saveScan = () => {
    const match = items.find((i:any) => i.id === barcode || i.name.toLowerCase() === barcode.toLowerCase());
    if (!match) return;
    recordTx({ itemId: match.id, type: 'adjustment', quantity: scanQty, date: new Date().toISOString(), note: 'Scan adjustment' });
    setBarcode('');
    setScanQty(1);
    setOpen(null);
  };

  const onSearchInvoice = async () => {
    if (!invoiceNumber.trim()) { setInvoiceResults([]); return; }
    // Live connector example (uncomment when backend is available):
    // const res = await fetch(`/api/invoices?number=${encodeURIComponent(invoiceNumber)}`);
    // const data = await res.json();
    // setInvoiceResults(data);
    setInvoiceResults([{ number: invoiceNumber.trim(), status: 'Not Connected', items: [] }]);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="border-b"><CardTitle>Actions</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2 p-4">
        <Button variant="outline" onClick={()=>setOpen('forecast')}><Brain className="h-4 w-4 mr-2"/>Forecast</Button>
        <Button variant="outline" onClick={()=>setOpen('po')}><PackagePlus className="h-4 w-4 mr-2"/>Generate POs</Button>
        <Button variant="outline" onClick={()=>setOpen('scan')}><ScanLine className="h-4 w-4 mr-2"/>Scan/Adjust</Button>
        <Button variant="outline" onClick={()=>setOpen('invoice')}><FileSearch className="h-4 w-4 mr-2"/>Invoice Lookup</Button>
        <Button variant="outline" onClick={()=>setOpen('whatif')}><FlaskConical className="h-4 w-4 mr-2"/>What‑If</Button>
      </CardContent>

      {/* Forecast Dialog */}
      <Dialog open={open==='forecast'} onOpenChange={()=>setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>7‑Day Forecast & PAR Suggestions</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
            {items.map((i:any)=>{
              const on = onHandQty(i.id);
              const avg = forecastDailyUse(i.id, 30);
              const suggest = suggestReorderQty(i.id, 7);
              return (
                <div key={i.id} className="p-3 border rounded-md">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">On hand: {on} {i.unit}</div>
                  <div className="text-xs">Avg daily use: {avg.toFixed(2)}</div>
                  <div className="text-xs">Suggested reorder (7d): {suggest}</div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto PO Dialog */}
      <Dialog open={open==='po'} onOpenChange={()=>setOpen(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Auto‑Generated Purchase Suggestions</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {autoPO.length === 0 && <div className="text-sm text-muted-foreground">All items at or above PAR.</div>}
            {autoPO.map((r:any)=> (
              <div key={r.itemId} className="p-3 rounded border flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">Qty: {r.suggestedQty} • Est ${r.estCost.toFixed(2)}</div>
                </div>
                <Button size="sm" variant="outline">Add to PO</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Scanner Dialog */}
      <Dialog open={open==='scan'} onOpenChange={()=>setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan or Enter Item</DialogTitle>
            <DialogDescription>Type an item name or ID, set quantity, and save an adjustment.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="mb-1 block">Item ID or Name</Label>
              <Input value={barcode} onChange={(e)=>setBarcode(e.target.value)} placeholder="e.g., itm-1 or Chicken Breast" />
            </div>
            <div>
              <Label className="mb-1 block">Quantity (+/‑)</Label>
              <Input type="number" value={scanQty} onChange={(e)=>setScanQty(Number(e.target.value))} />
            </div>
            <Button onClick={saveScan}>Save Adjustment</Button>
            {/* Camera scanning: integrate @zxing/library and call setBarcode(decodedValue) from a video stream. */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Lookup Dialog */}
      <Dialog open={open==='invoice'} onOpenChange={()=>setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Lookup</DialogTitle>
            <DialogDescription>Search vendor invoices and reconcile items.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="mb-1 block">Invoice Number</Label>
              <Input placeholder="e.g., INV-12345" value={invoiceNumber} onChange={(e)=>setInvoiceNumber(e.target.value)} />
            </div>
            <Button variant="outline" onClick={onSearchInvoice}>Search</Button>
            <div className="text-xs text-muted-foreground">To connect, call your invoices API and set results from the response.</div>
            <div className="mt-2 border rounded max-h-48 overflow-auto">
              {invoiceResults.map((r:any, idx)=> (
                <div key={idx} className="p-2 border-b last:border-b-0">
                  <div className="font-medium text-sm">Invoice {r.number}</div>
                  <div className="text-xs text-muted-foreground">Status: {r.status}</div>
                </div>
              ))}
              {invoiceResults.length===0 && <div className="p-2 text-xs text-muted-foreground">No results</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* What‑If Dialog */}
      <Dialog open={open==='whatif'} onOpenChange={()=>setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>What‑If Consumption</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground">Enter event assumptions in Production Management to simulate usage; this view summarizes current PAR‑based suggestions and average daily use.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-auto mt-3">
            {items.map((i:any)=>{
              const avg = forecastDailyUse(i.id, 30);
              const suggest = suggestReorderQty(i.id, 7);
              return (
                <div key={i.id} className="p-3 border rounded-md">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs">Avg daily: {avg.toFixed(2)} • 7d need: {Math.ceil(avg*7)}</div>
                  <div className="text-xs">Suggested reorder: {suggest}</div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
