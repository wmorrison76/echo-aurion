import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFusionStatus } from "@/hooks/useFusionStatus";
import { useRoomShell } from "@/hooks/useRoomShell";
import { RefreshCw, Play, Check, AlertCircle, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
interface FusionStatusPanelProps {
  session?: string;
  onFusionStart?: (jobId: string) => void;
  onFusionComplete?: (glbUrl: string) => void;
}
export function FusionStatusPanel({
  session = "P66_DiningRoom",
  onFusionStart,
  onFusionComplete,
}: FusionStatusPanelProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(session);
  const { job, isProcessing, isComplete, isFailed, refresh } =
    useFusionStatus(jobId);
  const {
    shell,
    loading: shellLoading,
    refresh: refreshShell,
  } = useRoomShell(sessionId);
  const handleStartFusion = async () => {
    try {
      const response = await fetch("/api/reality/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionId }),
      });
      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Fusion failed",
          description: error.message || "Could not start fusion",
          variant: "destructive",
        });
        return;
      }
      const data = await response.json();
      setJobId(data.jobId);
      onFusionStart?.(data.jobId);
      toast({
        title: "Fusion started",
        description: `Processing ${data.scanCount || "multiple"} scans...`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to start fusion",
        variant: "destructive",
      });
    }
  };
  const handleLoadShell = async () => {
    refreshShell();
    if (shell?.glbUrl) {
      onFusionComplete?.(shell.glbUrl);
      toast({
        title: "Room shell loaded",
        description: "Ready to place furniture on real geometry",
      });
    }
  };
  const progressPercent = isProcessing ? 50 : isComplete ? 100 : 0;
  return (
    <div className="w-full space-y-4 p-4">
      {" "}
      {/* Session Input */}{" "}
      <Card className="p-4 border border-slate-200">
        {" "}
        <Label
          htmlFor="session"
          className="text-xs text-muted-foreground mb-2 block"
        >
          {" "}
          Session ID{" "}
        </Label>{" "}
        <Input
          id="session"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="e.g., P66_DiningRoom"
          className="mb-3"
        />{" "}
        <Button
          onClick={handleStartFusion}
          disabled={isProcessing}
          className="w-full bg-primary hover:opacity-90"
        >
          {" "}
          <Play className="h-4 w-4 mr-2" />{" "}
          {isProcessing ? "Fusion in progress..." : "Start Mesh Fusion"}{" "}
        </Button>{" "}
      </Card>{" "}
      {/* Fusion Job Status */}{" "}
      {job && (
        <Card className="p-4 border border-slate-200">
          {" "}
          <div className="space-y-3">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <h3 className="font-semibold text-foreground">Fusion Job</h3>{" "}
              <Badge
                variant={
                  job.status === "completed"
                    ? "default"
                    : job.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {" "}
                {job.status.toUpperCase()}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {" "}
              <div className="p-2 rounded bg-slate-50">
                {" "}
                <span className="text-muted-foreground">Job ID</span>{" "}
                <p className="font-mono text-xs truncate">{job.jobId}</p>{" "}
              </div>{" "}
              <div className="p-2 rounded bg-slate-50">
                {" "}
                <span className="text-muted-foreground">Scans</span>{" "}
                <p className="font-bold text-lg">{job.scanCount}</p>{" "}
              </div>{" "}
            </div>{" "}
            {/* Progress Bar */}{" "}
            {isProcessing && (
              <div>
                {" "}
                <div className="flex items-center justify-between mb-2">
                  {" "}
                  <span className="text-xs font-medium text-muted-foreground">
                    Processing
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">
                    ~50%
                  </span>{" "}
                </div>{" "}
                <Progress value={progressPercent} className="h-2" />{" "}
              </div>
            )}{" "}
            {/* Status Messages */}{" "}
            {isProcessing && (
              <Alert className="bg-blue-50 border-blue-200">
                {" "}
                <Zap className="h-4 w-4 text-primary" />{" "}
                <AlertDescription className="text-xs text-blue-800">
                  {" "}
                  Aligning scans with ICP and fusing mesh... This may take a few
                  minutes.{" "}
                </AlertDescription>{" "}
              </Alert>
            )}{" "}
            {isComplete && (
              <Alert className="bg-green-50 border-green-200">
                {" "}
                <Check className="h-4 w-4 text-green-600" />{" "}
                <AlertDescription className="text-xs text-green-800">
                  {" "}
                  Fusion completed successfully! Room shell is ready.{" "}
                </AlertDescription>{" "}
              </Alert>
            )}{" "}
            {isFailed && (
              <Alert variant="destructive">
                {" "}
                <AlertCircle className="h-4 w-4" />{" "}
                <AlertDescription className="text-xs">
                  {" "}
                  {job.errorMessage || "Fusion failed. Please try again."}{" "}
                </AlertDescription>{" "}
              </Alert>
            )}{" "}
            {/* Refresh Button */}{" "}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="w-full"
              disabled={!isProcessing}
            >
              {" "}
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh Status{" "}
            </Button>{" "}
          </div>{" "}
        </Card>
      )}{" "}
      {/* Room Shell Status */}{" "}
      <Card className="p-4 border border-slate-200">
        {" "}
        <div className="space-y-3">
          {" "}
          <h3 className="font-semibold text-foreground">Room Shell</h3>{" "}
          {shellLoading && (
            <p className="text-xs text-muted-foreground">
              Loading shell status...
            </p>
          )}{" "}
          {shell ? (
            <div className="space-y-2">
              {" "}
              <Alert className="bg-green-50 border-green-200">
                {" "}
                <Check className="h-4 w-4 text-green-600" />{" "}
                <AlertDescription className="text-xs text-green-800">
                  {" "}
                  Room shell available! Ready to load into layout.{" "}
                </AlertDescription>{" "}
              </Alert>{" "}
              <div className="p-2 rounded bg-slate-50 text-xs">
                {" "}
                <p className="text-muted-foreground mb-1">
                  Mesh Properties
                </p>{" "}
                <dl className="space-y-1">
                  {" "}
                  {shell.meta?.mesh_vertices && (
                    <>
                      {" "}
                      <dt className="text-muted-foreground">Vertices:</dt>{" "}
                      <dd className="font-mono text-foreground">
                        {shell.meta.mesh_vertices.toLocaleString()}
                      </dd>{" "}
                    </>
                  )}{" "}
                  {shell.meta?.accuracy && (
                    <>
                      {" "}
                      <dt className="text-muted-foreground">Accuracy:</dt>{" "}
                      <dd className="font-mono text-foreground">
                        {(shell.meta.accuracy * 100).toFixed(0)}%
                      </dd>{" "}
                    </>
                  )}{" "}
                </dl>{" "}
              </div>{" "}
              <Button
                onClick={handleLoadShell}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {" "}
                Load into EchoLayout{" "}
              </Button>{" "}
            </div>
          ) : (
            <Alert className="bg-amber-50 border-amber-200">
              {" "}
              <AlertCircle className="h-4 w-4 text-amber-600" />{" "}
              <AlertDescription className="text-xs text-amber-800">
                {" "}
                No room shell available yet. Run fusion first.{" "}
              </AlertDescription>{" "}
            </Alert>
          )}{" "}
        </div>{" "}
      </Card>{" "}
      {/* Info */}{" "}
      <Card className="p-3 border border-slate-200 bg-slate-50">
        {" "}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {" "}
          <strong>Workflow:</strong> Upload scans → Start fusion → Monitor
          progress → Load room shell into layout{" "}
        </p>{" "}
      </Card>{" "}
    </div>
  );
}
