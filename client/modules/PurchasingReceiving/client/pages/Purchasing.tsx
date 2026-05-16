import React, { useEffect, useMemo, useState } from "react";
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
  ShoppingCart,
  Plus,
  Users,
  Zap,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
  Star,
  Send,
  AlertTriangle,
} from "lucide-react";
interface Vendor {
  id: string;
  name: string;
  paymentTerms: string;
  status: "active" | "inactive";
  avgDelivery: number;
  lastOrder: string;
  totalOrders: number;
}
interface QuickOrderTemplate {
  id: string;
  name: string;
  vendor: string;
  items: number;
  frequency: string;
  lastUsed: string;
} // Generate mock vendors
const generateMockVendors = () => {
  const vendorNames = [
    "US Foods",
    "Sysco",
    "Local Produce Co",
    "Restaurant Depot",
    "Reinhart",
    "Gordon Food Service",
  ];
  const paymentTerms = ["NET_30", "NET_60", "COD"];
  const vendors = [];
  for (let i = 0; i < vendorNames.length; i++) {
    vendors.push({
      id: `vendor-${i}`,
      name: vendorNames[i],
      paymentTerms:
        paymentTerms[Math.floor(Math.random() * paymentTerms.length)],
      status: "active" as const,
      avgDelivery: Math.floor(Math.random() * 3) + 1,
      lastOrder: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      totalOrders: Math.floor(Math.random() * 50) + 5,
    });
  }
  return vendors;
}; // Quick order templates
const QUICK_TEMPLATES: QuickOrderTemplate[] = [
  {
    id: "t1",
    name: "Weekly Produce",
    vendor: "Local Produce Co",
    items: 15,
    frequency: "Weekly",
    lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t2",
    name: "Proteins Stock",
    vendor: "US Foods",
    items: 8,
    frequency: "Bi-Weekly",
    lastUsed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t3",
    name: "Dairy & Eggs",
    vendor: "Sysco",
    items: 12,
    frequency: "Weekly",
    lastUsed: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
const MOCK_VENDORS = generateMockVendors();
const ITEMS_PER_PAGE = 15;
export default function Purchasing() {
  const { currentOutlet } = useMultiOutlet();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("guide");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<QuickOrderTemplate | null>(null); // Keyboard shortcuts useEffect(() => { const handleKeyPress = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) { if (e.key ==="1") setActiveTab("guide"); if (e.key ==="2") { setActiveTab("create"); setShowCreatePO(true); } if (e.key ==="3") setActiveTab("commissary"); if (e.key ==="4") setActiveTab("vendors"); } if (e.key ==="?") setShowKeyboardHelp(!showKeyboardHelp); if (e.key ==="Escape") setSelectedVendor(null); }; window.addEventListener("keydown", handleKeyPress); return () => window.removeEventListener("keydown", handleKeyPress); }, [showKeyboardHelp]); // Filter vendors const filteredVendors = useMemo(() => { return vendors.filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()) ); }, [vendors, searchTerm]); // Pagination const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE); const paginatedVendors = useMemo(() => { const start = (currentPage - 1) * ITEMS_PER_PAGE; return filteredVendors.slice(start, start + ITEMS_PER_PAGE); }, [filteredVendors, currentPage]); // Metrics const metrics = useMemo(() => { return { total_vendors: vendors.length, active: vendors.filter((v) => v.status ==="active").length, quick_templates: QUICK_TEMPLATES.length, }; }, [vendors]); return ( <AppLayout> <div className="space-y-4"> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold flex items-center gap-2"> <ShoppingCart className="h-6 w-6" /> Purchasing Operations </h1> <p className="text-xs text-slate-400 mt-1">Order guide, PO creation, commissary, vendor management</p> </div> <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} className="text-slate-400 hover:text-slate-200" > <HelpCircle className="h-4 w-4" /> </Button> </div> {/* Keyboard Help */} {showKeyboardHelp && ( <Alert className="border-slate-600 bg-slate-800/50"> <div className="flex items-start justify-between gap-4"> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+1</kbd> Order Guide</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+2</kbd> Create PO</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+3</kbd> Commissary</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+4</kbd> Vendors</div> </div> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Esc</kbd> Close modal</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">?</kbd> Toggle help</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+N</kbd> New PO from template</div> </div> </div> </Alert> )} {/* Compact KPI Row */} <div className="grid gap-3 grid-cols-3"> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Active Vendors</div> <p className="text-2xl font-bold">{metrics.active}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Total Vendors</div> <p className="text-2xl font-bold">{metrics.total_vendors}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Quick Templates</div> <p className="text-2xl font-bold text-blue-400">{metrics.quick_templates}</p> </CardContent> </Card> </div> {/* Tabs */} <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3"> <TabsList className="bg-surface border-b border-border h-auto w-full justify-start rounded-none p-0"> <TabsTrigger value="guide" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <TrendingUp className="h-4 w-4 mr-2" /> Order Guide </TabsTrigger> <TabsTrigger value="create" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <Plus className="h-4 w-4 mr-2" /> Create PO </TabsTrigger> <TabsTrigger value="commissary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <Zap className="h-4 w-4 mr-2" /> Commissary Orders </TabsTrigger> <TabsTrigger value="vendors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"> <Users className="h-4 w-4 mr-2" /> Vendors ({metrics.total_vendors}) </TabsTrigger> </TabsList> {/* Order Guide Tab */} <TabsContent value="guide"> <Card className="border-border bg-surface"> <CardHeader> <CardTitle>Quick Order Templates</CardTitle> <CardDescription>Frequently used orders - click to create new PO</CardDescription> </CardHeader> <CardContent className="space-y-3"> {QUICK_TEMPLATES.map((template) => ( <div key={template.id} onClick={() => { setSelectedTemplate(template); setShowCreatePO(true); setActiveTab("create"); }} className="p-3 border border-border rounded-lg hover:border-primary cursor-pointer transition-colors bg-surface" > <div className="flex items-start justify-between"> <div className="flex-1"> <div className="flex items-center gap-2 mb-1"> <Star className="h-4 w-4 text-yellow-500" /> <h3 className="font-semibold text-sm">{template.name}</h3> </div> <p className="text-xs text-slate-400">{template.vendor} • {template.items} items • {template.frequency}</p> </div> <Button size="sm" className="h-7 px-2 text-xs"> <Send className="h-3 w-3 mr-1" /> Order </Button> </div> </div> ))} </CardContent> </Card> </TabsContent> {/* Create PO Tab */} <TabsContent value="create"> <Card className="border-border bg-surface"> <CardHeader> <CardTitle>Create Purchase Order</CardTitle> {selectedTemplate && ( <CardDescription>Using template: {selectedTemplate.name} ({selectedTemplate.items} items)</CardDescription> )} </CardHeader> <CardContent> <div className="text-sm text-slate-400 p-4 text-center"> <p>Complete PO form with vendor catalog, department selection, GL codes, and notes.</p> <p className="mt-2 text-xs">See previous section for detailed form implementation.</p> </div> </CardContent> </Card> </TabsContent> {/* Commissary Tab */} <TabsContent value="commissary"> <Card className="border-border bg-surface"> <CardHeader> <CardTitle>Commissary Orders</CardTitle> <CardDescription>Inter-outlet transfers and central storeroom ordering</CardDescription> </CardHeader> <CardContent> <p className="text-sm text-slate-400">Browse central storeroom inventory and create transfer requests to other outlets.</p> </CardContent> </Card> </TabsContent> {/* Vendors Tab */} <TabsContent value="vendors" className="space-y-3"> <div className="flex gap-2 items-center"> <Input placeholder="Search vendors..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="bg-slate-800 border-slate-600 h-8 text-sm" /> <Button size="sm" className="h-8 px-3 text-xs bg-primary"> <Plus className="h-3 w-3 mr-1" /> New Vendor </Button> </div> <Card className="border-border bg-surface"> <CardContent className="p-0"> <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow className="hover:bg-transparent border-border"> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Vendor</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Payment Terms</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Avg Delivery</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Total Orders</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Last Order</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Status</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Actions</TableHead> </TableRow> </TableHeader> <TableBody> {paginatedVendors.map((vendor) => ( <TableRow key={vendor.id} className="hover:bg-slate-800/30 border-border h-8 cursor-pointer" onClick={() => setSelectedVendor(vendor)} > <TableCell className="text-sm font-semibold text-blue-400 p-2">{vendor.name}</TableCell> <TableCell className="text-xs text-slate-400 p-2 uppercase">{vendor.paymentTerms}</TableCell> <TableCell className="text-xs p-2">{vendor.avgDelivery} days</TableCell> <TableCell className="text-xs p-2 font-medium">{vendor.totalOrders}</TableCell> <TableCell className="text-xs text-slate-400 p-2"> {new Date(vendor.lastOrder).toLocaleDateString()} </TableCell> <TableCell className="p-2"> <Badge className="bg-green-500/20 text-green-300">Active</Badge> </TableCell> <TableCell className="p-2" onClick={(e) => e.stopPropagation()}> <Button size="sm" className="h-6 px-2 text-xs" onClick={() => { setSelectedTemplate(QUICK_TEMPLATES[0]); setShowCreatePO(true); }}> Order </Button> </TableCell> </TableRow> ))} </TableBody> </Table> </div> {/* Pagination */} <div className="flex items-center justify-between p-3 border-t border-border bg-surface"> <span className="text-xs text-slate-400"> {filteredVendors.length === 0 ?"No results" : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredVendors.length)} of ${filteredVendors.length}`} </span> <div className="flex gap-2"> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs border-slate-600"> <ChevronLeft className="h-3 w-3" /> </Button> <span className="text-xs text-slate-400 px-2">Page {currentPage} of {totalPages || 1}</span> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-7 px-2 text-xs border-slate-600"> <ChevronRight className="h-3 w-3" /> </Button> </div> </div> </CardContent> </Card> </TabsContent> </Tabs> {/* Detail Modal */} {selectedVendor && ( <div className="fixed inset-0 bg-black/50 flex items-end z-50"> <div className="bg-surface border-t border-border w-full max-w-2xl ml-auto animate-in slide-in-from-right"> <div className="p-4 border-b border-border flex items-center justify-between"> <div> <h2 className="text-lg font-bold">{selectedVendor.name}</h2> <p className="text-xs text-slate-400">Vendor Details</p> </div> <Button variant="ghost" size="sm" onClick={() => setSelectedVendor(null)} className="h-6 w-6 p-0"> <X className="h-4 w-4" /> </Button> </div> <div className="p-4 space-y-4 max-h-96 overflow-y-auto"> <div className="grid grid-cols-2 gap-4 text-sm"> <div> <p className="text-xs text-slate-400">Payment Terms</p> <p className="text-sm font-medium uppercase">{selectedVendor.paymentTerms}</p> </div> <div> <p className="text-xs text-slate-400">Avg Delivery</p> <p className="text-sm font-medium">{selectedVendor.avgDelivery} days</p> </div> <div> <p className="text-xs text-slate-400">Total Orders</p> <p className="text-sm font-medium">{selectedVendor.totalOrders}</p> </div> <div> <p className="text-xs text-slate-400">Status</p> <Badge className="bg-green-500/20 text-green-300 text-xs">Active</Badge> </div> </div> <div className="pt-2 border-t border-border"> <Button className="w-full bg-primary h-8 text-sm"> <ShoppingCart className="h-4 w-4 mr-2" /> Create Order from Catalog </Button> </div> </div> </div> </div> )} </div> </AppLayout> );
}
