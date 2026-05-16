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
  Box,
  Layout,
  CheckSquare,
  Smartphone,
  Mic2,
  Share2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
  TrendingDown,
  Plus,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  par: number;
  status: "ok" | "low" | "high" | "alert";
  lastCount: string;
  variance: number;
} // Generate mock inventory
const generateMockInventory = () => {
  const categories = ["Proteins", "Vegetables", "Dairy", "Pantry", "Beverages"];
  const items = [];
  for (let i = 1; i <= 100; i++) {
    const par = Math.floor(Math.random() * 50) + 10;
    const onHand = Math.floor(Math.random() * 60) + 5;
    let status: "ok" | "low" | "high" | "alert" = "ok";
    if (onHand < par * 0.5) status = "low";
    else if (onHand > par * 1.5) status = "high";
    if (onHand === 0) status = "alert";
    items.push({
      id: `item-${i}`,
      itemCode: `ITEM-${1000 + i}`,
      name: `Item ${i}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      unit: Math.random() > 0.5 ? "pieces" : "lbs",
      onHand,
      par,
      status,
      lastCount: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      variance: Math.random() * 20 - 10,
    });
  }
  return items;
};
const MOCK_INVENTORY = generateMockInventory();
const ITEMS_PER_PAGE = 20;
const getStatusColor = (status: string) => {
  switch (status) {
    case "ok":
      return "bg-green-500/20 text-green-300";
    case "low":
      return "bg-amber-500/20 text-amber-300";
    case "high":
      return "bg-primary/20 text-primary";
    case "alert":
      return "bg-red-500/20 text-red-300";
    default:
      return "bg-slate-500/20 text-slate-300";
  }
};
export default function Inventory() {
  const { currentOutlet } = useMultiOutlet();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false); // Keyboard shortcuts useEffect(() => { const handleKeyPress = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) { if (e.key ==="1") setActiveTab("overview"); if (e.key ==="2") setActiveTab("layout"); if (e.key ==="3") setActiveTab("counts"); if (e.key ==="4") setActiveTab("mobile"); if (e.key ==="5") setActiveTab("voice"); if (e.key ==="6") setActiveTab("sync"); if (e.key ==="7") setActiveTab("snapshots"); } if (e.key ==="?") setShowKeyboardHelp(!showKeyboardHelp); if (e.key ==="Escape") setSelectedItem(null); }; window.addEventListener("keydown", handleKeyPress); return () => window.removeEventListener("keydown", handleKeyPress); }, [showKeyboardHelp]); // Categories const categories = useMemo(() => { return [...new Set(inventory.map((i) => i.category))]; }, [inventory]); // Filter and search const filteredInventory = useMemo(() => { return inventory.filter((item) => { if (filterCategory !=="all" && item.category !== filterCategory) return false; if (filterStatus !=="all" && item.status !== filterStatus) return false; if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.itemCode.includes(searchTerm)) return false; return true; }); }, [inventory, filterCategory, filterStatus, searchTerm]); // Pagination const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE); const paginatedInventory = useMemo(() => { const start = (currentPage - 1) * ITEMS_PER_PAGE; return filteredInventory.slice(start, start + ITEMS_PER_PAGE); }, [filteredInventory, currentPage]); // Metrics const metrics = useMemo(() => { return { total_items: inventory.length, ok: inventory.filter((i) => i.status ==="ok").length, low: inventory.filter((i) => i.status ==="low").length, high: inventory.filter((i) => i.status ==="high").length, alert: inventory.filter((i) => i.status ==="alert").length, }; }, [inventory]); const handleAdjustPar = (itemId: string, newPar: number) => { setInventory((prev) => prev.map((item) => item.id === itemId ? { ...item, par: newPar } : item ) ); }; return ( <AppLayout> <div className="space-y-4"> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-2xl font-bold flex items-center gap-2"> <Box className="h-6 w-6" /> Inventory Management </h1> <p className="text-xs text-slate-400 mt-1">Counts, layout, multi-outlet sync, voice capture</p> </div> <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} className="text-slate-400 hover:text-slate-200" > <HelpCircle className="h-4 w-4" /> </Button> </div> {/* Keyboard Help */} {showKeyboardHelp && ( <Alert className="border-slate-600 bg-slate-800/50"> <div className="flex items-start justify-between gap-6"> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+1</kbd> Overview</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+2</kbd> Layout</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+3</kbd> Counts</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+4</kbd> Mobile</div> </div> <div className="text-xs space-y-1"> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+5</kbd> Voice</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Ctrl+6</kbd> Sync</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">Esc</kbd> Close modal</div> <div><kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">?</kbd> Toggle help</div> </div> </div> </Alert> )} {/* Compact KPI Row */} <div className="grid gap-3 grid-cols-5"> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Total Items</div> <p className="text-2xl font-bold">{metrics.total_items}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">OK</div> <p className="text-2xl font-bold text-green-400">{metrics.ok}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Low Stock</div> <p className="text-2xl font-bold text-amber-400">{metrics.low}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">High Stock</div> <p className="text-2xl font-bold text-blue-400">{metrics.high}</p> </CardContent> </Card> <Card className="border-border bg-surface"> <CardContent className="pt-3 pb-3"> <div className="text-xs text-slate-400">Alert</div> <p className="text-2xl font-bold text-red-400">{metrics.alert}</p> </CardContent> </Card> </div> {/* Tabs */} <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3"> <TabsList className="bg-surface border-b border-border h-auto w-full justify-start rounded-none p-0 overflow-x-auto"> <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"> <Box className="h-4 w-4 mr-2" /> Overview </TabsTrigger> <TabsTrigger value="layout" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"> <Layout className="h-4 w-4 mr-2" /> Layout </TabsTrigger> <TabsTrigger value="counts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"> <CheckSquare className="h-4 w-4 mr-2" /> Counts </TabsTrigger> <TabsTrigger value="mobile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"> <Smartphone className="h-4 w-4 mr-2" /> Mobile </TabsTrigger> <TabsTrigger value="voice" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"> <Mic2 className="h-4 w-4 mr-2" /> Voice </TabsTrigger> <TabsTrigger value="snapshots" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"> <TrendingDown className="h-4 w-4 mr-2" /> Snapshots </TabsTrigger> <TabsTrigger value="sync" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary whitespace-nowrap"> <Share2 className="h-4 w-4 mr-2" /> Multi-Outlet Sync </TabsTrigger> </TabsList> {/* Overview Tab */} <TabsContent value="overview" className="space-y-3"> <div className="flex gap-2 items-center"> <Input placeholder="Search items..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="bg-slate-800 border-slate-600 h-8 text-sm" /> <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="bg-slate-800 border border-slate-600 h-8 text-xs px-2 rounded" > <option value="all">All Categories</option> {categories.map((cat) => ( <option key={cat} value={cat}> {cat} </option> ))} </select> <div className="flex gap-1"> {["ok","low","high","alert","all"].map((status) => ( <Button key={status} variant={filterStatus === status ?"default" :"outline"} size="sm" onClick={() => { setFilterStatus(status); setCurrentPage(1); }} className="text-xs px-2 h-8 capitalize" > {status ==="all" ?"All" : status} </Button> ))} </div> </div> <Card className="border-border bg-surface"> <CardContent className="p-0"> <div className="overflow-x-auto"> <Table> <TableHeader> <TableRow className="hover:bg-transparent border-border"> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Code</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Name</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Category</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">On Hand</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Par</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Variance</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Status</TableHead> <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">Last Count</TableHead> </TableRow> </TableHeader> <TableBody> {paginatedInventory.map((item) => ( <TableRow key={item.id} className="hover:bg-slate-800/30 border-border h-8 cursor-pointer" onClick={() => setSelectedItem(item)} > <TableCell className="text-sm font-semibold text-blue-400 p-2">{item.itemCode}</TableCell> <TableCell className="text-xs text-slate-200 p-2">{item.name}</TableCell> <TableCell className="text-xs text-slate-400 p-2">{item.category}</TableCell> <TableCell className="text-xs p-2 font-medium">{item.onHand} {item.unit}</TableCell> <TableCell className="text-xs p-2">{item.par}</TableCell> <TableCell className="text-xs p-2"> <span className={item.variance > 0 ?"text-red-400" :"text-green-400"}> {item.variance > 0 ?"+" :""}{item.variance.toFixed(1)}% </span> </TableCell> <TableCell className="p-2"> <Badge className={getStatusColor(item.status)} style={{ fontSize:"0.65rem" }}> {item.status} </Badge> </TableCell> <TableCell className="text-xs text-slate-400 p-2"> {format(new Date(item.lastCount),"MMM d")} </TableCell> </TableRow> ))} </TableBody> </Table> </div> {/* Pagination */} <div className="flex items-center justify-between p-3 border-t border-border bg-surface"> <span className="text-xs text-slate-400"> {filteredInventory.length === 0 ?"No results" : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredInventory.length)} of ${filteredInventory.length}`} </span> <div className="flex gap-2"> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-7 px-2 text-xs border-slate-600"> <ChevronLeft className="h-3 w-3" /> </Button> <span className="text-xs text-slate-400 px-2">Page {currentPage} of {totalPages || 1}</span> <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-7 px-2 text-xs border-slate-600"> <ChevronRight className="h-3 w-3" /> </Button> </div> </div> </CardContent> </Card> </TabsContent> {/* Other Tabs - Placeholder Content */} {["layout","counts","mobile","voice","snapshots","sync"].map((tab) => ( <TabsContent key={tab} value={tab}> <Card className="border-border bg-surface"> <CardContent className="p-6"> <p className="text-slate-400 text-sm"> {tab ==="layout" &&"Design and visualize storage locations, racks, bins, and placement optimization."} {tab ==="counts" &&"Physical inventory count sessions with barcode scanning and team assignments."} {tab ==="mobile" &&"Mobile-first inventory operations for field staff - offline-first sync enabled."} {tab ==="voice" &&"Voice-capture inventory counting for hands-free operations."} {tab ==="snapshots" &&"Historical inventory snapshots and shelf-sheet planning."} {tab ==="sync" &&"Multi-outlet inventory synchronization, par level management, and transfers."} </p> </CardContent> </Card> </TabsContent> ))} </Tabs> {/* Detail Modal */} {selectedItem && ( <div className="fixed inset-0 bg-black/50 flex items-end z-50"> <div className="bg-surface border-t border-border w-full max-w-2xl ml-auto animate-in slide-in-from-right"> <div className="p-4 border-b border-border flex items-center justify-between"> <div> <h2 className="text-lg font-bold">{selectedItem.itemCode}</h2> <p className="text-xs text-slate-400">{selectedItem.name}</p> </div> <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)} className="h-6 w-6 p-0"> <X className="h-4 w-4" /> </Button> </div> <div className="p-4 space-y-4 max-h-96 overflow-y-auto"> <div className="grid grid-cols-4 gap-4 text-sm"> <div> <p className="text-xs text-slate-400">On Hand</p> <p className="text-lg font-bold">{selectedItem.onHand}</p> </div> <div> <p className="text-xs text-slate-400">Par Level</p> <p className="text-lg font-bold">{selectedItem.par}</p> </div> <div> <p className="text-xs text-slate-400">Variance</p> <p className={`text-lg font-bold ${selectedItem.variance > 0 ?"text-red-400" :"text-green-400"}`}> {selectedItem.variance > 0 ?"+" :""}{selectedItem.variance.toFixed(1)}% </p> </div> <div> <p className="text-xs text-slate-400">Status</p> <Badge className={getStatusColor(selectedItem.status)}> {selectedItem.status} </Badge> </div> </div> {selectedItem.status !=="ok" && ( <Alert className="border-amber-200/30 bg-amber-500/5"> <AlertTriangle className="h-4 w-4 text-amber-600" /> <AlertDescription className="text-amber-600 text-sm ml-2"> {selectedItem.status ==="low" &&"Stock is below par level - consider ordering"} {selectedItem.status ==="high" &&"Stock is above par level - check for overstock"} {selectedItem.status ==="alert" &&"Out of stock - immediate action required"} </AlertDescription> </Alert> )} <div className="pt-2 border-t border-border space-y-2"> <p className="text-xs text-slate-400">Category: {selectedItem.category} • Unit: {selectedItem.unit}</p> <p className="text-xs text-slate-400">Last counted: {format(new Date(selectedItem.lastCount),"MMM d, yyyy")}</p> </div> </div> </div> </div> )} </div> </AppLayout> );
}
