import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  CloudSync,
  Bell,
  CheckCircle,
  AlertCircle,
  Loader,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { useAppTheme } from "@/lib/theme-utils";
import { responsiveClasses } from "@/lib/responsive-utils";
import { cn } from "@/lib/glass";
import { useMobileEnhancementsIntegration } from "./integrations/mobile-integration";
interface MobileEnhancementsData {
  offlineCapabilities: {
    syncStatus: Array<{
      resourceType: "schedules" | "forecasts" | "tasks" | "messages";
      lastSyncTime: string;
      itemCount: number;
      dataSize: number;
      status: "synced" | "pending" | "error";
    }>;
    cacheSize: number;
    lastFullSync: string;
    queuedActions: number;
  };
  pushNotifications: {
    enabled: boolean;
    recentNotifications: Array<{
      notificationId: string;
      type: "schedule" | "alert" | "message" | "task" | "forecast";
      title: string;
      body: string;
      priority: "high" | "normal" | "low";
      actions: Array<{ actionId: string; label: string; url?: string }>;
      createdAt: string;
      expiresAt: string;
    }>;
    scheduledNotifications: Array<{
      notificationId: string;
      type: string;
      title: string;
      body: string;
      priority: string;
      actions: Array<{ actionId: string; label: string; url?: string }>;
      createdAt: string;
      expiresAt: string;
    }>;
  };
  performanceMetrics: {
    averageLoadTime: number;
    offlineAccessTime: number;
    syncSpeed: number;
  };
  features: {
    offlineScheduleViewing: boolean;
    offlineShiftSwapping: boolean;
    offlineTimeClocking: boolean;
    biometricAuth: boolean;
    voiceCommands: boolean;
  };
  recommendations: string[];
}
export const MobileEnhancements: React.FC = () => {
  const { t } = useI18n();
  const { theme, isDark } = useAppTheme();
  const { syncOfflineChanges, getOfflineData } =
    useMobileEnhancementsIntegration();
  const [data, setData] = useState<MobileEnhancementsData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false); // Sync offline data when component mounts useEffect(() => { const offlineData = getOfflineData(); console.log("[MobileEnhancements] Offline data loaded:", offlineData); }, [getOfflineData]); const handleGenerateData = async () => { setIsGenerating(true); try { const response = await fetch("/api/mobile/enhancements", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ deviceType:"iOS", appVersion:"3.0" }), }); if (response.ok) { setData(await response.json()); } } catch (error) { console.error("Mobile enhancements error:", error); } finally { setIsGenerating(false); } }; const getSyncStatusColor = (status: string) => { switch (status) { case"synced": return"text-green-600 dark:text-green-400"; case"pending": return"text-yellow-600 dark:text-yellow-400"; case"error": return"text-red-600 dark:text-red-400"; default: return"text-muted-foreground"; } }; const getPriorityColor = (priority: string) => { switch (priority) { case"high": return"bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"; case"normal": return"bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"; case"low": return"bg-slate-100 dark:bg-slate-700 text-slate-800"; default: return"bg-slate-100 dark:bg-slate-700 text-slate-800"; } }; return ( <div className={cn("w-full h-full flex flex-col bg-background text-foreground", responsiveClasses({ default:"p-4", md:"p-6", lg:"p-8", }), )}> <div className="mb-6"> <div className="flex items-center justify-between mb-2"> <div className="flex items-center gap-3"> <Smartphone className="w-8 h-8 text-primary" /> <div> <h1 className="text-3xl font-bold text-foreground"> {t("module.mobile-enhancements.title")} </h1> <p className="text-muted-foreground"> {t("module.mobile-enhancements.description")} </p> </div> </div> <ModuleChatButton moduleId="mobile-enhancements" moduleName={t("module.mobile-enhancements.title")} /> </div> </div> {!data ? ( <div className="flex flex-col items-center justify-center flex-1"> <Smartphone className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" /> <h2 className="text-2xl font-bold text-foreground mb-6"> Generate Mobile Enhancements Report </h2> <Button onClick={handleGenerateData} disabled={isGenerating} size="lg" className="gap-2" > {isGenerating ? ( <> <Loader className="w-4 h-4 animate-spin" /> Loading... </> ) : ( <> <Smartphone className="w-4 h-4" /> Generate Report </> )} </Button> </div> ) : ( <> <div className={responsiveClasses({ default:"grid grid-cols-1 gap-3", sm:"grid grid-cols-2 gap-3", lg:"grid grid-cols-3 gap-3", })}> <div className="bg-card rounded-lg p-3 border border-border"> <p className="text-xs font-semibold uppercase text-muted-foreground mb-1"> Cache Size </p> <p className="text-2xl font-bold text-foreground"> {data.offlineCapabilities.cacheSize} <span className="text-sm text-muted-foreground ml-1"> MB </span> </p> </div> <div className="bg-card rounded-lg p-3 border border-border"> <p className="text-xs font-semibold uppercase text-muted-foreground mb-1"> Load Time </p> <p className="text-2xl font-bold text-foreground"> {data.performanceMetrics.averageLoadTime} <span className="text-sm text-muted-foreground ml-1"> s </span> </p> </div> <div className="bg-card rounded-lg p-3 border border-border"> <p className="text-xs font-semibold uppercase text-muted-foreground mb-1"> Offline Access </p> <p className="text-2xl font-bold text-foreground"> {data.performanceMetrics.offlineAccessTime} <span className="text-sm text-muted-foreground ml-1"> s </span> </p> </div> </div> <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"> <div className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border"> <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2"> <CloudSync className="w-4 h-4" /> Offline Sync Status </h3> <div className="space-y-2"> {data.offlineCapabilities.syncStatus.map((sync) => ( <div key={sync.resourceType} className="flex justify-between items-start p-2 bg-slate-50 dark:bg-slate-700 rounded" > <div> <p className="text-sm font-medium text-foreground dark:text-white capitalize"> {sync.resourceType} </p> <p className="text-xs text-muted-foreground"> {sync.itemCount} items • {sync.dataSize} MB </p> </div> <span className={`text-xs font-bold ${getSyncStatusColor(sync.status)}`} > {sync.status ==="synced" ?"✓" : sync.status ==="pending" ?"⏳" :"✕"}{""} {sync.status.toUpperCase()} </span> </div> ))} </div> <p className="text-xs text-muted-foreground mt-3"> Last Full Sync:{""} {new Date( data.offlineCapabilities.lastFullSync, ).toLocaleTimeString()} </p> </div> <div className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border"> <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2"> <Zap className="w-4 h-4" /> Enabled Features </h3> <div className="space-y-2"> {Object.entries(data.features).map(([feature, enabled]) => ( <div key={feature} className="flex items-center gap-2"> {enabled ? ( <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /> ) : ( <AlertCircle className="w-4 h-4 text-slate-400" /> )} <span className="text-sm text-foreground dark:text-white capitalize"> {feature.replace(/([A-Z])/g," $1").trim()} </span> </div> ))} </div> </div> </div> <div className="mb-6"> <h3 className="font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2"> <Bell className="w-4 h-4" /> Recent Notifications ( {data.pushNotifications.recentNotifications.length}) </h3> <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto"> {data.pushNotifications.recentNotifications.map((notif) => ( <div key={notif.notificationId} className={`p-3 rounded-lg text-sm ${getPriorityColor(notif.priority)}`} > <p className="font-semibold">{notif.title}</p> <p className="text-xs mt-1 opacity-90">{notif.body}</p> <p className="text-xs mt-2 opacity-75"> {new Date(notif.createdAt).toLocaleTimeString()} </p> </div> ))} </div> </div> <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-purple-200 dark:border-slate-600 mb-4"> <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3"> Recommendations </h3> <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-300"> {data.recommendations.map((rec, i) => ( <li key={i}>{rec}</li> ))} </ul> </div> <Button onClick={() => setData(null)} variant="outline" size="sm" className="w-full" > Generate New Report </Button> </> )} </div> );
};
export default MobileEnhancements;
