import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Truck,
  Package,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  DollarSign,
  Target,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { useSupplyChainIntegration } from "./integrations/supply-integration";
import { useAppTheme } from "@/lib/theme-utils";
import { responsiveClasses } from "@/lib/responsive-utils";
interface Supplier {
  id: string;
  name: string;
  category: string;
  leadTime: number;
  reliability: number;
  costPerUnit: number;
  volume: number;
  lastDelivery: string;
  status: "active" | "pending" | "at-risk";
}
interface InventoryOptimization {
  item: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  recommendedOrder: number;
  potentialSavings: number;
  turnoverRate: number;
}
interface WasteData {
  date: string;
  category: string;
  amount: number;
  cost: number;
  reason: string;
  preventionMeasure: string;
}
interface ProcurementMetric {
  date: string;
  costPerServing: number;
  wastePercentage: number;
  deliveryOnTime: number;
  suppliersUsed: number;
}
const SUPPLIERS: Supplier[] = [
  {
    id: "1",
    name: "Atlantic Seafood Co.",
    category: "Seafood",
    leadTime: 1,
    reliability: 98,
    costPerUnit: 12.5,
    volume: 450,
    lastDelivery: "2024-02-19",
    status: "active",
  },
  {
    id: "2",
    name: "Chesapeake Produce",
    category: "Produce",
    leadTime: 2,
    reliability: 95,
    costPerUnit: 3.2,
    volume: 1200,
    lastDelivery: "2024-02-18",
    status: "active",
  },
  {
    id: "3",
    name: "Premium Beef Partners",
    category: "Meat",
    leadTime: 3,
    reliability: 92,
    costPerUnit: 18.75,
    volume: 300,
    lastDelivery: "2024-02-17",
    status: "active",
  },
  {
    id: "4",
    name: "Mountain Dairy",
    category: "Dairy",
    leadTime: 2,
    reliability: 89,
    costPerUnit: 4.5,
    volume: 800,
    lastDelivery: "2024-02-16",
    status: "pending",
  },
  {
    id: "5",
    name: "Local Bakery Supply",
    category: "Bakery",
    leadTime: 1,
    reliability: 96,
    costPerUnit: 5.0,
    volume: 400,
    lastDelivery: "2024-02-19",
    status: "active",
  },
];
const INVENTORY_OPTIMIZATIONS: InventoryOptimization[] = [
  {
    item: "Premium Salmon",
    currentStock: 45,
    reorderPoint: 50,
    safetyStock: 20,
    recommendedOrder: 120,
    potentialSavings: 380,
    turnoverRate: 8.2,
  },
  {
    item: "Crabmeat",
    currentStock: 30,
    reorderPoint: 35,
    safetyStock: 15,
    recommendedOrder: 80,
    potentialSavings: 520,
    turnoverRate: 7.5,
  },
  {
    item: "Butter",
    currentStock: 180,
    reorderPoint: 120,
    safetyStock: 60,
    recommendedOrder: 240,
    potentialSavings: 280,
    turnoverRate: 6.8,
  },
  {
    item: "Fresh Herbs",
    currentStock: 25,
    reorderPoint: 30,
    safetyStock: 10,
    recommendedOrder: 50,
    potentialSavings: 150,
    turnoverRate: 12.1,
  },
];
const WASTE_DATA: WasteData[] = [
  {
    date: "2024-02-19",
    category: "Produce",
    amount: 8.5,
    cost: 64,
    reason: "Over-ordered spinach",
    preventionMeasure: "Reduce order quantities by 20%",
  },
  {
    date: "2024-02-18",
    category: "Seafood",
    amount: 3.2,
    cost: 86,
    reason: "Low demand for special",
    preventionMeasure: "Align special with demand forecast",
  },
  {
    date: "2024-02-17",
    category: "Dairy",
    amount: 5.0,
    cost: 38,
    reason: "Expired inventory",
    preventionMeasure: "Implement FIFO rotation",
  },
  {
    date: "2024-02-16",
    category: "Meat",
    amount: 2.1,
    cost: 52,
    reason: "Spoilage during storage",
    preventionMeasure: "Check refrigeration temp control",
  },
];
const PROCUREMENT_METRICS: ProcurementMetric[] = [
  {
    date: "Week 1",
    costPerServing: 8.2,
    wastePercentage: 3.8,
    deliveryOnTime: 96,
    suppliersUsed: 5,
  },
  {
    date: "Week 2",
    costPerServing: 8.5,
    wastePercentage: 4.2,
    deliveryOnTime: 93,
    suppliersUsed: 5,
  },
  {
    date: "Week 3",
    costPerServing: 8.0,
    wastePercentage: 3.1,
    deliveryOnTime: 98,
    suppliersUsed: 6,
  },
  {
    date: "Week 4",
    costPerServing: 8.3,
    wastePercentage: 3.5,
    deliveryOnTime: 95,
    suppliersUsed: 5,
  },
];
export default function SupplyChainModule() {
  const { t } = useI18n();
  const { theme, isDark } = useAppTheme();
  const { syncOrderToInventory, updateReorderPointsFromSupplierPerformance } =
    useSupplyChainIntegration();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null); // Sync supplier orders to inventory useEffect(() => { SUPPLIERS.forEach((supplier) => { updateReorderPointsFromSupplierPerformance({ id: supplier.id, leadTime: supplier.leadTime, reliability: supplier.reliability, }); }); }, [updateReorderPointsFromSupplierPerformance]); const totalWaste = WASTE_DATA.reduce((sum, w) => sum + w.cost, 0); const totalPotentialSavings = INVENTORY_OPTIMIZATIONS.reduce((sum, inv) => sum + inv.potentialSavings, 0); const avgCostPerServing = (PROCUREMENT_METRICS.reduce((sum, m) => sum + m.costPerServing, 0) / PROCUREMENT_METRICS.length).toFixed(2); const avgWastePercentage = (WASTE_DATA.reduce((sum, w) => sum + w.amount, 0) / WASTE_DATA.length).toFixed(1); const activeSuppliers = SUPPLIERS.filter((s) => s.status ==="active").length; const avgReliability = (SUPPLIERS.reduce((sum, s) => sum + s.reliability, 0) / SUPPLIERS.length).toFixed(1); const handleOptimize = async () => { setIsLoading(true); try { const response = await fetch("/api/supply-chain/optimize", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ suppliers: SUPPLIERS, inventory: INVENTORY_OPTIMIZATIONS, waste: WASTE_DATA, metrics: PROCUREMENT_METRICS, }), }); if (!response.ok) throw new Error("Optimization failed"); } catch (error) { console.error("Supply chain optimization error:", error); } finally { setIsLoading(false); } }; return ( <div className={cn("w-full h-full overflow-y-auto bg-background text-foreground backdrop-blur-sm", responsiveClasses({ default:"p-4", md:"p-6", lg:"p-8", }),"space-y-6", )}> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"> <Truck className="w-8 h-8 text-primary" /> {t("module.supply-chain.title")} </h1> <p className="text-sm text-foreground/60 mt-1"> {t("module.supply-chain.description")} </p> </div> <div className="flex items-center gap-3"> <ModuleChatButton moduleId="supply-chain" moduleName={t("module.supply-chain.title")} /> <Button onClick={handleOptimize} disabled={isLoading} className="gap-2"> <RefreshCw className={cn("w-4 h-4", isLoading &&"animate-spin")} /> {t("module.supply-chain.optimize")} </Button> </div> </div> {/* Quick Stats */} <div className={responsiveClasses({ default:"grid grid-cols-1 gap-3", sm:"grid grid-cols-2 gap-3", md:"grid grid-cols-3 gap-4", lg:"grid grid-cols-5 gap-4", })}> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Active Suppliers</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-green-500">{activeSuppliers}/{SUPPLIERS.length}</div> <p className="text-xs text-foreground/50 mt-1">Avg reliability: {avgReliability}%</p> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Cost/Serving</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-orange-500">${avgCostPerServing}</div> <p className="text-xs text-foreground/50 mt-1">Weekly average</p> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Waste Rate</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-red-500">{avgWastePercentage}%</div> <p className="text-xs text-foreground/50 mt-1">${(totalWaste / 1000).toFixed(1)}K/month</p> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Optimization Potential</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-purple-500">${(totalPotentialSavings / 1000).toFixed(1)}K</div> <p className="text-xs text-foreground/50 mt-1">Monthly savings opportunity</p> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">On-Time Delivery</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-blue-500">{(PROCUREMENT_METRICS.reduce((sum, m) => sum + m.deliveryOnTime, 0) / PROCUREMENT_METRICS.length).toFixed(0)}%</div> <p className="text-xs text-foreground/50 mt-1">4-week average</p> </CardContent> </Card> </div> {/* Tabs */} <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full"> <TabsList className="grid w-full grid-cols-4 bg-background border border-white/10 p-1 rounded-lg"> <TabsTrigger value="overview">Overview</TabsTrigger> <TabsTrigger value="suppliers">Suppliers</TabsTrigger> <TabsTrigger value="inventory">Inventory</TabsTrigger> <TabsTrigger value="waste">Waste</TabsTrigger> </TabsList> {/* Overview */} <TabsContent value="overview" className="space-y-4 mt-4"> <div className="grid grid-cols-2 gap-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Procurement Trends</CardTitle> </CardHeader> <CardContent className="h-80"> <ResponsiveContainer width="100%" height="100%"> <LineChart data={PROCUREMENT_METRICS}> <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" /> <XAxis dataKey="date" stroke="#ffffff60" /> <YAxis stroke="#ffffff60" /> <Tooltip contentStyle={{ backgroundColor:"#1a1a1a", border:"1px solid #ffffff20", borderRadius:"8px", }} /> <Legend /> <Line type="monotone" dataKey="costPerServing" stroke="#ff6b6b" strokeWidth={2} dot={{ r: 4 }} /> <Line type="monotone" dataKey="wastePercentage" stroke="#ffd700" strokeWidth={2} dot={{ r: 4 }} /> </LineChart> </ResponsiveContainer> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Delivery Performance</CardTitle> </CardHeader> <CardContent className="h-80"> <ResponsiveContainer width="100%" height="100%"> <BarChart data={PROCUREMENT_METRICS}> <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" /> <XAxis dataKey="date" stroke="#ffffff60" /> <YAxis stroke="#ffffff60" domain={[0, 100]} /> <Tooltip contentStyle={{ backgroundColor:"#1a1a1a", border:"1px solid #ffffff20", borderRadius:"8px", }} /> <Legend /> <Bar dataKey="deliveryOnTime" fill="#00b4d8" /> </BarChart> </ResponsiveContainer> </CardContent> </Card> </div> </TabsContent> {/* Suppliers */} <TabsContent value="suppliers" className="space-y-4 mt-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Supplier Network</CardTitle> <CardDescription>Active supplier relationships and performance</CardDescription> </CardHeader> <CardContent className="space-y-3"> {SUPPLIERS.map((supplier) => ( <div key={supplier.id} className="border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-background transition-colors" onClick={() => setExpandedSupplier(expandedSupplier === supplier.id ? null : supplier.id)} > <div className="flex justify-between items-start mb-2"> <div className="flex-1"> <h4 className="font-semibold text-foreground">{supplier.name}</h4> <p className="text-xs text-foreground/60 mt-1">{supplier.category}</p> </div> <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", supplier.status ==="active" ?"bg-green-500/20 text-green-500" : supplier.status ==="pending" ?"bg-yellow-500/20 text-yellow-500" :"bg-red-500/20 text-red-500" )} > {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)} </div> </div> <div className="grid grid-cols-3 gap-3 text-sm"> <div className="bg-background rounded p-2"> <p className="text-foreground/60">Lead Time</p> <p className="font-semibold text-foreground">{supplier.leadTime}d</p> </div> <div className="bg-background rounded p-2"> <p className="text-foreground/60">Reliability</p> <p className="font-semibold text-foreground">{supplier.reliability}%</p> </div> <div className="bg-background rounded p-2"> <p className="text-foreground/60">Last Delivery</p> <p className="font-semibold text-foreground text-xs">{supplier.lastDelivery}</p> </div> </div> {expandedSupplier === supplier.id && ( <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm"> <p className="text-foreground/80"> <span className="font-semibold">Cost/Unit:</span> ${supplier.costPerUnit.toFixed(2)} </p> <p className="text-foreground/80"> <span className="font-semibold">Monthly Volume:</span> {supplier.volume} units </p> </div> )} </div> ))} </CardContent> </Card> </TabsContent> {/* Inventory */} <TabsContent value="inventory" className="space-y-4 mt-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Inventory Optimization</CardTitle> <CardDescription>Smart reorder recommendations based on demand</CardDescription> </CardHeader> <CardContent className="space-y-3"> {INVENTORY_OPTIMIZATIONS.map((inv) => ( <div key={inv.item} className="border border-white/10 rounded-lg p-4"> <div className="flex justify-between items-start mb-3"> <h4 className="font-semibold text-foreground">{inv.item}</h4> <div className="text-right"> <div className="text-lg font-bold text-green-500">${(inv.potentialSavings).toFixed(0)}</div> <p className="text-xs text-foreground/60">Potential savings</p> </div> </div> <div className="grid grid-cols-2 gap-3 mb-3 text-sm"> <div className="bg-background rounded p-2"> <p className="text-foreground/60">Current Stock</p> <p className="font-semibold text-foreground">{inv.currentStock} units</p> </div> <div className="bg-background rounded p-2"> <p className="text-foreground/60">Reorder Point</p> <p className="font-semibold text-foreground">{inv.reorderPoint} units</p> </div> <div className="bg-background rounded p-2"> <p className="text-foreground/60">Recommended Order</p> <p className="font-semibold text-foreground">{inv.recommendedOrder} units</p> </div> <div className="bg-background rounded p-2"> <p className="text-foreground/60">Turnover Rate</p> <p className="font-semibold text-foreground">{inv.turnoverRate}x/year</p> </div> </div> <div className="w-full h-2 bg-background rounded-full overflow-hidden"> <div className="h-full bg-primary" style={{ width: `${Math.min((inv.currentStock / inv.reorderPoint) * 100, 100)}%` }} /> </div> </div> ))} </CardContent> </Card> </TabsContent> {/* Waste */} <TabsContent value="waste" className="space-y-4 mt-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Waste Tracking & Reduction</CardTitle> <CardDescription>Daily waste logs with prevention measures</CardDescription> </CardHeader> <CardContent className="space-y-3"> {WASTE_DATA.map((waste) => ( <div key={waste.date} className="border border-white/10 rounded-lg p-4"> <div className="flex justify-between items-start mb-2"> <div className="flex-1"> <h4 className="font-semibold text-foreground">{waste.date} • {waste.category}</h4> <p className="text-xs text-foreground/60 mt-1">{waste.reason}</p> </div> <div className="text-right"> <div className="text-lg font-bold text-red-500">${waste.cost}</div> <p className="text-xs text-foreground/60">{waste.amount}kg waste</p> </div> </div> <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded p-3"> <p className="text-xs font-semibold text-orange-500 mb-1">Prevention Measure:</p> <p className="text-sm text-foreground/80">{waste.preventionMeasure}</p> </div> </div> ))} </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Monthly Waste Summary</CardTitle> </CardHeader> <CardContent className="space-y-3"> {[ { category:"Produce", total: 16.5, cost: 125, percentage: 40 }, { category:"Seafood", total: 3.2, cost: 86, percentage: 26 }, { category:"Dairy", total: 5.0, cost: 38, percentage: 15 }, { category:"Meat", total: 2.1, cost: 52, percentage: 19 }, ].map((item) => ( <div key={item.category} className="border-b border-white/10 pb-3"> <div className="flex justify-between items-center mb-1"> <span className="text-foreground/80">{item.category}</span> <span className="font-bold text-red-500">${item.cost}</span> </div> <div className="w-full h-2 bg-background rounded-full overflow-hidden"> <div className="h-full bg-red-500" style={{ width: `${item.percentage}%` }} /> </div> </div> ))} </CardContent> </Card> </TabsContent> </Tabs> </div> );
}
