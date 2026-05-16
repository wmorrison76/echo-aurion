/** * Publish Toggle Panel Component * Allows managers to publish/reopen schedules and track acknowledgements */ import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
interface PublishTogglePanelProps {
  schedule_id: string;
  manager_id: string;
  org_id: string;
  disabled?: boolean;
}
export const PublishTogglePanel: React.FC<PublishTogglePanelProps> = ({
  schedule_id,
  manager_id,
  org_id,
  disabled = false,
}) => {
  const [status, setStatus] = React.useState<"draft" | "published">("draft");
  const [ackData, setAckData] = React.useState({
    total_employees: 0,
    acknowledged: 0,
    pending: 0,
    ack_rate: 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null); // Fetch acknowledgement status React.useEffect(() => { const fetchStatus = async () => { try { const res = await fetch( `/api/publish/status?schedule_id=${schedule_id}`, ); if (!res.ok) throw new Error("Failed to fetch status"); const data = await res.json(); setAckData(data); // If some acks exist, assume published if (data.acknowledged > 0) { setStatus("published"); } } catch (err) { console.error("Status fetch failed:", err); } }; fetchStatus(); const interval = setInterval(fetchStatus, 5000); // Poll every 5s return () => clearInterval(interval); }, [schedule_id]); const publish = async () => { setLoading(true); setError(null); try { const res = await fetch("/api/publish/publish", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ schedule_id, manager_id, org_id, notes:"Published from UI", }), }); if (!res.ok) throw new Error("Failed to publish"); setStatus("published"); } catch (err) { setError((err as Error).message); } finally { setLoading(false); } }; const reopen = async () => { setLoading(true); setError(null); try { const res = await fetch("/api/publish/reopen", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ schedule_id, manager_id, org_id }), }); if (!res.ok) throw new Error("Failed to reopen"); setStatus("draft"); } catch (err) { setError((err as Error).message); } finally { setLoading(false); } }; const ackPercent = Math.round(ackData.ack_rate); return ( <Card className="shadow-lg"> <CardHeader className="bg-card border-b"> <div className="flex items-center justify-between"> <h3 className="font-semibold text-foreground">Publish Schedule</h3> <div className={`px-3 py-1 rounded-full text-xs font-semibold ${ status ==="published" ?"bg-green-500/20 text-green-300" :"bg-yellow-500/20 text-yellow-300" }`} > {status ==="published" ?"Published" :"Draft"} </div> </div> </CardHeader> <CardContent className="space-y-4 pt-4"> {error && ( <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm"> <AlertCircle className="h-4 w-4" /> {error} </div> )} {/* Acknowledgement Progress */} {status ==="published" && ( <div className="space-y-2"> <div className="flex items-center justify-between text-sm"> <span className="text-muted-foreground">Acknowledgements</span> <span className="font-semibold text-primary"> {ackData.acknowledged}/{ackData.total_employees} </span> </div> <div className="w-full bg-muted rounded-full h-2"> <div className="bg-gradient-to-r from-primary to-blue-500 h-2 rounded-full transition-all" style={{ width: `${ackPercent}%` }} /> </div> <div className="flex items-center gap-4 text-xs text-muted-foreground"> <div className="flex items-center gap-1"> <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" /> {ackData.acknowledged} Acknowledged </div> <div className="flex items-center gap-1"> <Clock className="h-3 w-3 text-yellow-600 dark:text-yellow-400" /> {ackData.pending} Pending </div> </div> </div> )} {/* Action Buttons */} <div className="flex gap-2"> <Button onClick={publish} disabled={disabled || loading || status ==="published"} className="flex-1 bg-green-600 hover:bg-green-500" > {loading ?"Publishing..." :"Publish"} </Button> <Button onClick={reopen} disabled={disabled || loading || status ==="draft"} variant="secondary" className="flex-1" > {loading ?"Reopening..." :"Reopen"} </Button> </div> <div className="text-xs text-muted-foreground border-t pt-2"> <div> Status:{""} {status ==="published" ?"Employees can acknowledge" :"In draft, not visible to employees"} </div> <div className="mt-1"> Last updated: {new Date().toLocaleTimeString()} </div> </div> </CardContent> </Card> );
};
export default PublishTogglePanel;
