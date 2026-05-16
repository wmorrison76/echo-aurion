import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Plus,
  Edit2,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Phone,
  Mail,
} from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns"; // Mock vendor data
const MOCK_VENDORS = [
  {
    id: "vendor-1",
    name: "US Foods",
    contact_name: "John Smith",
    contact_email: "john@usfoods.com",
    contact_phone: "(555) 123-4567",
    is_active: true,
    created_at: "2024-01-15",
    payment_methods: ["ACH", "Check"],
    default_payment_terms: "net_30",
  },
  {
    id: "vendor-2",
    name: "Sysco",
    contact_name: "Sarah Johnson",
    contact_email: "sarah@sysco.com",
    contact_phone: "(555) 234-5678",
    is_active: true,
    created_at: "2024-02-01",
    payment_methods: ["ACH", "Credit Card"],
    default_payment_terms: "net_60",
  },
  {
    id: "vendor-3",
    name: "Local Produce Co",
    contact_name: "Mike Davis",
    contact_email: "mike@localproduce.com",
    contact_phone: "(555) 345-6789",
    is_active: true,
    created_at: "2024-01-20",
    payment_methods: ["Check", "Cash"],
    default_payment_terms: "cod",
  },
]; // Mock contract data
const MOCK_CONTRACTS = [
  {
    id: "contract-1",
    vendor_id: "vendor-1",
    vendor_name: "US Foods",
    contract_number: "USFD-2024-001",
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    status: "active",
    payment_terms: "net_30",
    value: 250000,
    auto_renewal: true,
    renewal_date: "2024-11-01",
  },
  {
    id: "contract-2",
    vendor_id: "vendor-2",
    vendor_name: "Sysco",
    contract_number: "SYS-2024-002",
    start_date: "2024-02-01",
    end_date: "2025-01-31",
    status: "active",
    payment_terms: "net_60",
    value: 180000,
    auto_renewal: true,
    renewal_date: "2024-12-01",
  },
  {
    id: "contract-3",
    vendor_id: "vendor-3",
    vendor_name: "Local Produce Co",
    contract_number: "LPC-2024-003",
    start_date: "2024-01-20",
    end_date: "2024-10-20",
    status: "expiring_soon",
    payment_terms: "cod",
    value: 45000,
    auto_renewal: false,
    renewal_date: "2024-09-20",
  },
];
const PAYMENT_TERMS_OPTIONS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_60", label: "Net 60" },
  { value: "net_90", label: "Net 90" },
  { value: "2_10_net_30", label: "2/10 Net 30" },
];
const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-700 border-green-200/30";
    case "expiring_soon":
      return "bg-amber-500/10 text-amber-700 border-amber-200/30";
    case "expired":
      return "bg-red-500/10 text-red-700 border-red-200/30";
    case "draft":
      return "bg-slate-500/10 text-foreground border-slate-200/30";
    default:
      return "bg-slate-500/10 text-foreground border-slate-200/30";
  }
};
export default function VendorManagement() {
  const { currentOutlet } = useMultiOutlet();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<
    (typeof MOCK_VENDORS)[0] | null
  >(null);
  const [showAddVendor, setShowAddVendor] = useState(false); // Filter vendors const filteredVendors = useMemo(() => { return MOCK_VENDORS.filter( (vendor) => vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || vendor.contact_email.toLowerCase().includes(searchQuery.toLowerCase()), ); }, [searchQuery]); // Get contracts for selected vendor const vendorContracts = useMemo(() => { if (!selectedVendor) return MOCK_CONTRACTS; return MOCK_CONTRACTS.filter((c) => c.vendor_id === selectedVendor.id); }, [selectedVendor]); // Calculate metrics const metrics = useMemo(() => { return { totalVendors: MOCK_VENDORS.filter((v) => v.is_active).length, activeContracts: MOCK_CONTRACTS.filter((c) => c.status ==="active") .length, expiringContracts: MOCK_CONTRACTS.filter( (c) => c.status ==="expiring_soon", ).length, totalContractValue: MOCK_CONTRACTS.reduce((sum, c) => sum + c.value, 0), }; }, []); return ( <AppLayout> <div className="space-y-6"> <div className="flex items-center justify-between"> <div> <h1 className="text-3xl font-bold flex items-center gap-2"> <Building2 className="h-8 w-8" /> Vendor Management </h1> <p className="text-slate-400 mt-2"> Manage supplier relationships, contracts, and payment terms </p> </div> <Button onClick={() => setShowAddVendor(true)} className="bg-primary text-primary-foreground" > <Plus className="h-4 w-4 mr-2" /> Add Vendor </Button> </div> {/* Key Metrics */} <div className="grid gap-4 md:grid-cols-4"> <Card className="border-border bg-surface"> <CardContent className="pt-6"> <div> <p className="text-sm text-slate-400">Active Vendors</p> <p className="text-3xl font-bold text-slate-200"> {metrics.totalVendors} </p> </div> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-6"> <div> <p className="text-sm text-slate-400">Active Contracts</p> <p className="text-3xl font-bold text-green-400"> {metrics.activeContracts} </p> </div> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-6"> <div> <p className="text-sm text-slate-400">Expiring Soon</p> <p className="text-3xl font-bold text-amber-400"> {metrics.expiringContracts} </p> </div> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-6"> <div> <p className="text-sm text-slate-400">Contract Value</p> <p className="text-3xl font-bold text-slate-200"> ${(metrics.totalContractValue / 1000).toFixed(0)}K </p> </div> </CardContent> </Card> </div> <Tabs defaultValue="vendors" className="w-full"> <TabsList className="grid w-full grid-cols-2"> <TabsTrigger value="vendors">Vendors</TabsTrigger> <TabsTrigger value="contracts">Contracts & Terms</TabsTrigger> </TabsList> {/* Vendors Tab */} <TabsContent value="vendors" className="space-y-4 mt-6"> <Card className="border-border bg-surface"> <CardHeader> <CardTitle>Vendor Directory</CardTitle> <CardDescription> {filteredVendors.length} vendors {!searchQuery &&"in system"} </CardDescription> </CardHeader> <CardContent className="space-y-4"> <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-800 border-slate-600" /> {filteredVendors.length === 0 ? ( <p className="text-center py-8 text-slate-400"> No vendors found </p> ) : ( <div className="space-y-3"> {filteredVendors.map((vendor) => ( <div key={vendor.id} onClick={() => setSelectedVendor(vendor)} className="p-4 border border-border rounded-lg hover:border-slate-500 cursor-pointer transition-colors bg-surface" > <div className="flex items-start justify-between mb-3"> <div> <h3 className="font-semibold text-lg"> {vendor.name} </h3> <p className="text-sm text-slate-400"> {vendor.contact_name} </p> </div> <Badge variant={vendor.is_active ?"default" :"secondary"} > {vendor.is_active ?"Active" :"Inactive"} </Badge> </div> <div className="grid grid-cols-2 gap-4 text-sm"> <div className="flex items-center gap-2 text-slate-400"> <Mail className="h-4 w-4" /> {vendor.contact_email} </div> <div className="flex items-center gap-2 text-slate-400"> <Phone className="h-4 w-4" /> {vendor.contact_phone} </div> </div> <div className="mt-3 flex items-center gap-2"> <span className="text-xs text-muted-foreground"> Payment methods: </span> {vendor.payment_methods.map((method) => ( <Badge key={method} variant="outline" className="text-xs" > {method} </Badge> ))} </div> </div> ))} </div> )} </CardContent> </Card> {/* Vendor Details */} {selectedVendor && ( <Card className="border-border bg-surface"> <CardHeader> <div className="flex items-center justify-between"> <div> <CardTitle>{selectedVendor.name} - Details</CardTitle> <CardDescription> {vendorContracts.length} active contract {vendorContracts.length !== 1 ?"s" :""} </CardDescription> </div> <Button variant="ghost" size="sm" onClick={() => setSelectedVendor(null)} > ✕ </Button> </div> </CardHeader> <CardContent className="space-y-4"> <div className="grid grid-cols-2 gap-4"> <div> <p className="text-sm text-slate-400">Contact Name</p> <p className="font-medium"> {selectedVendor.contact_name} </p> </div> <div> <p className="text-sm text-slate-400"> Default Payment Terms </p> <p className="font-medium"> {PAYMENT_TERMS_OPTIONS.find( (t) => t.value === selectedVendor.default_payment_terms, )?.label || selectedVendor.default_payment_terms} </p> </div> <div> <p className="text-sm text-slate-400">Email</p> <p className="font-medium text-blue-400"> {selectedVendor.contact_email} </p> </div> <div> <p className="text-sm text-slate-400">Phone</p> <p className="font-medium"> {selectedVendor.contact_phone} </p> </div> </div> <div className="pt-4 border-t border-border"> <h4 className="font-semibold mb-3">Contracts</h4> {vendorContracts.length === 0 ? ( <p className="text-sm text-slate-400">No contracts</p> ) : ( <div className="space-y-2"> {vendorContracts.map((contract) => ( <div key={contract.id} className="p-3 bg-slate-800/20 rounded border border-border" > <div className="flex items-center justify-between mb-2"> <p className="font-medium text-sm"> {contract.contract_number} </p> <Badge className={getStatusColor(contract.status)} > {contract.status.replace(/_/g,"")} </Badge> </div> <p className="text-xs text-slate-400"> {format( parseISO(contract.start_date),"MMM d, yyyy", )}{""} -{""} {format( parseISO(contract.end_date),"MMM d, yyyy", )} </p> </div> ))} </div> )} </div> </CardContent> </Card> )} </TabsContent> {/* Contracts Tab */} <TabsContent value="contracts" className="space-y-4 mt-6"> <Card className="border-border bg-surface"> <CardHeader> <CardTitle>Supplier Contracts</CardTitle> <CardDescription> {MOCK_CONTRACTS.length} contracts </CardDescription> </CardHeader> <CardContent> <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow className="hover:bg-transparent"> <TableHead className="text-slate-300"> Contract </TableHead> <TableHead className="text-slate-300">Vendor</TableHead> <TableHead className="text-slate-300"> Payment Terms </TableHead> <TableHead className="text-slate-300">Dates</TableHead> <TableHead className="text-slate-300">Status</TableHead> <TableHead className="text-right text-slate-300"> Value </TableHead> </TableRow> </TableHeader> <TableBody> {MOCK_CONTRACTS.map((contract) => ( <TableRow key={contract.id} className="hover:bg-slate-800/30" > <TableCell> <p className="font-mono text-sm"> {contract.contract_number} </p> </TableCell> <TableCell className="font-medium"> {contract.vendor_name} </TableCell> <TableCell> <Badge variant="outline"> {PAYMENT_TERMS_OPTIONS.find( (t) => t.value === contract.payment_terms, )?.label || contract.payment_terms} </Badge> </TableCell> <TableCell className="text-sm text-slate-400"> {format(parseISO(contract.start_date),"MMM d")} -{""} {format(parseISO(contract.end_date),"MMM d")} </TableCell> <TableCell> <Badge className={getStatusColor(contract.status)}> {contract.status.replace(/_/g,"")} </Badge> </TableCell> <TableCell className="text-right font-semibold"> ${(contract.value / 1000).toFixed(0)}K </TableCell> </TableRow> ))} </TableBody> </Table> </div> </CardContent> </Card> </TabsContent> </Tabs> </div> </AppLayout> );
}
