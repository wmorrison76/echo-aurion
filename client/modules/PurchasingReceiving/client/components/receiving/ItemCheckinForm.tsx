import React, { useState, useCallback } from "react";
import { Package, AlertCircle, CheckCircle2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useReceivingCheckins } from "@/hooks/useReceiving";
import { logger } from "@/lib/logger";
interface ItemCheckinFormProps {
  shipmentId: string;
  outletId: string;
  organizationId: string;
  currentUserId: string;
  onItemsCheckedIn?: (count: number) => void;
}
export function ItemCheckinForm({
  shipmentId,
  outletId,
  organizationId,
  currentUserId,
  onItemsCheckedIn,
}: ItemCheckinFormProps) {
  const { checkins, addCheckin } = useReceivingCheckins(outletId, shipmentId);
  const [isScanning, setIsScanning] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    product_name: "",
    sku: "",
    category: "other",
    po_quantity: 0,
    received_quantity: 0,
    expiration_date: "",
    received_condition: "good",
    condition_notes: "",
  });
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // D3 — Replaces the prior TODO. Scan barcode → server resolves to the
  // shipment's vendor + items table, returns item info + matching PO line
  // if discoverable. Form pre-populates with product_name, category-ish,
  // po_quantity from the PO line, and unit cost. Falls back to manual
  // entry with just the SKU prefilled if the lookup misses.
  const handleScanOrSKU = useCallback(async (value: string) => {
    const sku = value.trim();
    if (!sku) return;
    try {
      setSubmitting(true);
      const url = `/api/receiving/po-lookup?shipmentId=${encodeURIComponent(shipmentId)}&sku=${encodeURIComponent(sku)}`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.found && json.item) {
        // Pre-populate everything we know, leave received_quantity as 0 for
        // the chef to confirm (they may receive more or less than ordered).
        setManualEntry({
          product_name: json.item.name,
          sku: json.item.sku ?? sku,
          // category: items.gl_code_id is opaque; default to "other" until
          // we have a gl_code → category mapping in scope.
          category: "other",
          po_quantity: json.poLine?.qty_ordered ?? 0,
          received_quantity: 0,
          expiration_date: "",
          received_condition: "good",
          condition_notes: "",
        });
      } else {
        // Not in catalog — open the dialog with just the scanned SKU so the
        // chef can fill in product details manually. No silent failure.
        setManualEntry({
          product_name: "",
          sku,
          category: "other",
          po_quantity: 0,
          received_quantity: 0,
          expiration_date: "",
          received_condition: "good",
          condition_notes: "",
        });
        if (json && json.found === false) {
          logger.info("[Receiving] SKU not in catalog, opening manual entry", { sku });
        }
      }
      setShowManualEntry(true);
      setScanInput("");
    } catch (error) {
      logger.error("Failed to lookup product:", error);
      // Network or server error — degrade to manual entry rather than
      // blocking the chef.
      setManualEntry({
        product_name: "",
        sku,
        category: "other",
        po_quantity: 0,
        received_quantity: 0,
        expiration_date: "",
        received_condition: "good",
        condition_notes: "",
      });
      setShowManualEntry(true);
      setScanInput("");
    } finally {
      setSubmitting(false);
    }
  }, [shipmentId]);

  const handleAddCheckin = useCallback(async () => {
    if (!manualEntry.product_name || manualEntry.po_quantity === 0) {
      alert("Please fill in required fields");
      return;
    }
    try {
      setSubmitting(true);
      await addCheckin({
        shipment_id: shipmentId,
        organization_id: organizationId,
        outlet_id: outletId,
        receiving_user_id: currentUserId,
        ...manualEntry,
      });
      logger.info(`Item ${manualEntry.product_name} checked in`);
      setManualEntry({
        product_name: "",
        sku: "",
        category: "other",
        po_quantity: 0,
        received_quantity: 0,
        expiration_date: "",
        received_condition: "good",
        condition_notes: "",
      });
      setShowManualEntry(false);
      onItemsCheckedIn?.(1);
    } catch (error) {
      logger.error("Failed to add check-in:", error);
      alert("Failed to check in item");
    } finally {
      setSubmitting(false);
    }
  }, [
    manualEntry,
    addCheckin,
    shipmentId,
    organizationId,
    outletId,
    currentUserId,
    onItemsCheckedIn,
  ]); const hasShorts = checkins.some((c) => c.short_quantity > 0); const hasDamaged = checkins.some( (c) => c.received_condition !=="good" ); return ( <div className="space-y-4"> {/* Alerts */} {hasShorts && ( <Alert className="bg-amber-50 border-amber-200"> <AlertCircle className="h-4 w-4 text-amber-600" /> <AlertDescription className="text-amber-800"> {checkins.filter((c) => c.short_quantity > 0).length} items have shortages </AlertDescription> </Alert> )} {hasDamaged && ( <Alert className="bg-red-50 border-red-200"> <AlertCircle className="h-4 w-4 text-red-600" /> <AlertDescription className="text-red-800"> {checkins.filter((c) => c.received_condition !=="good").length}{""} items with quality issues </AlertDescription> </Alert> )} {/* Scan Input - Tablet Optimized */} <div className="space-y-2"> <label className="text-sm font-medium"> Scan Barcode or Enter SKU </label> <div className="flex gap-2"> <Input autoFocus placeholder="Scan barcode..." value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyPress={(e) => { if (e.key ==="Enter") { handleScanOrSKU(scanInput); } }} className="flex-1 text-lg h-12" /> <Button onClick={() => handleScanOrSKU(scanInput)} disabled={!scanInput.trim() || submitting} size="lg" > Add Item </Button> </div> <Button variant="outline" onClick={() => setShowManualEntry(true)} className="w-full" > + Manual Entry </Button> </div> {/* Manual Entry Dialog */} <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}> <DialogContent className="sm:max-w-md"> <DialogHeader> <DialogTitle>Check-In Item</DialogTitle> <DialogDescription> Provide details for this received item </DialogDescription> </DialogHeader> <div className="space-y-3"> <div> <label className="text-sm font-medium">Product Name *</label> <Input value={manualEntry.product_name} onChange={(e) => setManualEntry({ ...manualEntry, product_name: e.target.value, }) } placeholder="e.g., Chicken Breast" /> </div> <div> <label className="text-sm font-medium">SKU/Barcode</label> <Input value={manualEntry.sku} onChange={(e) => setManualEntry({ ...manualEntry, sku: e.target.value }) } placeholder="Optional" /> </div> <div> <label className="text-sm font-medium">Category</label> <Select value={manualEntry.category} onValueChange={(val) => setManualEntry({ ...manualEntry, category: val }) } > <SelectTrigger> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="produce">Produce</SelectItem> <SelectItem value="proteins">Proteins</SelectItem> <SelectItem value="dairy">Dairy</SelectItem> <SelectItem value="dry_goods">Dry Goods</SelectItem> <SelectItem value="beverages">Beverages</SelectItem> <SelectItem value="frozen">Frozen</SelectItem> <SelectItem value="other">Other</SelectItem> </SelectContent> </Select> </div> <div className="grid grid-cols-2 gap-2"> <div> <label className="text-sm font-medium">PO Qty *</label> <Input type="number" min="0" value={manualEntry.po_quantity} onChange={(e) => setManualEntry({ ...manualEntry, po_quantity: parseInt(e.target.value) || 0, }) } /> </div> <div> <label className="text-sm font-medium">Received Qty *</label> <Input type="number" min="0" value={manualEntry.received_quantity} onChange={(e) => setManualEntry({ ...manualEntry, received_quantity: parseInt(e.target.value) || 0, }) } /> </div> </div> <div> <label className="text-sm font-medium">Expiration Date</label> <Input type="date" value={manualEntry.expiration_date} onChange={(e) => setManualEntry({ ...manualEntry, expiration_date: e.target.value, }) } /> </div> <div> <label className="text-sm font-medium">Condition</label> <Select value={manualEntry.received_condition} onValueChange={(val: any) => setManualEntry({ ...manualEntry, received_condition: val, }) } > <SelectTrigger> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="good">Good</SelectItem> <SelectItem value="damaged">Damaged</SelectItem> <SelectItem value="expired">Expired</SelectItem> <SelectItem value="partial">Partial</SelectItem> <SelectItem value="missing">Missing</SelectItem> </SelectContent> </Select> </div> {manualEntry.received_condition !=="good" && ( <div> <label className="text-sm font-medium">Condition Notes</label> <Input value={manualEntry.condition_notes} onChange={(e) => setManualEntry({ ...manualEntry, condition_notes: e.target.value, }) } placeholder="Describe the issue..." /> </div> )} <Button onClick={handleAddCheckin} disabled={submitting} className="w-full" size="lg" > {submitting ?"Adding..." :"Add Item"} </Button> </div> </DialogContent> </Dialog> {/* Checked-In Items Summary */} {checkins.length > 0 && ( <div className="border-t pt-4"> <h3 className="font-semibold mb-3"> Items Checked In ({checkins.length}) </h3> <div className="space-y-2"> {checkins.map((checkin) => ( <div key={checkin.id} className="flex items-center justify-between p-2 border rounded hover:bg-surface cursor-pointer" onClick={() => setShowDetails(showDetails === checkin.id ? null : checkin.id)} > <div className="flex items-center gap-2 flex-1"> {checkin.short_quantity > 0 ? ( <Minus className="h-5 w-5 text-amber-600" /> ) : checkin.received_condition !=="good" ? ( <AlertCircle className="h-5 w-5 text-red-600" /> ) : ( <CheckCircle2 className="h-5 w-5 text-green-600" /> )} <div className="flex-1"> <p className="font-medium text-sm">{checkin.product_name}</p> <p className="text-xs text-muted-foreground"> {checkin.received_quantity} of {checkin.po_quantity} </p> </div> </div> <div className="flex gap-1"> {checkin.short_quantity > 0 && ( <Badge variant="outline" className="bg-amber-50"> Short {checkin.short_quantity} </Badge> )} {checkin.received_condition !=="good" && ( <Badge variant="outline" className="bg-red-50"> {checkin.received_condition} </Badge> )} </div> </div> ))} </div> </div> )} </div> );
}
