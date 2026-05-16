import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Lock,
  Eye,
  Zap,
  Share2,
  RefreshCw,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { useAppTheme } from "@/lib/theme-utils";
import { responsiveClasses } from "@/lib/responsive-utils";
import { useUnifiedCanvasIntegration } from "./integrations/canvas-integration";
interface TeamMember {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  lastActive: string;
  status: "active" | "idle" | "offline";
}
interface SharedContext {
  id: string;
  title: string;
  description: string;
  teams: string[];
  lastUpdated: string;
  changeCount: number;
}
interface PermissionLevel {
  role: string;
  view: boolean;
  edit: boolean;
  delete: boolean;
  share: boolean;
  admin: boolean;
}
interface CollaborationMetric {
  date: string;
  activeUsers: number;
  changes: number;
  conflicts: number;
  resolution: number;
}
const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Executive Chef",
    permissions: ["view", "edit", "delete", "share", "admin"],
    lastActive: "2024-02-19 18:45",
    status: "active",
  },
  {
    id: "2",
    name: "Marcus Johnson",
    role: "Sous Chef",
    permissions: ["view", "edit", "share"],
    lastActive: "2024-02-19 18:30",
    status: "active",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    role: "Manager",
    permissions: ["view", "edit", "share"],
    lastActive: "2024-02-19 17:15",
    status: "idle",
  },
  {
    id: "4",
    name: "David Lee",
    role: "Line Cook",
    permissions: ["view"],
    lastActive: "2024-02-19 15:00",
    status: "offline",
  },
];
const SHARED_CONTEXTS: SharedContext[] = [
  {
    id: "1",
    title: "Daily Service Plan",
    description: "Menu, staffing, and prep schedule for today",
    teams: ["Kitchen", "Front of House"],
    lastUpdated: "2024-02-19 09:00",
    changeCount: 12,
  },
  {
    id: "2",
    title: "Inventory Reconciliation",
    description: "Real-time inventory across all stations",
    teams: ["Kitchen", "Inventory", "Management"],
    lastUpdated: "2024-02-19 14:30",
    changeCount: 8,
  },
  {
    id: "3",
    title: "Event Planning",
    description: "Private event setup and execution",
    teams: ["Front of House", "Kitchen", "Management"],
    lastUpdated: "2024-02-19 16:45",
    changeCount: 15,
  },
];
const PERMISSION_MATRIX: PermissionLevel[] = [
  {
    role: "Executive Chef",
    view: true,
    edit: true,
    delete: true,
    share: true,
    admin: true,
  },
  {
    role: "Manager",
    view: true,
    edit: true,
    delete: false,
    share: true,
    admin: false,
  },
  {
    role: "Sous Chef",
    view: true,
    edit: true,
    delete: false,
    share: true,
    admin: false,
  },
  {
    role: "Line Cook",
    view: true,
    edit: false,
    delete: false,
    share: false,
    admin: false,
  },
  {
    role: "Server",
    view: true,
    edit: false,
    delete: false,
    share: false,
    admin: false,
  },
];
const COLLABORATION_METRICS: CollaborationMetric[] = [
  { date: "Mon", activeUsers: 6, changes: 34, conflicts: 0, resolution: 0 },
  { date: "Tue", changes: 28, activeUsers: 5, conflicts: 1, resolution: 100 },
  { date: "Wed", changes: 42, activeUsers: 7, conflicts: 2, resolution: 100 },
  { date: "Thu", changes: 51, activeUsers: 8, conflicts: 1, resolution: 100 },
  { date: "Fri", changes: 67, activeUsers: 9, conflicts: 3, resolution: 100 },
  { date: "Sat", changes: 89, activeUsers: 12, conflicts: 2, resolution: 100 },
  { date: "Sun", changes: 45, activeUsers: 7, conflicts: 0, resolution: 0 },
];
export default function UnifiedCanvasModule() {
  const { t } = useI18n();
  const { theme, isDark } = useAppTheme();
  const { syncContextToSchedule, syncContextToInventory } =
    useUnifiedCanvasIntegration();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedContext, setSelectedContext] = useState<string | null>(null); // Sync contexts when they're shared const handleShareContext = async (context: SharedContext) => { // Sync to schedule and inventory syncContextToSchedule(context); syncContextToInventory(context); // Original share logic try { const response = await fetch("/api/unified-canvas/share", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ contextId: context.id, teams: context.teams, permissions:"view", }), }); if (!response.ok) throw new Error("Share failed"); } catch (error) { console.error("Share error:", error); } }; const activeUsers = TEAM_MEMBERS.filter((m) => m.status ==="active").length; const totalPermissions = TEAM_MEMBERS.reduce((sum, m) => sum + m.permissions.length, 0); const totalContexts = SHARED_CONTEXTS.length; const totalChanges = SHARED_CONTEXTS.reduce((sum, c) => sum + c.changeCount, 0); return ( <div className={cn("w-full h-full overflow-y-auto bg-background text-foreground backdrop-blur-sm", responsiveClasses({ default:"p-4", md:"p-6", lg:"p-8", }),"space-y-6", )}> {/* Header */} <div className="flex items-center justify-between"> <div> <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"> <Share2 className="w-8 h-8 text-cyan-500" /> {t("module.unified-canvas.title")} </h1> <p className="text-sm text-foreground/60 mt-1"> {t("module.unified-canvas.description")} </p> </div> <ModuleChatButton moduleId="unified-canvas" moduleName={t("module.unified-canvas.title")} /> </div> {/* Quick Stats */} <div className={responsiveClasses({ default:"grid grid-cols-1 gap-3", sm:"grid grid-cols-2 gap-3", md:"grid grid-cols-4 gap-4", })}> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Active Users</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-green-500">{activeUsers}/{TEAM_MEMBERS.length}</div> <p className="text-xs text-foreground/50 mt-1">Connected now</p> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Shared Contexts</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-blue-500">{totalContexts}</div> <p className="text-xs text-foreground/50 mt-1">Active collaborations</p> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Total Changes</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-purple-500">{totalChanges}</div> <p className="text-xs text-foreground/50 mt-1">This week</p> </CardContent> </Card> <Card className="bg-background border-white/10"> <CardHeader className="pb-2"> <CardTitle className="text-sm text-foreground/60">Avg Permissions</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold text-orange-500">{(totalPermissions / TEAM_MEMBERS.length).toFixed(1)}</div> <p className="text-xs text-foreground/50 mt-1">Per team member</p> </CardContent> </Card> </div> {/* Tabs */} <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full"> <TabsList className="grid w-full grid-cols-4 bg-background border border-white/10 p-1 rounded-lg"> <TabsTrigger value="overview">Overview</TabsTrigger> <TabsTrigger value="team">Team</TabsTrigger> <TabsTrigger value="contexts">Contexts</TabsTrigger> <TabsTrigger value="permissions">Permissions</TabsTrigger> </TabsList> {/* Overview */} <TabsContent value="overview" className="space-y-4 mt-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Collaboration Activity</CardTitle> </CardHeader> <CardContent className="h-80"> <ResponsiveContainer width="100%" height="100%"> <BarChart data={COLLABORATION_METRICS}> <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" /> <XAxis dataKey="date" stroke="#ffffff60" /> <YAxis stroke="#ffffff60" /> <Tooltip contentStyle={{ backgroundColor:"#1a1a1a", border:"1px solid #ffffff20", borderRadius:"8px", }} /> <Legend /> <Bar dataKey="changes" fill="#00b4d8" /> <Bar dataKey="activeUsers" fill="#00d4aa" /> </BarChart> </ResponsiveContainer> </CardContent> </Card> </TabsContent> {/* Team */} <TabsContent value="team" className="space-y-4 mt-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Team Members</CardTitle> </CardHeader> <CardContent className="space-y-3"> {TEAM_MEMBERS.map((member) => ( <div key={member.id} className="border border-white/10 rounded-lg p-4"> <div className="flex justify-between items-start mb-2"> <div> <h4 className="font-semibold text-foreground">{member.name}</h4> <p className="text-xs text-foreground/60 mt-1">{member.role}</p> </div> <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", member.status ==="active" ?"bg-green-500/20 text-green-500" : member.status ==="idle" ?"bg-yellow-500/20 text-yellow-500" :"bg-surface/20 text-muted-foreground" )} > {member.status} </div> </div> <div className="space-y-2 text-sm"> <p className="text-foreground/70"> <span className="font-semibold">Permissions:</span> {member.permissions.length}/5 granted </p> <p className="text-foreground/70"> <span className="font-semibold">Last Active:</span> {member.lastActive} </p> <div className="flex flex-wrap gap-2 mt-2"> {member.permissions.map((perm) => ( <span key={perm} className="bg-primary/20 text-blue-400 rounded px-2 py-1 text-xs"> {perm} </span> ))} </div> </div> </div> ))} </CardContent> </Card> </TabsContent> {/* Contexts */} <TabsContent value="contexts" className="space-y-4 mt-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Shared Contexts</CardTitle> </CardHeader> <CardContent className="space-y-3"> {SHARED_CONTEXTS.map((context) => ( <div key={context.id} className="border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-background transition-colors" onClick={() => setSelectedContext(selectedContext === context.id ? null : context.id)} > <div className="flex justify-between items-start mb-2"> <div className="flex-1"> <h4 className="font-semibold text-foreground">{context.title}</h4> <p className="text-xs text-foreground/60 mt-1">{context.description}</p> </div> <div className="text-right"> <div className="text-lg font-bold text-purple-500">{context.changeCount}</div> <p className="text-xs text-foreground/60">Changes</p> </div> </div> <div className="flex gap-2 mb-3"> {context.teams.map((team) => ( <span key={team} className="bg-cyan-500/20 text-cyan-400 rounded-full px-2 py-1 text-xs"> {team} </span> ))} </div> {selectedContext === context.id && ( <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm"> <p className="text-foreground/80"> <span className="font-semibold">Last Updated:</span> {context.lastUpdated} </p> <Button onClick={() => handleShareContext(context)} className="w-full"> <Share2 className="w-4 h-4 mr-2" /> Share Context </Button> </div> )} </div> ))} </CardContent> </Card> </TabsContent> {/* Permissions */} <TabsContent value="permissions" className="space-y-4 mt-4"> <Card className="bg-background border-white/10"> <CardHeader> <CardTitle>Permission Matrix</CardTitle> </CardHeader> <CardContent> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead> <tr className="border-b border-white/10"> <th className="text-left py-2 px-3 text-foreground/70">Role</th> <th className="text-center py-2 px-3 text-foreground/70">View</th> <th className="text-center py-2 px-3 text-foreground/70">Edit</th> <th className="text-center py-2 px-3 text-foreground/70">Delete</th> <th className="text-center py-2 px-3 text-foreground/70">Share</th> <th className="text-center py-2 px-3 text-foreground/70">Admin</th> </tr> </thead> <tbody> {PERMISSION_MATRIX.map((perm) => ( <tr key={perm.role} className="border-b border-white/10"> <td className="py-3 px-3 font-semibold text-foreground">{perm.role}</td> <td className="text-center py-3 px-3"> {perm.view ? <CheckCircle2 className="w-5 h-5 text-green-500 inline" /> : <Eye className="w-5 h-5 text-muted-foreground inline opacity-30" />} </td> <td className="text-center py-3 px-3"> {perm.edit ? <CheckCircle2 className="w-5 h-5 text-green-500 inline" /> : <Lock className="w-5 h-5 text-muted-foreground inline opacity-30" />} </td> <td className="text-center py-3 px-3"> {perm.delete ? <CheckCircle2 className="w-5 h-5 text-green-500 inline" /> : <Lock className="w-5 h-5 text-muted-foreground inline opacity-30" />} </td> <td className="text-center py-3 px-3"> {perm.share ? <CheckCircle2 className="w-5 h-5 text-green-500 inline" /> : <Lock className="w-5 h-5 text-muted-foreground inline opacity-30" />} </td> <td className="text-center py-3 px-3"> {perm.admin ? <CheckCircle2 className="w-5 h-5 text-green-500 inline" /> : <Lock className="w-5 h-5 text-muted-foreground inline opacity-30" />} </td> </tr> ))} </tbody> </table> </div> </CardContent> </Card> </TabsContent> </Tabs> </div> );
} // Missing import - add to top
const CheckCircle2 = ({ className }: { className: string }) => (
  <div className={className}>✓</div>
);
