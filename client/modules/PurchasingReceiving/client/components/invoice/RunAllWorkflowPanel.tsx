import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Clock, Play, Pause } from "lucide-react";
import {
  executeRunAllWorkflow,
  WorkflowProgress,
  RunAllConfig,
} from "@/lib/invoice-run-all-workflow";
interface RunAllWorkflowPanelProps {
  invoiceId: string;
  onComplete?: (result: any) => void;
  disabled?: boolean;
}
export function RunAllWorkflowPanel({
  invoiceId,
  onComplete,
  disabled = false,
}: RunAllWorkflowPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  const [error, setError] = useState<string | null>(null); // Configuration const [config, setConfig] = useState<RunAllConfig>({ skipUpload: false, skipNormalize: false, runAnomalyDetection: true, skipExport: false, skipPay: false, erpOption:"r365", paymentGateway:"stripe", requireApproval: true, }); const handleRunAll = async () => { setIsRunning(true); setError(null); try { const result = await executeRunAllWorkflow(invoiceId, config, { onProgress: (p) => setProgress(p), onError: (err) => setError(err), onStepComplete: () => { // UI updates happen via progress callback }, }); if (result.success) { onComplete?.(result); } else { setError(result.error); } } catch (err) { setError(err instanceof Error ? err.message :"Workflow failed"); } finally { setIsRunning(false); } }; const resetWorkflow = () => { setProgress(null); setError(null); }; return ( <Card className="border border-slate-800/60 bg-card"> <CardHeader className="pb-3"> <div className="flex items-center justify-between"> <div> <CardTitle className="text-base flex items-center gap-2"> <Play className="h-4 w-4 text-cyan-400" /> Run All Workflow </CardTitle> <CardDescription className="text-xs mt-1"> Automate upload → normalize → detect anomalies → export → pay </CardDescription> </div> {progress && ( <Badge variant="outline" className="text-xs"> {progress.percentComplete}% Complete </Badge> )} </div> </CardHeader> <CardContent className="space-y-4"> {/* Configuration Section */} {!isRunning && !progress && ( <div className="space-y-3 border-b border-border pb-3"> <div className="space-y-2"> <label className="text-xs font-medium text-slate-400">ERP Export</label> <Select value={config.erpOption} onValueChange={(val) => setConfig({ ...config, erpOption: val as"r365" |"simphony" |"netsuite", }) } > <SelectTrigger className="h-8 text-xs"> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="r365">R365 (Toast POS)</SelectItem> <SelectItem value="simphony">Simphony</SelectItem> <SelectItem value="netsuite">NetSuite</SelectItem> </SelectContent> </Select> </div> <div className="space-y-2"> <label className="text-xs font-medium text-slate-400">Payment Gateway</label> <Select value={config.paymentGateway} onValueChange={(val) => setConfig({ ...config, paymentGateway: val as"stripe" |"square" |"adyen", }) } > <SelectTrigger className="h-8 text-xs"> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="stripe">Stripe</SelectItem> <SelectItem value="square">Square</SelectItem> <SelectItem value="adyen">Adyen</SelectItem> </SelectContent> </Select> </div> <div className="space-y-2"> <div className="flex items-center gap-2"> <Checkbox id="skipUpload" checked={config.skipUpload || false} onCheckedChange={(checked) => setConfig({ ...config, skipUpload: checked as boolean }) } /> <label className="text-xs cursor-pointer" htmlFor="skipUpload"> Skip Upload (use existing) </label> </div> <div className="flex items-center gap-2"> <Checkbox id="skipNormalize" checked={config.skipNormalize || false} onCheckedChange={(checked) => setConfig({ ...config, skipNormalize: checked as boolean }) } /> <label className="text-xs cursor-pointer" htmlFor="skipNormalize"> Skip Normalization </label> </div> <div className="flex items-center gap-2"> <Checkbox id="runAnomalies" checked={config.runAnomalyDetection || false} onCheckedChange={(checked) => setConfig({ ...config, runAnomalyDetection: checked as boolean }) } /> <label className="text-xs cursor-pointer" htmlFor="runAnomalies"> Detect Anomalies (Echo AI) </label> </div> <div className="flex items-center gap-2"> <Checkbox id="requireApproval" checked={config.requireApproval || false} onCheckedChange={(checked) => setConfig({ ...config, requireApproval: checked as boolean }) } /> <label className="text-xs cursor-pointer" htmlFor="requireApproval"> Require Approval for Anomalies </label> </div> </div> </div> )} {/* Error Display */} {error && ( <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400"> <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <div> <div className="font-medium">Workflow Error</div> <div>{error}</div> </div> </div> )} {/* Progress Display */} {progress && ( <div className="space-y-3"> {/* Progress Bar */} <div className="space-y-1"> <div className="flex items-center justify-between text-xs"> <span className="text-slate-400">Progress</span> <span className="text-cyan-400 font-medium"> {progress.completedSteps} / {progress.totalSteps} </span> </div> <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden"> <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300" style={{ width: `${progress.percentComplete}%` }} /> </div> </div> {/* Steps */} <div className="space-y-2 max-h-60 overflow-y-auto"> {progress.steps.map((step) => ( <div key={step.stepId} className="flex items-start gap-2 text-xs p-2 rounded border border-border bg-surface" > <div className="mt-0.5"> {step.status ==="completed" && ( <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> )} {step.status ==="running" && ( <Clock className="h-3.5 w-3.5 text-cyan-400 animate-spin" /> )} {step.status ==="failed" && ( <AlertCircle className="h-3.5 w-3.5 text-red-400" /> )} {step.status ==="pending" && ( <div className="h-3.5 w-3.5 rounded-full border border-slate-600" /> )} {step.status ==="skipped" && ( <div className="h-3.5 w-3.5 rounded-full bg-slate-700" /> )} </div> <div className="flex-1"> <div className="font-medium text-slate-300">{step.label}</div> {step.error && <div className="text-red-400 text-xs mt-0.5">{step.error}</div>} {step.duration && ( <div className="text-slate-400 text-xs mt-0.5"> {(step.duration / 1000).toFixed(1)}s </div> )} </div> </div> ))} </div> {/* Elapsed Time */} <div className="text-xs text-slate-400 text-center"> Elapsed: {(progress.elapsedTime / 1000).toFixed(1)}s </div> </div> )} {/* Action Buttons */} <div className="flex gap-2 pt-2 border-t border-border"> {!isRunning && !progress && ( <Button onClick={handleRunAll} disabled={disabled} className="flex-1 h-8 text-xs gap-2 bg-cyan-600 hover:bg-cyan-700" > <Play className="h-3.5 w-3.5" /> Run All </Button> )} {progress && ( <> {isRunning && ( <Button onClick={() => setIsRunning(false)} variant="outline" className="flex-1 h-8 text-xs gap-2" > <Pause className="h-3.5 w-3.5" /> Pause </Button> )} {!isRunning && ( <Button onClick={resetWorkflow} variant="outline" className="flex-1 h-8 text-xs" > Reset </Button> )} </> )} </div> </CardContent> </Card> );
}
