import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Calendar,
  ChevronRight,
  Grid3X3,
  Layout,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { OutletProvider, useOutlet } from "./context/OutletContext";
import { OutletSelector } from "./components/OutletSelector";
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon?: string;
  color?: "blue" | "green" | "purple" | "orange" | "pink";
}
interface Event {
  id: string;
  name: string;
  guests: number;
  location: string;
  status: "confirmed" | "pending" | "in-progress";
  date?: string;
}
interface ScheduleUpdate {
  id: string;
  type: string;
  count: number;
  message: string;
}
interface UploadedFile {
  id: string;
  filename: string;
  displayName?: string;
  size: number;
  uploadedAt: string;
}
const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  icon,
  color = "blue",
}) => {
  const colorClasses = {
    blue: "text-blue-400 bg-primary/10",
    green: "text-green-400 bg-green-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    orange: "text-orange-400 bg-orange-500/10",
    pink: "text-pink-400 bg-pink-500/10",
  };
  return (
    <Card className="p-6 bg-background/40 backdrop-blur-sm border-border/50 hover:border-border/80 transition-all">
      {" "}
      <div className="flex justify-between items-start mb-4">
        {" "}
        <div>
          {" "}
          <p className="text-sm text-foreground/60 mb-2">{label}</p>{" "}
          <div className="flex items-baseline gap-2">
            {" "}
            <h3 className="text-3xl font-bold text-foreground">{value}</h3>{" "}
            {trend && (
              <span className="text-xs text-green-400">{trend}</span>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {icon && (
          <div className={cn("p-3 rounded-lg", colorClasses[color])}>
            {" "}
            <span className="text-xl">{icon}</span>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </Card>
  );
};
interface Panel {
  id: string;
  title: string;
  height?: string;
  loading?: boolean;
}
const DashboardPanel: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: string;
  fullHeight?: boolean;
}> = ({ title, children, icon, fullHeight }) => {
  const [minimized, setMinimized] = useState(false);
  return (
    <Card
      className={cn(
        "bg-background/40 backdrop-blur-sm border-border/50 hover:border-border/80 transition-all",
        fullHeight ? "h-full" : "",
      )}
    >
      {" "}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          {icon && <span className="text-lg">{icon}</span>}{" "}
          <h3 className="font-semibold text-sm">{title}</h3>{" "}
        </div>{" "}
        <div className="flex gap-1">
          {" "}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMinimized(!minimized)}
            className="h-6 w-6 p-0"
          >
            {" "}
            {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {!minimized && (
        <div className="p-4 max-h-[400px] overflow-auto">{children}</div>
      )}{" "}
    </Card>
  );
};
function MaestroModuleContent() {
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [layoutMode, setLayoutMode] = useState<"metrics" | "details">(
    "metrics",
  ); // Real-time data state const [events, setEvents] = useState<Event[]>([]); const [scheduleUpdates, setScheduleUpdates] = useState<ScheduleUpdate[]>([]); const [productionItems, setProductionItems] = useState<any[]>([]); const [bqtSheets, setBQTSheets] = useState<any[]>([]); const [dataSource, setDataSource] = useState<"mock" |"supabase">("mock"); // Outlet context for multi-tenant support const { currentOutletId } = useOutlet(); // WebSocket integration with dynamic outlet const { isConnected, updateProduction } = useWebSocket( { outletId: currentOutletId }, undefined, (update) => { // Update production data from WebSocket setScheduleUpdates((prev) => [ { id:"1", type:"Live Update", count: update.metrics.pendingCount, message: `${update.metrics.pendingCount} pending • Avg completion: ${update.metrics.avgCompletionTime}ms`, }, ]); }, ); // Fetch real data from Supabase - scope to current outlet const fetchRealData = async () => { try { // Try to fetch from Maestro API endpoint with outlet context const url = new URL("/api/maestro/metrics", window.location.origin); url.searchParams.append("outlet_id", currentOutletId); const response = await fetch(url.toString(), { method:"GET", }); if (response.ok) { const data = await response.json(); setEvents(data.events || []); setScheduleUpdates(data.scheduleUpdates || []); setProductionItems(data.productionItems || []); setBQTSheets(data.bqtSheets || []); setDataSource("supabase"); return; } } catch (error) { console.log("[Maestro] Falling back to mock data:", error); } // Use mock data as fallback setDataSource("mock"); }; useEffect(() => { loadUploadedFiles(); fetchRealData(); // Listen for new file uploads const handleFilesUploaded = (event: CustomEvent) => { console.log("[Maestro] maestro-files-uploaded event received", event.detail, ); if (event.detail?.uploads) { setUploadedFiles((prev) => [...prev, ...event.detail.uploads]); } loadUploadedFiles(); }; window.addEventListener("maestro-files-uploaded", handleFilesUploaded as EventListener, ); return () => { window.removeEventListener("maestro-files-uploaded", handleFilesUploaded as EventListener, ); }; }, [currentOutletId]); const loadUploadedFiles = async () => { try { const response = await fetch("/api/upload-maestro", { method:"GET" }); if (response.ok) { const data = await response.json(); setUploadedFiles(data.uploads || []); } } catch (error) { console.error("[Maestro] Error loading files:", error); } }; const handleRefresh = async () => { setLoading(true); await loadUploadedFiles(); await fetchRealData(); setLoading(false); }; // Default mock data (used as fallback) const mockEvents: Event[] = [ { id:"1", name:"Corporate Gala – BEO 876309", guests: 180, location:"Grand Ballroom", status:"confirmed", date:"2024-12-15", }, ]; const mockScheduleUpdates: ScheduleUpdate[] = [ { id:"1", type:"Scheduled", count: 0, message:"0 all-outs • 0 call-outs • 0.01 risk", }, ]; const mockProductionItems = [ { id:"1", name:"Pre-plated appetizers", prep:"In Progress", qty:"240" }, { id:"2", name:"Dessert plating", prep:"Pending", qty:"180" }, { id:"3", name:"Beverage setup", prep:"Complete", qty:"500" }, ]; const mockBQTSheets = [ { id:"1", name:"BEO 876309 - Guest Sheet", items: 12 }, { id:"2", name:"Timeline & Staffing Plan", items: 8 }, { id:"3", name:"Food & Beverage Details", items: 15 }, ]; // Use real data if available, otherwise use mock data const displayEvents = events.length > 0 ? events : mockEvents; const displayScheduleUpdates = scheduleUpdates.length > 0 ? scheduleUpdates : mockScheduleUpdates; const displayProductionItems = productionItems.length > 0 ? productionItems : mockProductionItems; const displayBQTSheets = bqtSheets.length > 0 ? bqtSheets : mockBQTSheets; return ( <div className="w-full h-full bg-gradient-to-br from-background via-background to-background/80"> {/* Header */} <div className="flex items-center justify-between p-4 border-b border-border/30"> <div className="flex items-center gap-3"> <h1 className="text-2xl font-bold">Maestro BQT</h1> <span className="text-xs text-foreground/50 px-2 py-1 bg-background/50 rounded"> Dashboard </span> <OutletSelector className="ml-4" /> </div> <div className="flex items-center gap-2"> <Button size="sm" variant={layoutMode ==="metrics" ?"default" :"outline"} onClick={() => setLayoutMode("metrics")} className="gap-2" > <Grid3X3 size={16} /> Metrics </Button> <Button size="sm" variant={layoutMode ==="details" ?"default" :"outline"} onClick={() => setLayoutMode("details")} className="gap-2" > <Layout size={16} /> Details </Button> <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading} className="gap-2" > <RefreshCw size={16} className={loading ?"animate-spin" :""} /> Refresh </Button> </div> </div> {/* Content with Sidebar */} <div className="flex h-[calc(100%-80px)] gap-4 p-4"> {/* CommandSidebar */} <div className="flex-shrink-0"> <CommandSidebar onClose={() => {}} /> </div> {/* Main Content Area */} <div className="overflow-auto flex-1 bg-gradient-to-br from-background/50 to-background/30 rounded-lg p-6"> {layoutMode ==="metrics" ? ( // Metrics View <div className="space-y-6"> {/* Top Metrics Grid */} <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"> <MetricCard label="Revenue Pipeline" value="$17,100" trend="Next 30 days" icon="📈" color="blue" /> <MetricCard label="Current Inventory" value="$3,703" trend="On-hand value" icon="📦" color="green" /> <MetricCard label="Active BEOs" value="1" trend="New affecting schedule: 0" icon="📋" color="orange" /> <MetricCard label="Team Utilization" value="2%" trend="Projected" icon="👥" color="purple" /> <MetricCard label="Estimated Food Cost" value="$5,472" trend="Based on 32% est." icon="💰" color="pink" /> </div> {/* Panels Grid */} <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> {/* Data Source Indicator */} <div className="col-span-1 lg:col-span-2 text-xs text-foreground/50 flex items-center justify-between px-4"> <span> Data Source:{""} {dataSource ==="supabase" ?"🔄 Supabase" :"📋 Mock Data"}{""} {isConnected &&"🔗 WebSocket Connected"} </span> </div> {/* Upcoming Events */} <DashboardPanel title="Upcoming Events" icon="📅"> <div className="space-y-4"> {displayEvents.map((event) => ( <div key={event.id} className="p-3 bg-background/30 rounded-lg border border-border/30 hover:border-border/50 transition-colors" > <div className="flex items-start justify-between gap-2"> <div className="flex-1 min-w-0"> <h4 className="font-semibold text-sm truncate"> {event.name} </h4> <p className="text-xs text-foreground/60 mt-1"> {event.guests} guests • {event.location} </p> </div> <span className={cn("text-xs px-2 py-1 rounded-full whitespace-nowrap", event.status ==="confirmed" ?"bg-green-500/20 text-green-400" : event.status ==="in-progress" ?"bg-primary/20 text-blue-400" :"bg-amber-500/20 text-amber-400", )} > {event.status} </span> </div> </div> ))} </div> </DashboardPanel> {/* Schedule Updates */} <DashboardPanel title="Schedule Updates" icon="⏱️"> <div className="space-y-3"> {displayScheduleUpdates.map((update) => ( <div key={update.id} className="p-3 bg-background/30 rounded-lg border border-border/30" > <p className="text-sm font-semibold text-foreground"> {update.type} </p> <p className="text-xs text-foreground/60 mt-1"> {update.message} </p> </div> ))} <div className="text-xs text-center text-foreground/40 py-2"> No one scheduled today. </div> </div> </DashboardPanel> </div> {/* Production Lists */} <DashboardPanel title="Production Lists" icon="👨‍🍳"> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {displayProductionItems.map((item) => ( <div key={item.id} className="p-3 bg-background/30 rounded-lg border border-border/30" > <p className="text-sm font-semibold">{item.name}</p> <div className="flex items-center justify-between mt-2 text-xs"> <span className="text-foreground/60"> {item.qty} qty </span> <span className={cn("px-2 py-1 rounded", item.prep ==="Complete" ?"bg-green-500/20 text-green-400" : item.prep ==="In Progress" ?"bg-primary/20 text-blue-400" :"bg-amber-500/20 text-amber-400", )} > {item.prep} </span> </div> </div> ))} </div> </DashboardPanel> {/* BQT Prep Sheets */} <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> <DashboardPanel title="BQT Prep Sheets" icon="📄"> <div className="space-y-2"> {displayBQTSheets.map((sheet) => ( <div key={sheet.id} className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/30 hover:border-border/50 transition-colors cursor-pointer group" > <div className="flex-1"> <p className="text-sm font-semibold group-hover:text-blue-400 transition-colors"> {sheet.name} </p> <p className="text-xs text-foreground/60"> {sheet.items} items </p> </div> <ChevronRight size={16} className="text-foreground/40" /> </div> ))} </div> </DashboardPanel> {/* Ordering / Invoices */} <DashboardPanel title="Ordering / Invoices" icon="💳"> <div className="space-y-2"> <div className="p-3 bg-background/30 rounded-lg border border-border/30"> <p className="text-sm font-semibold">Pending Orders</p> <p className="text-xs text-foreground/60 mt-2"> No pending orders </p> </div> <div className="p-3 bg-background/30 rounded-lg border border-border/30"> <p className="text-sm font-semibold">Recent Invoices</p> <p className="text-xs text-foreground/60 mt-2"> All invoices reconciled </p> </div> </div> </DashboardPanel> </div> </div> ) : ( // Details View - Show uploaded files <div> <DashboardPanel title="Module Files" icon="📁"> <div className="space-y-2"> {uploadedFiles.length > 0 ? ( uploadedFiles.map((file) => ( <div key={file.id} className="p-3 bg-background/30 rounded-lg border border-border/30 text-sm" > <div className="flex items-start justify-between gap-2"> <div className="flex-1 min-w-0"> <p className="font-mono text-xs truncate"> {file.displayName || file.filename} </p> <p className="text-xs text-foreground/60 mt-1"> {(file.size / 1024).toFixed(2)} KB •{""} {new Date(file.uploadedAt).toLocaleString()} </p> </div> </div> </div> )) ) : ( <div className="text-center py-8 text-foreground/40"> <p className="text-sm">No files uploaded yet</p> <p className="text-xs mt-1"> Upload Maestro module files to get started </p> </div> )} </div> </DashboardPanel> </div> )} </div> </div> </div> );
}
export default function MaestroModule() {
  return (
    <OutletProvider>
      {" "}
      <MaestroModuleContent />{" "}
    </OutletProvider>
  );
}
