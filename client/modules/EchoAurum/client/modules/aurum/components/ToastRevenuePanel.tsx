import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
interface ToastConfig {
  baseUrl: string;
  apiKey: string;
  managerId: string;
  entityId: string;
  locations: Array<{
    locationId: string;
    name: string;
    timezone: string;
    currency: string;
  }>;
  hourlyRevenueSyncEnabled: boolean;
  cogsTrackingEnabled: boolean;
  discrepancyAlertThreshold: number;
}
interface ToastStatus {
  configured: boolean;
  entityId: string;
  lastSyncAt?: string;
  hourlyRevenueSyncEnabled: boolean;
  cogsTrackingEnabled: boolean;
  stats: {
    revenueRecords: number;
    lastRevenueSync?: string;
    cogsRecords: number;
    lastCogsSync?: string;
    openDiscrepancies: number;
    lastDiscrepancyAlert?: string;
  };
  locations: any[];
}
interface SyncResult {
  synced: number;
  journalEntries: number;
  period: { startDate: string; endDate: string };
  message: string;
  status: string;
}
interface DiscrepancyDetectionResult {
  detected: number;
  discrepancies: Array<{
    type: string;
    severity: string;
    description: string;
    variance: string;
    suggestedAction: string;
  }>;
}
export const ToastRevenuePanel: React.FC = () => {
  const [config, setConfig] = useState<ToastConfig>({
    baseUrl: "",
    apiKey: "",
    managerId: "",
    entityId: "default",
    locations: [],
    hourlyRevenueSyncEnabled: true,
    cogsTrackingEnabled: true,
    discrepancyAlertThreshold: 10,
  });
  const [status, setStatus] = useState<ToastStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [detectionResult, setDetectionResult] =
    useState<DiscrepancyDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [autoPost, setAutoPost] = useState(false);
  const [newLocation, setNewLocation] = useState({
    locationId: "",
    name: "",
    timezone: "America/New_York",
    currency: "USD",
  }); // Load initial status useEffect(() => { fetchStatus(); }, []); const fetchStatus = async () => { setLoading(true); setError(null); try { const response = await fetch( `/api/aurum/integrations/toast/status?entityId=${config.entityId}`, ); if (!response.ok) { // Not configured yet if (response.status === 404) { setStatus(null); return; } throw new Error("Failed to fetch Toast status"); } const data: ToastStatus = await response.json(); setStatus(data); if (data.configured) { setConfig((prev) => ({ ...prev, ...data, locations: data.locations, })); } } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }; const handleConfigSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setError(null); setMessage(null); try { const response = await fetch("/api/aurum/integrations/toast/config", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(config), }); if (!response.ok) { throw new Error("Failed to update Toast configuration"); } setMessage("Toast configuration updated successfully"); await fetchStatus(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }; const handleAddLocation = () => { if (!newLocation.locationId || !newLocation.name) { setError("Location ID and name are required"); return; } setConfig((prev) => ({ ...prev, locations: [...prev.locations, newLocation], })); setNewLocation({ locationId:"", name:"", timezone:"America/New_York", currency:"USD", }); setMessage("Location added. Click Save Configuration to apply."); }; const handleSyncRevenue = async () => { setSyncing(true); setError(null); setSyncResult(null); try { const response = await fetch("/api/aurum/integrations/toast/sync-revenue", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ entityId: config.entityId, startDate, endDate, autoPost, }), }, ); if (!response.ok) { throw new Error("Failed to sync revenue"); } const result: SyncResult = await response.json(); setSyncResult(result); setMessage( `Synced ${result.synced} revenue records, created ${result.journalEntries} GL entries`, ); await fetchStatus(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setSyncing(false); } }; const handleSyncCogs = async () => { setSyncing(true); setError(null); setSyncResult(null); try { const response = await fetch("/api/aurum/integrations/toast/sync-cogs", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ entityId: config.entityId, startDate, endDate, autoPost, }), }); if (!response.ok) { throw new Error("Failed to sync COGS"); } const result: SyncResult = await response.json(); setSyncResult(result); setMessage( `Synced ${result.synced} COGS records, created ${result.journalEntries} GL entries`, ); await fetchStatus(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setSyncing(false); } }; const handleDetectDiscrepancies = async () => { setDetectionRunning(true); setError(null); setDetectionResult(null); try { const response = await fetch("/api/aurum/integrations/toast/detect-discrepancies", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ entityId: config.entityId, startDate, endDate, }), }, ); if (!response.ok) { throw new Error("Failed to detect discrepancies"); } const result: DiscrepancyDetectionResult = await response.json(); setDetectionResult(result); if (result.detected > 0) { setMessage(`Detected ${result.detected} discrepancies in Toast data`); } else { setMessage("No discrepancies detected in the specified period"); } await fetchStatus(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setDetectionRunning(false); } }; return ( <div className="space-y-6"> {/* Configuration Card */} <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <TrendingUp className="w-5 h-5" /> Toast POS Configuration </CardTitle> <CardDescription> Connect to Toast POS system for real-time revenue sync, COGS tracking, and discrepancy detection </CardDescription> </CardHeader> <CardContent> <form onSubmit={handleConfigSubmit} className="space-y-4"> <div className="grid grid-cols-2 gap-4"> <div> <Label htmlFor="baseUrl">Toast API Base URL</Label> <Input id="baseUrl" placeholder="https://api.toasttab.com" value={config.baseUrl} onChange={(e) => setConfig({ ...config, baseUrl: e.target.value }) } disabled={status?.configured} /> </div> <div> <Label htmlFor="apiKey">API Key (Secret)</Label> <Input id="apiKey" type="password" placeholder="Toast API key" value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value }) } disabled={status?.configured} /> </div> <div> <Label htmlFor="managerId">Manager ID</Label> <Input id="managerId" placeholder="Toast manager/user ID" value={config.managerId} onChange={(e) => setConfig({ ...config, managerId: e.target.value }) } disabled={status?.configured} /> </div> <div> <Label htmlFor="entityId">Entity ID</Label> <Input id="entityId" placeholder="Aurum entity ID" value={config.entityId} onChange={(e) => setConfig({ ...config, entityId: e.target.value }) } /> </div> </div> {/* Features Toggle */} <div className="border-t pt-4 space-y-3"> <div className="flex items-center gap-2"> <input type="checkbox" id="hourlyRevenue" checked={config.hourlyRevenueSyncEnabled} onChange={(e) => setConfig({ ...config, hourlyRevenueSyncEnabled: e.target.checked, }) } /> <Label htmlFor="hourlyRevenue" className="cursor-pointer"> Enable Hourly Revenue Sync </Label> </div> <div className="flex items-center gap-2"> <input type="checkbox" id="cogsTracking" checked={config.cogsTrackingEnabled} onChange={(e) => setConfig({ ...config, cogsTrackingEnabled: e.target.checked, }) } /> <Label htmlFor="cogsTracking" className="cursor-pointer"> Enable COGS Tracking </Label> </div> <div> <Label htmlFor="threshold"> Discrepancy Alert Threshold (%) </Label> <Input id="threshold" type="number" min="1" max="100" value={config.discrepancyAlertThreshold} onChange={(e) => setConfig({ ...config, discrepancyAlertThreshold: parseFloat(e.target.value), }) } /> </div> </div> {/* Locations */} <div className="border-t pt-4 space-y-3"> <h3 className="font-semibold">POS Locations</h3> {config.locations.map((loc, idx) => ( <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded" > <div className="flex-1"> <p className="font-medium">{loc.name}</p> <p className="text-sm text-muted-foreground"> {loc.locationId} • {loc.timezone} • {loc.currency} </p> </div> <Button type="button" variant="ghost" size="sm" onClick={() => setConfig({ ...config, locations: config.locations.filter((_, i) => i !== idx), }) } > Remove </Button> </div> ))} <div className="border rounded p-4 space-y-3 bg-blue-50"> <h4 className="font-medium">Add New Location</h4> <div className="grid grid-cols-2 gap-3"> <Input placeholder="Location ID" value={newLocation.locationId} onChange={(e) => setNewLocation({ ...newLocation, locationId: e.target.value, }) } /> <Input placeholder="Location Name" value={newLocation.name} onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value }) } /> <select value={newLocation.timezone} onChange={(e) => setNewLocation({ ...newLocation, timezone: e.target.value, }) } className="border rounded px-3 py-2" > <option value="America/New_York">Eastern</option> <option value="America/Chicago">Central</option> <option value="America/Denver">Mountain</option> <option value="America/Los_Angeles">Pacific</option> </select> <Input placeholder="Currency" value={newLocation.currency} onChange={(e) => setNewLocation({ ...newLocation, currency: e.target.value, }) } /> </div> <Button type="button" variant="outline" size="sm" onClick={handleAddLocation} > Add Location </Button> </div> </div> <Button type="submit" disabled={loading || !config.baseUrl || !config.apiKey} > {loading ?"Saving..." :"Save Configuration"} </Button> </form> </CardContent> </Card> {/* Status Card */} {status && status.configured && ( <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <CheckCircle className="w-5 h-5 text-green-600" /> Integration Status </CardTitle> </CardHeader> <CardContent className="space-y-4"> <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> <div className="p-3 bg-blue-50 rounded"> <p className="text-sm text-muted-foreground">Revenue Records</p> <p className="text-2xl font-bold"> {status.stats.revenueRecords} </p> {status.stats.lastRevenueSync && ( <p className="text-xs text-muted-foreground"> Last:{""} {new Date( status.stats.lastRevenueSync, ).toLocaleDateString()} </p> )} </div> <div className="p-3 bg-green-50 rounded"> <p className="text-sm text-muted-foreground">COGS Records</p> <p className="text-2xl font-bold">{status.stats.cogsRecords}</p> {status.stats.lastCogsSync && ( <p className="text-xs text-muted-foreground"> Last:{""} {new Date(status.stats.lastCogsSync).toLocaleDateString()} </p> )} </div> <div className="p-3 bg-red-50 rounded"> <p className="text-sm text-muted-foreground">Open Discrepancies</p> <p className="text-2xl font-bold text-red-600"> {status.stats.openDiscrepancies} </p> </div> <div className="p-3 bg-surface rounded"> <p className="text-sm text-muted-foreground">Locations</p> <p className="text-2xl font-bold">{status.locations.length}</p> </div> </div> </CardContent> </Card> )} {/* Sync Operations */} {status && status.configured && ( <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <Zap className="w-5 h-5" /> Sync Operations </CardTitle> <CardDescription> Fetch real-time data from Toast and create GL entries </CardDescription> </CardHeader> <CardContent className="space-y-4"> {/* Date Range */} <div className="grid grid-cols-2 gap-4"> <div> <Label htmlFor="startDate">Start Date</Label> <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /> </div> <div> <Label htmlFor="endDate">End Date</Label> <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /> </div> </div> {/* Auto-Post Toggle */} <div className="flex items-center gap-2"> <input type="checkbox" id="autoPost" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} /> <Label htmlFor="autoPost" className="cursor-pointer"> Auto-post GL entries (bypass draft status) </Label> </div> {/* Sync Buttons */} <div className="grid grid-cols-2 gap-2"> <Button onClick={handleSyncRevenue} disabled={syncing || !status.hourlyRevenueSyncEnabled} className="w-full" > {syncing ?"Syncing..." :"Sync Revenue"} </Button> <Button onClick={handleSyncCogs} disabled={syncing || !status.cogsTrackingEnabled} className="w-full" variant="outline" > {syncing ?"Syncing..." :"Sync COGS"} </Button> </div> {/* Discrepancy Detection */} <Button onClick={handleDetectDiscrepancies} disabled={detectionRunning} variant="secondary" className="w-full" > {detectionRunning ? ("Analyzing..." ) : ( <> <AlertTriangle className="w-4 h-4 mr-2" /> Detect Discrepancies </> )} </Button> </CardContent> </Card> )} {/* Sync Results */} {syncResult && ( <Card className="border-blue-200 bg-blue-50"> <CardHeader> <CardTitle className="text-blue-900">Sync Complete</CardTitle> </CardHeader> <CardContent className="space-y-2 text-sm"> <p> <strong>Records Synced:</strong> {syncResult.synced} </p> <p> <strong>GL Entries Created:</strong> {syncResult.journalEntries} </p> <p> <strong>Status:</strong>{""} <Badge variant={ syncResult.status ==="posted" ?"default" :"secondary" } > {syncResult.status} </Badge> </p> <p>{syncResult.message}</p> </CardContent> </Card> )} {/* Discrepancy Results */} {detectionResult && ( <Card className={`border-${detectionResult.detected > 0 ?"red" :"green"}-200 bg-${detectionResult.detected > 0 ?"red" :"green"}-50`} > <CardHeader> <CardTitle className={`text-${detectionResult.detected > 0 ?"red" :"green"}-900`} > {detectionResult.detected > 0 ? `${detectionResult.detected} Discrepancies Detected` :"No Discrepancies Detected"} </CardTitle> </CardHeader> <CardContent className="space-y-3"> {detectionResult.discrepancies.map((disc, idx) => ( <div key={idx} className={`p-3 border rounded bg-${disc.severity ==="high" ?"red" : disc.severity ==="medium" ?"yellow" :"blue"}-50`} > <div className="flex items-start justify-between mb-2"> <Badge variant={ disc.severity ==="high" ?"destructive" : disc.severity ==="medium" ?"default" :"secondary" } > {disc.severity.toUpperCase()} - {disc.type} </Badge> <span className="text-sm font-semibold">{disc.variance}</span> </div> <p className="text-sm font-medium">{disc.description}</p> <p className="text-xs text-muted-foreground mt-1"> {disc.suggestedAction} </p> </div> ))} </CardContent> </Card> )} {/* Error Alert */} {error && ( <Alert variant="destructive"> <AlertTriangle className="h-4 w-4" /> <AlertDescription>{error}</AlertDescription> </Alert> )} {/* Success Message */} {message && !error && ( <Alert className="bg-green-50 border-green-200"> <CheckCircle className="h-4 w-4 text-green-600" /> <AlertDescription className="text-green-800"> {message} </AlertDescription> </Alert> )} </div> );
};
