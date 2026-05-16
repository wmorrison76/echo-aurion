/******************************************************************** * LUCCCA — BUILD 10 * MaintenanceSchedulerPanel (Engineering Requests + Facilities Integration) * * PURPOSE: * - Let Engineering/Facilities schedule work (paint, repair, HVAC, etc.) * - Check against event schedule for conflicts or buffer violations * - Integrate with EchoAurium Facilities Management * - Prepare requests for Override Center if blocked * * LOCATION: * client/modules/MaintenanceSchedulerPanel.tsx *********************************************************************/ import React, {
  useState,
  useEffect,
} from "react";
import { cn } from "@/lib/glass";
import { AlertCircle, CheckCircle, Clock, Loader } from "lucide-react";
type MaintenanceRequest = {
  space: string;
  type: string;
  description: string;
  start: string;
  end: string;
  externalCompany?: string;
};
type GovernanceResult = {
  ok: boolean;
  severity?: "info" | "warn" | "danger";
  reason?: string;
  overrideRequired?: boolean;
  workOrderId?: string;
  estimatedDuration?: number;
};
type FacilityAsset = {
  id: string;
  name: string;
  status: "operational" | "maintenance" | "out-of-service";
  lastMaintenance?: string;
  nextScheduled?: string;
};
type FacilityWorkOrder = {
  id: string;
  type: string;
  status: "pending" | "scheduled" | "in-progress" | "completed" | "cancelled";
  priority: string;
  startTime: string;
  assignedTo?: string;
};
const SPACES = [
  "Aviva Ballroom",
  "Pool Deck",
  "Courtyard",
  "Sky Lounge",
  "Grand Salon",
  "Terrace",
];
const MAINTENANCE_TYPES = [
  "Painting",
  "HVAC",
  "Electrical",
  "Plumbing",
  "General Repair",
  "Deep Cleaning",
  "Equipment Maintenance",
];
export default function MaintenanceSchedulerPanel() {
  const [form, setForm] = useState<MaintenanceRequest>({
    space: "Aviva Ballroom",
    type: "Painting",
    description: "",
    start: "",
    end: "",
  });
  const [result, setResult] = useState<GovernanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<FacilityAsset[]>([]);
  const [workOrders, setWorkOrders] = useState<FacilityWorkOrder[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState<string | null>(null); // Fetch assets when space changes useEffect(() => { const fetchAssets = async () => { if (!form.space) return; setLoadingAssets(true); setError(null); try { const orgId = localStorage.getItem("org-id") ||"default-org"; const response = await fetch(`/api/facilities/assets/${encodeURIComponent(form.space)}`, { method:"GET", headers: {"Content-Type":"application/json","X-Org-ID": orgId, }, }); if (!response.ok) { throw new Error(`Failed to fetch assets: ${response.statusText}`); } const data = await response.json(); setAssets(data.assets || []); // Also fetch active work orders const woResponse = await fetch( `/api/facilities/work-orders/${encodeURIComponent(form.space)}`, { method:"GET", headers: {"Content-Type":"application/json","X-Org-ID": orgId, }, } ); if (woResponse.ok) { const woData = await woResponse.json(); setWorkOrders(woData.workOrders || []); } } catch (err) { console.error("Error fetching facility assets:", err); setError(err instanceof Error ? err.message :"Failed to load assets"); } finally { setLoadingAssets(false); } }; fetchAssets(); }, [form.space]); const handleChange = (field: keyof MaintenanceRequest, value: string) => { setForm((prev) => ({ ...prev, [field]: value })); }; const handleSubmit = async () => { if (!form.start || !form.end || !form.description) { setError("Please fill in all required fields"); return; } setLoading(true); setError(null); setResult(null); try { const orgId = localStorage.getItem("org-id") ||"default-org"; const response = await fetch("/api/facilities/work-orders", { method:"POST", headers: {"Content-Type":"application/json","X-Org-ID": orgId, }, body: JSON.stringify({ space: form.space, workType: form.type, description: form.description, startTime: form.start, endTime: form.end, priority:"medium", externalCompany: form.externalCompany, }), }); const data = await response.json(); if (response.ok) { setResult({ ok: true, severity:"info", workOrderId: data.workOrderId, estimatedDuration: data.estimatedDuration, }); // Reset form setForm({ space: form.space, type:"Painting", description:"", start:"", end:"", }); // Refresh work orders const woResponse = await fetch( `/api/facilities/work-orders/${encodeURIComponent(form.space)}`, { method:"GET", headers: {"Content-Type":"application/json","X-Org-ID": orgId, }, } ); if (woResponse.ok) { const woData = await woResponse.json(); setWorkOrders(woData.workOrders || []); } } else { setResult({ ok: false, severity:"danger", reason: data.message ||"Failed to submit work order", overrideRequired: data.conflictingEvents && data.conflictingEvents.length > 0, }); } } catch (err) { console.error("Error submitting maintenance request:", err); setError(err instanceof Error ? err.message :"Failed to submit request"); setResult({ ok: false, severity:"danger", reason:"Error communicating with maintenance system", }); } finally { setLoading(false); } }; return ( <div className="p-4 h-full overflow-y-auto font-sans bg-background space-y-3"> <div className="sticky top-0 bg-background pb-4"> <h2 className="text-lg font-semibold text-foreground"> Maintenance Scheduler </h2> <p className="text-xs text-foreground/60 mt-1"> Plan engineering work and integrate with EchoAurium Facilities Management. </p> </div> {error && ( <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 text-xs text-red-900 dark:text-red-100 flex items-start gap-2"> <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{error}</span> </div> )} <div className="space-y-2 text-sm"> <label className="block"> <span className="text-xs font-medium text-foreground/70">Space</span> <select className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.space} onChange={(e) => handleChange("space", e.target.value)} > {SPACES.map((space) => ( <option key={space} value={space}> {space} </option> ))} </select> </label> <label className="block"> <span className="text-xs font-medium text-foreground/70"> Work Type </span> <select className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.type} onChange={(e) => handleChange("type", e.target.value)} > {MAINTENANCE_TYPES.map((type) => ( <option key={type} value={type}> {type} </option> ))} </select> </label> <label className="block"> <span className="text-xs font-medium text-foreground/70"> Description </span> <textarea className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" rows={3} value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="What needs to be done?" /> </label> <label className="block"> <span className="text-xs font-medium text-foreground/70"> External Company (Optional) </span> <input type="text" className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.externalCompany ||""} onChange={(e) => handleChange("externalCompany", e.target.value)} placeholder="Contractor name or company" /> </label> <div className="grid grid-cols-2 gap-2"> <label className="block"> <span className="text-xs font-medium text-foreground/70"> Start </span> <input type="datetime-local" className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.start} onChange={(e) => handleChange("start", e.target.value)} /> </label> <label className="block"> <span className="text-xs font-medium text-foreground/70">End</span> <input type="datetime-local" className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.end} onChange={(e) => handleChange("end", e.target.value)} /> </label> </div> </div> <button onClick={handleSubmit} disabled={loading} className="w-full bg-primary text-primary-foreground text-sm rounded-md py-2 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" > {loading && <Loader className="w-4 h-4 animate-spin" />} {loading ?"Submitting..." :"Submit Work Order"} </button> {result && ( <div className={cn("rounded-md px-3 py-2 space-y-2 border", result.ok ?"bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" :"bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" )} > <div className="flex items-center gap-2 font-semibold"> {result.ok ? ( <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> ) : ( <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" /> )} <span className={result.ok ?"text-green-900 dark:text-green-100" :"text-red-900 dark:text-red-100"}> {result.ok ?"Work Order Submitted" :"Cannot Schedule"} </span> </div> {result.workOrderId && ( <div className={`text-xs ${result.ok ?"text-green-800 dark:text-green-200" :"text-red-800 dark:text-red-200"}`}> Work Order ID: <span className="font-mono font-semibold">{result.workOrderId}</span> </div> )} {result.estimatedDuration && ( <div className={`text-xs flex items-center gap-1 ${result.ok ?"text-green-800 dark:text-green-200" :"text-red-800 dark:text-red-200"}`}> <Clock className="w-3.5 h-3.5" /> Estimated Duration: {result.estimatedDuration} minutes </div> )} {result.reason && ( <div className={`text-xs ${result.ok ?"text-green-800 dark:text-green-200" :"text-red-800 dark:text-red-200"}`}> {result.reason} </div> )} {result.overrideRequired && ( <div className="text-red-600 dark:text-red-400 font-medium text-xs"> ⚠️ Conflicts detected - Override may be required </div> )} </div> )} {/* Assets in Space */} {assets.length > 0 && ( <div className="border-t border-border/20 pt-3"> <h3 className="text-xs font-semibold text-foreground/70 mb-2"> {loadingAssets ?"Loading Assets..." :"Facility Assets"} </h3> <div className="space-y-1.5"> {assets.map((asset) => ( <div key={asset.id} className="bg-surface border border-border/20 rounded px-2 py-1.5 text-xs space-y-0.5" > <div className="flex justify-between items-start"> <span className="font-medium text-foreground">{asset.name}</span> <span className={cn("px-1.5 py-0.5 rounded text-[11px] font-medium", asset.status ==="operational" ?"bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100" : asset.status ==="maintenance" ?"bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100" :"bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100" )} > {asset.status} </span> </div> {asset.lastMaintenance && ( <div className="text-[10px] text-foreground/60"> Last Maintenance: {new Date(asset.lastMaintenance).toLocaleDateString()} </div> )} </div> ))} </div> </div> )} {/* Active Work Orders */} {workOrders.length > 0 && ( <div className="border-t border-border/20 pt-3"> <h3 className="text-xs font-semibold text-foreground/70 mb-2"> Active Work Orders </h3> <div className="space-y-1.5 max-h-40 overflow-y-auto"> {workOrders.map((wo) => ( <div key={wo.id} className="bg-surface border border-border/20 rounded px-2 py-1.5 text-xs space-y-0.5" > <div className="flex justify-between items-start gap-2"> <span className="font-medium text-foreground flex-1 truncate">{wo.type}</span> <span className={cn("px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap", wo.status ==="scheduled" ?"bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100" : wo.status ==="in-progress" ?"bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100" :"bg-slate-100 dark:bg-surface text-foreground" )} > {wo.status} </span> </div> {wo.assignedTo && ( <div className="text-[10px] text-foreground/60"> Assigned to: {wo.assignedTo} </div> )} </div> ))} </div> </div> )} </div> );
}
