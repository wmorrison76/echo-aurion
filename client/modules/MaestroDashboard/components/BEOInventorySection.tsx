/** * BEO Inventory Section * * Shows inventory status with integration to Purchasing/Receiving module: * - On-hand quantities from inventory system * - Pending deliveries from purchase orders * - Shortage alerts and recommended orders * - Direct link to Purchasing/Receiving module for detailed view */ import React, {
  useState,
  useEffect,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingDown } from "lucide-react";
import { maestroEventBus } from "@/lib/maestro-event-bus";
import type { InventoryStatus } from "@/hooks/useBEODetail";
interface BEOInventorySectionProps {
  inventory: InventoryStatus[];
  beoId: string;
}
interface EnrichedInventoryItem extends InventoryStatus {
  productId?: string;
  locationId?: string;
  purchaseOrderId?: string;
  recommendedOrder?: number;
  supplierName?: string;
  lastCost?: number;
}
function getStatusColor(status: "covered" | "tight" | "short"): string {
  switch (status) {
    case "covered":
      return "bg-green-900 text-green-200";
    case "tight":
      return "bg-yellow-900 text-yellow-200";
    case "short":
      return "bg-red-900 text-red-200";
  }
}
export function BEOInventorySection({
  inventory,
  beoId,
}: BEOInventorySectionProps) {
  const [enrichedInventory, setEnrichedInventory] =
    useState<EnrichedInventoryItem[]>(inventory);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isCreatingPO, setIsCreatingPO] = useState<string | null>(null); // Fetch enriched inventory data with purchase order info useEffect(() => { const fetchInventoryDetails = async () => { setIsLoadingInventory(true); try { const response = await fetch(`/api/beo/${beoId}/inventory-enriched`, { headers: {"Content-Type":"application/json" }, }); if (response.ok) { const data = await response.json(); setEnrichedInventory(data.items); } } catch (error) { console.error("Failed to fetch enriched inventory:", error); } finally { setIsLoadingInventory(false); } }; if (beoId) { fetchInventoryDetails(); } }, [beoId]); const handleCreatePurchaseOrder = async (item: EnrichedInventoryItem) => { if (!item.recommendedOrder || !item.productId) return; setIsCreatingPO(item.itemName); try { const response = await fetch(`/api/beo/${beoId}/create-purchase-order`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ productId: item.productId, quantity: item.recommendedOrder, itemName: item.itemName, unit: item.unit, }), }); if (response.ok) { const poData = await response.json(); maestroEventBus.emit("BEO_PURCHASE_ORDER_CREATED", { beoId, poId: poData.id, itemName: item.itemName, }); // Re-fetch inventory const updatedResponse = await fetch( `/api/beo/${beoId}/inventory-enriched`, { headers: {"Content-Type":"application/json" }, }, ); if (updatedResponse.ok) { const updatedData = await updatedResponse.json(); setEnrichedInventory(updatedData.items); } } } catch (error) { console.error("Failed to create purchase order:", error); } finally { setIsCreatingPO(null); } }; const handleOpenPurchasingModule = () => { // Emit event for main app to open Purchasing/Receiving module maestroEventBus.emit("OPEN_MODULE", { moduleName:"PurchasingReceiving", context: { beoId }, }); }; const shortageItems = enrichedInventory.filter((i) => i.status ==="short"); return ( <Card className="bg-slate-800 border-border p-6"> <div className="flex items-center justify-between mb-4"> <div className="flex items-center gap-2"> <h3 className="text-sm font-semibold text-white">Inventory Status</h3> {shortageItems.length > 0 && ( <Badge variant="destructive" className="text-xs"> {shortageItems.length} short </Badge> )} </div> <Button size="sm" variant="outline" onClick={handleOpenPurchasingModule} className="text-xs h-7 px-2" > View in Purchasing → </Button> </div> {/* Shortage Alert */} {shortageItems.length > 0 && ( <div className="mb-4 p-3 rounded-lg border border-red-700 bg-red-900/20 flex items-start gap-3"> <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" /> <div className="text-xs text-red-200"> <p className="font-medium mb-1"> ⚠️ {shortageItems.length} item(s) below required quantities </p> <p className="text-red-300/80"> Create purchase orders or adjust menu items </p> </div> </div> )} {enrichedInventory.length === 0 ? ( <p className="text-xs text-slate-400">No inventory items</p> ) : ( <div className="space-y-3 text-xs"> {enrichedInventory.map((item) => ( <div key={item.itemName} className={`p-3 rounded border transition-colors ${ item.status ==="short" ?"bg-red-900/20 border-red-700/50" :"bg-surface border-border" }`} > <div className="flex items-start justify-between mb-2"> <div className="flex-1"> <p className="text-white font-medium">{item.itemName}</p> {item.supplierName && ( <p className="text-slate-400 text-xs"> Supplier: {item.supplierName} </p> )} </div> <Badge className={`${getStatusColor(item.status)} text-xs`}> {item.status} </Badge> </div> <div className="grid grid-cols-4 gap-2 mb-2 text-slate-300"> <div className="bg-slate-800/50 p-2 rounded"> <p className="text-muted-foreground text-xs">On Hand</p> <p className="font-medium"> {item.onHand} {item.unit} </p> </div> <div className="bg-slate-800/50 p-2 rounded"> <p className="text-muted-foreground text-xs">Needed</p> <p className="font-medium text-orange-300"> {item.onHand + item.pendingDelivery >= 0 ?"0" : Math.abs(item.onHand + item.pendingDelivery)}{""} {item.unit} </p> </div> <div className="bg-slate-800/50 p-2 rounded"> <p className="text-muted-foreground text-xs">Pending</p> <p className="font-medium"> {item.pendingDelivery} {item.unit} </p> {item.estimatedArrival && ( <p className="text-slate-400 text-xs"> ETA:{""} {new Date(item.estimatedArrival).toLocaleDateString("en-US", { month:"short", day:"numeric" }, )} </p> )} </div> <div className="bg-slate-800/50 p-2 rounded"> <p className="text-muted-foreground text-xs">Total Avail</p> <p className="font-medium"> {item.onHand + item.pendingDelivery} {item.unit} </p> {item.lastCost && ( <p className="text-slate-400 text-xs"> ${(item.lastCost * (item.onHand + item.pendingDelivery)).toFixed(2)} </p> )} </div> </div> {/* Action for short items */} {item.status ==="short" && item.recommendedOrder && ( <div className="flex items-center gap-2 pt-2 border-t border-border"> <TrendingDown className="h-3 w-3 text-orange-400" /> <p className="text-slate-300 flex-1"> Recommend ordering {item.recommendedOrder} more {item.unit} </p> <Button size="sm" variant="ghost" onClick={() => handleCreatePurchaseOrder(item)} disabled={isCreatingPO === item.itemName} className="text-xs h-6 px-2 text-blue-400 hover:text-primary" > {isCreatingPO === item.itemName ?"Creating..." :"Create PO"} </Button> </div> )} </div> ))} </div> )} </Card> );
}
