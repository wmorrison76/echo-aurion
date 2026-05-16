import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { AlertCircle, Download, Filter } from "lucide-react";
interface AuditLog {
  id: string;
  client_id?: string;
  user_id?: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  is_adult_content: boolean;
  content_warning_acknowledged: boolean;
  status: string;
  reason?: string;
  created_at: string;
  metadata?: Record<string, any>;
}
interface ComplianceStats {
  adultContentRequests: number;
  consentsGiven: number;
  totalGenerations: number;
}
export default function ComplianceReportDashboard() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<ComplianceStats>({
    adultContentRequests: 0,
    consentsGiven: 0,
    totalGenerations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all"); // all, adult, standard const [searchClient, setSearchClient] = useState(""); const [dateRange, setDateRange] = useState("7days"); // 7days, 30days, 90days, all useEffect(() => { loadData(); }, [filterType, searchClient, dateRange]); const loadData = async () => { setLoading(true); try { // Load audit logs const logsRes = await fetch( `/api/compliance/audit-logs?limit=100&offset=0${ filterType ==="adult" ?"&isAdultContent=true" :"" }`, ); const logsData = await logsRes.json(); setAuditLogs(logsData.auditLogs || []); // Load statistics const statsRes = await fetch("/api/compliance/statistics"); const statsData = await statsRes.json(); setStats(statsData); } catch (error) { console.error("Error loading compliance data:", error); } finally { setLoading(false); } }; const filteredLogs = auditLogs.filter((log) => { if (searchClient && !log.metadata?.prompt?.includes(searchClient)) { return false; } return true; }); const dateFilteredLogs = filteredLogs.filter((log) => { const logDate = new Date(log.created_at); const now = new Date(); const daysAgo = {"7days": 7,"30days": 30,"90days": 90, all: Infinity, }[dateRange]; const daysDiff = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24); return daysDiff <= daysAgo; }); const downloadReport = () => { const csv = [ ["Date","Action","Client","Status","Adult Content","Acknowledged"].join(","), ...dateFilteredLogs.map((log) => [ log.created_at, log.action_type, log.metadata?.clientName ||"N/A", log.status, log.is_adult_content ?"Yes" :"No", log.content_warning_acknowledged ?"Yes" :"No", ].join(","), ), ].join("\n"); const blob = new Blob([csv], { type:"text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `compliance-report-${Date.now()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }; const getActionColor = (actionType: string): string => { if (actionType.includes("adult")) return"text-orange-600"; if (actionType.includes("denied")) return"text-red-600"; if (actionType.includes("consent")) return"text-green-600"; return"text-primary"; }; const getStatusColor = (status: string): string => { switch (status) { case"success": return"bg-green-50 text-green-800"; case"denied": return"bg-red-50 text-red-800"; case"pending_consent": return"bg-yellow-50 text-yellow-800"; default: return"bg-surface text-gray-800"; } }; return ( <div className="space-y-6"> <div className="flex justify-between items-center"> <h2 className="text-2xl font-bold">📋 Compliance Dashboard</h2> <Button onClick={downloadReport} size="sm" className="gap-2"> <Download className="w-4 h-4" /> Export Report </Button> </div> {/* Key Statistics */} <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <Card> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium text-muted-foreground"> Total Image Generations </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold">{stats.totalGenerations}</div> </CardContent> </Card> <Card className="border-orange-200"> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium text-orange-600"> Adult Content Requests </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold text-orange-600"> {stats.adultContentRequests} </div> <p className="text-xs text-muted-foreground mt-2"> {((stats.adultContentRequests / stats.totalGenerations) * 100).toFixed(1)}% of total </p> </CardContent> </Card> <Card className="border-green-200"> <CardHeader className="pb-3"> <CardTitle className="text-sm font-medium text-green-600"> Consents Signed </CardTitle> </CardHeader> <CardContent> <div className="text-3xl font-bold text-green-600">{stats.consentsGiven}</div> </CardContent> </Card> </div> {/* Filters */} <Card> <CardHeader> <CardTitle className="text-lg flex items-center gap-2"> <Filter className="w-5 h-5" /> Filters </CardTitle> </CardHeader> <CardContent className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div> <label className="text-sm font-medium text-foreground block mb-2"> Content Type </label> <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full border border-border rounded-lg p-2.5" > <option value="all">All Content</option> <option value="adult">Adult Content Only</option> <option value="standard">Standard Content Only</option> </select> </div> <div> <label className="text-sm font-medium text-foreground block mb-2"> Date Range </label> <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full border border-border rounded-lg p-2.5" > <option value="7days">Last 7 Days</option> <option value="30days">Last 30 Days</option> <option value="90days">Last 90 Days</option> <option value="all">All Time</option> </select> </div> <div> <label className="text-sm font-medium text-foreground block mb-2"> Search Client </label> <Input placeholder="Search by prompt..." value={searchClient} onChange={(e) => setSearchClient(e.target.value)} /> </div> </div> </CardContent> </Card> {/* Audit Logs Table */} <Card> <CardHeader> <CardTitle>Audit Log ({dateFilteredLogs.length} records)</CardTitle> </CardHeader> <CardContent> {loading ? ( <div className="text-center py-8 text-muted-foreground">Loading...</div> ) : dateFilteredLogs.length === 0 ? ( <div className="text-center py-8 text-muted-foreground">No logs found</div> ) : ( <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead className="border-b-2"> <tr> <th className="text-left py-2 px-3">Date</th> <th className="text-left py-2 px-3">Action</th> <th className="text-left py-2 px-3">Status</th> <th className="text-left py-2 px-3">Content Type</th> <th className="text-left py-2 px-3">Acknowledged</th> </tr> </thead> <tbody> {dateFilteredLogs.slice(0, 20).map((log) => ( <tr key={log.id} className="border-b hover:bg-surface"> <td className="py-3 px-3 text-xs text-muted-foreground"> {new Date(log.created_at).toLocaleString()} </td> <td className={`py-3 px-3 font-semibold ${getActionColor(log.action_type)}`}> {log.action_type.replace(/_/g,"")} </td> <td className="py-3 px-3"> <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status)}`}> {log.status} </span> </td> <td className="py-3 px-3"> {log.is_adult_content ? ( <span className="flex items-center gap-1"> <AlertCircle className="w-4 h-4 text-orange-600" /> <span className="text-orange-600 font-semibold">Adult</span> </span> ) : ( <span className="text-muted-foreground">Standard</span> )} </td> <td className="py-3 px-3"> {log.content_warning_acknowledged ? ( <span className="text-green-600">✓ Yes</span> ) : ( <span className="text-gray-400">—</span> )} </td> </tr> ))} </tbody> </table> {dateFilteredLogs.length > 20 && ( <p className="text-xs text-muted-foreground mt-4 text-center"> Showing 20 of {dateFilteredLogs.length} records. Export to see all. </p> )} </div> )} </CardContent> </Card> </div> );
}
