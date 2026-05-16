import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Scan,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  Loader,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast"; /** * Invoice Scan Component * Connects invoice scanning to inventory updates by outlet */
export default function InvoiceScan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [scannedInvoices, setScannedInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // Mock outlets - replace with actual data const outlets = useMemo(() => [ { id:"main", name:"Main Kitchen" }, { id:"bar", name:"Bar & Lounge" }, { id:"commissary", name:"Commissary" }, { id:"freezer", name:"Freezer Room" }, { id:"dry-storage", name:"Dry Storage" }, ], []); // Load scanned invoices for selected outlet useEffect(() => { if (selectedOutlet) { loadScannedInvoices(selectedOutlet); } else { setScannedInvoices([]); } }, [selectedOutlet]); const loadScannedInvoices = async (outletId: string) => { setLoading(true); try { const response = await fetch(`/api/invoices?outletId=${outletId}&status=scanned`); if (response.ok) { const data = await response.json(); setScannedInvoices(data.invoices || []); } } catch (error) { console.error("Failed to load scanned invoices:", error); toast({ title:"Error", description:"Failed to load scanned invoices", variant:"destructive", }); } finally { setLoading(false); } }; const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !selectedOutlet) { toast({ title:"Error", description:"Please select an outlet first", variant:"destructive", }); return; } setUploading(true); try { const formData = new FormData(); formData.append("invoice", file); formData.append("outletId", selectedOutlet); formData.append("userId", user?.id ||""); const response = await fetch("/api/invoices/scan", { method:"POST", body: formData, }); if (response.ok) { const result = await response.json(); toast({ title:"Invoice Scanned", description: `Invoice scanned: ${result.invoiceNumber}`, }); await loadScannedInvoices(selectedOutlet); } else { const error = await response.json(); toast({ title:"Scan Failed", description: error.message ||"Failed to scan invoice", variant:"destructive", }); } } catch (error) { console.error("Failed to scan invoice:", error); toast({ title:"Error", description:"Failed to scan invoice", variant:"destructive", }); } finally { setUploading(false); } }; const handleApproveInvoice = async (invoiceId: string) => { try { const response = await fetch(`/api/invoices/${invoiceId}/approve`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ outletId: selectedOutlet, userId: user?.id, }), }); if (response.ok) { // Update inventory based on invoice line items await updateInventoryFromInvoice(invoiceId); toast({ title:"Invoice Approved", description:"Invoice approved and inventory updated", }); await loadScannedInvoices(selectedOutlet); } else { const error = await response.json(); toast({ title:"Approval Failed", description: error.message ||"Failed to approve invoice", variant:"destructive", }); } } catch (error) { console.error("Failed to approve invoice:", error); toast({ title:"Error", description:"Failed to approve invoice", variant:"destructive", }); } }; const updateInventoryFromInvoice = async (invoiceId: string) => { try { // Get invoice details const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`); if (!invoiceResponse.ok) return; const invoice = await invoiceResponse.json(); // Update inventory for each line item for (const line of invoice.lineItems || []) { await fetch("/api/inventory/update-from-invoice", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ outletId: selectedOutlet, itemId: line.itemId, itemName: line.itemName, quantity: line.quantity, unit: line.unit, unitCost: line.unitCost, totalCost: line.totalCost, invoiceId: invoiceId, lotNumber: line.lotNumber, expiryDate: line.expiryDate, }), }); } toast({ title:"Inventory Updated", description: `Inventory updated for ${invoice.lineItems?.length || 0} items`, }); } catch (error) { console.error("Failed to update inventory:", error); toast({ title:"Warning", description:"Invoice approved but inventory update had issues", variant:"destructive", }); } }; const filteredInvoices = useMemo(() => { if (!selectedOutlet) return []; return scannedInvoices.filter((inv) => inv.outletId === selectedOutlet); }, [scannedInvoices, selectedOutlet]); return ( <div className="p-4 space-y-4"> <div className="flex items-center justify-between mb-6"> <div> <h2 className="text-xl font-semibold flex items-center gap-2"> <Scan className="w-6 h-6 text-primary" /> Invoice Scan </h2> <p className="text-sm text-muted-foreground mt-1"> Scan invoices to automatically update inventory by outlet </p> </div> <div className="flex items-center gap-4"> <Select value={selectedOutlet} onValueChange={setSelectedOutlet}> <SelectTrigger className="w-[200px]"> <SelectValue placeholder="Select Outlet" /> </SelectTrigger> <SelectContent> {outlets.map((outlet) => ( <SelectItem key={outlet.id} value={outlet.id}> {outlet.name} </SelectItem> ))} </SelectContent> </Select> <div className="relative"> <Input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={!selectedOutlet || uploading} className="hidden" id="invoice-upload" /> <Button onClick={() => document.getElementById("invoice-upload")?.click()} disabled={!selectedOutlet || uploading} > {uploading ? ( <> <Loader className="w-4 h-4 mr-2 animate-spin" /> Scanning... </> ) : ( <> <Upload className="w-4 h-4 mr-2" /> Scan Invoice </> )} </Button> </div> </div> </div> {!selectedOutlet ? ( <Card> <CardContent className="py-12 text-center"> <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" /> <p className="text-muted-foreground"> Select an outlet to scan invoices and update inventory </p> </CardContent> </Card> ) : loading ? ( <Card> <CardContent className="py-12 text-center"> <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" /> <p className="text-muted-foreground">Loading scanned invoices...</p> </CardContent> </Card> ) : filteredInvoices.length === 0 ? ( <Card> <CardContent className="py-12 text-center"> <Scan className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" /> <p className="text-muted-foreground mb-4"> No scanned invoices found for this outlet </p> <Button onClick={() => document.getElementById("invoice-upload")?.click()} > <Upload className="w-4 h-4 mr-2" /> Scan First Invoice </Button> </CardContent> </Card> ) : ( <Card> <CardHeader> <CardTitle>Scanned Invoices ({filteredInvoices.length})</CardTitle> <CardDescription> Review and approve invoices to update inventory </CardDescription> </CardHeader> <CardContent> <Table> <TableHeader> <TableRow> <TableHead>Invoice #</TableHead> <TableHead>Vendor</TableHead> <TableHead>Date</TableHead> <TableHead>Items</TableHead> <TableHead>Total</TableHead> <TableHead>Status</TableHead> <TableHead>Actions</TableHead> </TableRow> </TableHeader> <TableBody> {filteredInvoices.map((invoice) => ( <TableRow key={invoice.id}> <TableCell className="font-medium"> {invoice.invoiceNumber ||"N/A"} </TableCell> <TableCell>{invoice.vendorName ||"Unknown"}</TableCell> <TableCell> {invoice.date ? new Date(invoice.date).toLocaleDateString() :"N/A"} </TableCell> <TableCell>{invoice.lineItems?.length || 0}</TableCell> <TableCell> ${invoice.totalAmount?.toFixed(2) ||"0.00"} </TableCell> <TableCell> <Badge variant={ invoice.status ==="approved" ?"default" : invoice.status ==="rejected" ?"destructive" :"secondary" } > {invoice.status?.toUpperCase() ||"PENDING"} </Badge> </TableCell> <TableCell> {invoice.status !=="approved" && ( <Button size="sm" onClick={() => handleApproveInvoice(invoice.id)} > <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Update </Button> )} {invoice.status ==="approved" && ( <Badge variant="default"> <CheckCircle2 className="w-3 h-3 mr-1" /> Applied </Badge> )} </TableCell> </TableRow> ))} </TableBody> </Table> </CardContent> </Card> )} </div> );
}
