import React, { useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import RealtimeSyncEngine from "./RealtimeSyncEngine";
import { cn } from "@/lib/glass";
interface CollaborationStatusIndicatorProps {
  syncEngine: RealtimeSyncEngine | null;
  participantCount: number;
  className?: string;
}
interface SyncStatus {
  isSyncing: boolean;
  pendingChanges: number;
  clientVersion: number;
  serverVersion: number;
  lastSyncTime: number;
}
export const CollaborationStatusIndicator: React.FC<
  CollaborationStatusIndicatorProps
> = ({ syncEngine, participantCount, className }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("Just now");
  useEffect(() => {
    if (!syncEngine) return;
    const updateStatus = () => {
      const status = syncEngine.getSyncStatus();
      setSyncStatus(status);
      const timeDiff = Date.now() - status.lastSyncTime;
      if (timeDiff < 1000) {
        setLastUpdate("Just now");
      } else if (timeDiff < 60000) {
        setLastUpdate(`${Math.floor(timeDiff / 1000)}s ago`);
      } else {
        setLastUpdate(`${Math.floor(timeDiff / 60000)}m ago`);
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [syncEngine]);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  if (!syncStatus) {
    return null;
  }
  const hasConflicts = syncStatus.pendingChanges > 0 && syncStatus.isSyncing;
  const syncDelayWarning = Date.now() - syncStatus.lastSyncTime > 10000;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800",
        className,
      )}
    >
      {" "}
      {/* Connection Status */}{" "}
      <div className="flex items-center gap-1.5">
        {" "}
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}{" "}
        <span className="text-xs font-medium">
          {" "}
          {isOnline ? "Online" : "Offline"}{" "}
        </span>{" "}
      </div>{" "}
      {/* Participants */}{" "}
      <div className="flex items-center gap-1.5 border-l border-slate-300 pl-3 dark:border-slate-600">
        {" "}
        <Users className="h-4 w-4 text-muted-foreground" />{" "}
        <span className="text-xs font-medium">{participantCount}</span>{" "}
      </div>{" "}
      {/* Pending Changes */}{" "}
      {syncStatus.pendingChanges > 0 && (
        <div className="flex items-center gap-1.5 border-l border-slate-300 pl-3 dark:border-slate-600">
          {" "}
          {syncStatus.isSyncing ? (
            <>
              {" "}
              <Clock className="h-4 w-4 animate-spin text-primary" />{" "}
              <span className="text-xs font-medium">
                {" "}
                {syncStatus.pendingChanges} pending{" "}
              </span>{" "}
            </>
          ) : (
            <>
              {" "}
              <CheckCircle className="h-4 w-4 text-green-600" />{" "}
              <span className="text-xs font-medium">Synced</span>{" "}
            </>
          )}{" "}
        </div>
      )}{" "}
      {/* Sync Delay Warning */}{" "}
      {syncDelayWarning && (
        <div className="flex items-center gap-1.5 border-l border-slate-300 pl-3 dark:border-slate-600">
          {" "}
          <AlertCircle className="h-4 w-4 text-yellow-600" />{" "}
          <span className="text-xs font-medium">Slow connection</span>{" "}
        </div>
      )}{" "}
      {/* Last Sync Time */}{" "}
      <div className="ml-auto border-l border-slate-300 pl-3 text-xs text-muted-foreground dark:border-slate-600">
        {" "}
        {lastUpdate}{" "}
      </div>{" "}
    </div>
  );
};
export default CollaborationStatusIndicator;
