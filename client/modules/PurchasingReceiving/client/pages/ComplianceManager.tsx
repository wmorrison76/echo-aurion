import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  Eye,
  FileText,
  Settings,
  Zap,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
interface DataExport {
  id: string;
  userId: string;
  userName: string;
  requestedAt: Date;
  completedAt?: Date;
  status: "pending" | "processing" | "completed" | "failed";
  format: "json" | "csv" | "pdf";
}
interface RetentionPolicy {
  id: string;
  dataType: string;
  retentionDays: number;
  autoDelete: boolean;
  lastExecuted?: Date;
}
interface AuditEntry {
  id: string;
  userId?: string;
  action: string;
  dataType: string;
  timestamp: Date;
} // Mock data
const mockDataExports: DataExport[] = [
  {
    id: "export-1",
    userId: "user-1",
    userName: "John Doe",
    requestedAt: new Date(Date.now() - 3600000),
    completedAt: new Date(Date.now() - 1800000),
    status: "completed",
    format: "json",
  },
  {
    id: "export-2",
    userId: "user-2",
    userName: "Jane Smith",
    requestedAt: new Date(Date.now() - 86400000),
    status: "processing",
    format: "csv",
  },
];
const mockRetentionPolicies: RetentionPolicy[] = [
  {
    id: "policy-1",
    dataType: "Invoices",
    retentionDays: 2555,
    autoDelete: false,
    lastExecuted: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "policy-2",
    dataType: "Audit Logs",
    retentionDays: 365,
    autoDelete: true,
    lastExecuted: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "policy-3",
    dataType: "Session Data",
    retentionDays: 90,
    autoDelete: true,
    lastExecuted: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: "policy-4",
    dataType: "Temporary Files",
    retentionDays: 30,
    autoDelete: true,
    lastExecuted: new Date(),
  },
];
const mockAuditEntries: AuditEntry[] = Array.from({ length: 30 }).map(
  (_, i) => ({
    id: `audit-${i}`,
    userId:
      Math.random() > 0.3
        ? `user-${Math.floor(Math.random() * 10)}`
        : undefined,
    action: [
      "data_access",
      "data_export",
      "data_modification",
      "data_deletion",
    ][Math.floor(Math.random() * 4)],
    dataType: ["invoices", "audit_logs", "personal_info", "session_data"][
      Math.floor(Math.random() * 4)
    ],
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  }),
);
export function ComplianceManagerPage() {
  const [dataExports, setDataExports] = useState<DataExport[]>(mockDataExports);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>(
    mockRetentionPolicies,
  );
  const [auditEntries, setAuditEntries] =
    useState<AuditEntry[]>(mockAuditEntries);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [filterAction, setFilterAction] = useState("all");
  const filteredAuditEntries = useMemo(() => {
    return auditEntries.filter(
      (entry) => filterAction === "all" || entry.action === filterAction,
    );
  }, [auditEntries, filterAction]);
  const completionRate = useMemo(() => {
    const completed = dataExports.filter(
      (e) => e.status === "completed",
    ).length;
    return dataExports.length > 0 ? (completed / dataExports.length) * 100 : 0;
  }, [dataExports]);
  const handleRequestExport = (
    userId: string,
    userName: string,
    format: string,
  ) => {
    const newExport: DataExport = {
      id: `export-${Date.now()}`,
      userId,
      userName,
      requestedAt: new Date(),
      status: "processing",
      format: format as "json" | "csv" | "pdf",
    };
    setDataExports([...dataExports, newExport]);
    setRequestDialogOpen(false);
  };
  const handleDownloadExport = (exportId: string) => {
    const exportData = dataExports.find((e) => e.id === exportId);
    if (!exportData) return; // Simulate download const mockData = { userId: exportData.userId, exportedAt: new Date().toISOString(), dataTypes: ["invoices","purchases","personal_info"], recordCount: Math.floor(Math.random() * 500) + 100, }; const content = JSON.stringify(mockData, null, 2); const blob = new Blob([content], { type:"application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `export-${exportData.userId}-${Date.now()}.json`; link.click(); URL.revokeObjectURL(url); }; const handleDeleteExport = (exportId: string) => { setDataExports(dataExports.filter((e) => e.id !== exportId)); }; const handleUpdatePolicy = ( policyId: string, updates: Partial<RetentionPolicy>, ) => { setRetentionPolicies( retentionPolicies.map((p) => p.id === policyId ? { ...p, ...updates } : p, ), ); }; return ( <AppLayout> <div className="space-y-6 pb-6"> <div> <h1 className="text-3xl font-bold tracking-tight"> Compliance Manager </h1> <p className="text-muted-foreground mt-2"> GDPR compliance, data privacy, retention policies, and audit trails </p> </div> <Alert className="bg-blue-50 border-blue-200"> <Shield className="h-4 w-4 text-primary" /> <AlertDescription className="text-blue-800"> This system complies with GDPR, CCPA, and other data protection regulations. All data handling is logged and auditable. </AlertDescription> </Alert> <Tabs defaultValue="exports" className="space-y-4"> <TabsList> <TabsTrigger value="exports">Data Exports</TabsTrigger> <TabsTrigger value="retention">Retention Policies</TabsTrigger> <TabsTrigger value="audit">Audit Trail</TabsTrigger> <TabsTrigger value="settings">Settings</TabsTrigger> </TabsList> {/* Data Exports Tab */} <TabsContent value="exports" className="space-y-4"> <div className="flex items-center justify-between"> <div> <h2 className="text-2xl font-bold">Data Export Requests</h2> <p className="text-muted-foreground"> Completion rate: {completionRate.toFixed(0)}% </p> </div> <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen} > <DialogTrigger asChild> <Button className="gap-2"> <Download className="w-4 h-4" /> New Export Request </Button> </DialogTrigger> <DialogContent> <DialogHeader> <DialogTitle>Request Data Export</DialogTitle> <DialogDescription> Users can request their data in various formats </DialogDescription> </DialogHeader> <DataExportForm onSubmit={handleRequestExport} onCancel={() => setRequestDialogOpen(false)} /> </DialogContent> </Dialog> </div> <div className="space-y-3"> {dataExports.map((exportData) => ( <Card key={exportData.id}> <CardContent className="pt-6"> <div className="flex items-start justify-between"> <div className="flex-1"> <div className="flex items-center gap-2 mb-2"> <h3 className="font-semibold">{exportData.userName}</h3> <Badge variant={ exportData.status ==="completed" ?"default" : exportData.status ==="failed" ?"destructive" :"secondary" } > {exportData.status ==="completed" && ( <CheckCircle2 className="w-3 h-3 mr-1" /> )} {exportData.status.charAt(0).toUpperCase() + exportData.status.slice(1)} </Badge> </div> <p className="text-sm text-muted-foreground mb-3"> ID: {exportData.userId} • Format:{""} {exportData.format.toUpperCase()} </p> <div className="grid gap-2 grid-cols-2 text-sm"> <div> <p className="text-muted-foreground">Requested</p> <p className="font-medium"> {exportData.requestedAt.toLocaleDateString()} </p> </div> {exportData.completedAt && ( <div> <p className="text-muted-foreground">Completed</p> <p className="font-medium"> {exportData.completedAt.toLocaleDateString()} </p> </div> )} </div> </div> <div className="flex gap-2"> {exportData.status ==="completed" && ( <Button variant="outline" size="sm" onClick={() => handleDownloadExport(exportData.id)} className="gap-2" > <Download className="w-4 h-4" /> Download </Button> )} <Button variant="outline" size="sm" onClick={() => handleDeleteExport(exportData.id)} className="gap-2 text-red-600 hover:text-red-700" > <Trash2 className="w-4 h-4" /> Delete </Button> </div> </div> </CardContent> </Card> ))} </div> </TabsContent> {/* Retention Policies Tab */} <TabsContent value="retention" className="space-y-4"> <Card> <CardHeader> <CardTitle>Data Retention Policies</CardTitle> <CardDescription> Configure how long different data types are retained </CardDescription> </CardHeader> <CardContent className="space-y-4"> {retentionPolicies.map((policy) => ( <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg" > <div className="flex-1"> <h3 className="font-semibold">{policy.dataType}</h3> <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground"> <div className="flex items-center gap-1"> <Clock className="w-4 h-4" /> <span>{policy.retentionDays} days retention</span> </div> <div className="flex items-center gap-1"> <Zap className="w-4 h-4" /> <span> {policy.autoDelete ?"Auto-delete enabled" :"Manual delete"} </span> </div> </div> {policy.lastExecuted && ( <p className="text-xs text-muted-foreground mt-2"> Last cleanup: {policy.lastExecuted.toLocaleDateString()} </p> )} </div> <Button variant="outline" size="sm"> Edit </Button> </div> ))} </CardContent> </Card> <Card> <CardHeader> <CardTitle>Retention Summary</CardTitle> </CardHeader> <CardContent className="space-y-3"> {retentionPolicies.map((policy) => ( <div key={policy.id} className="flex items-center justify-between text-sm" > <span>{policy.dataType}</span> <span className="font-medium"> {policy.retentionDays} days </span> </div> ))} </CardContent> </Card> </TabsContent> {/* Audit Trail Tab */} <TabsContent value="audit" className="space-y-4"> <div className="flex gap-2"> <Select value={filterAction} onValueChange={setFilterAction}> <SelectTrigger className="w-48"> <SelectValue placeholder="Filter by action" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Actions</SelectItem> <SelectItem value="data_access">Data Access</SelectItem> <SelectItem value="data_export">Data Export</SelectItem> <SelectItem value="data_modification"> Data Modification </SelectItem> <SelectItem value="data_deletion">Data Deletion</SelectItem> </SelectContent> </Select> </div> <Card> <CardContent className="pt-6"> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead className="border-b"> <tr> <th className="text-left py-3 px-4 font-medium"> Timestamp </th> <th className="text-left py-3 px-4 font-medium"> User ID </th> <th className="text-left py-3 px-4 font-medium"> Action </th> <th className="text-left py-3 px-4 font-medium"> Data Type </th> </tr> </thead> <tbody> {filteredAuditEntries.map((entry) => ( <tr key={entry.id} className="border-b hover:bg-muted/50 last:border-0" > <td className="py-3 px-4"> {entry.timestamp.toLocaleString()} </td> <td className="py-3 px-4">{entry.userId ||"-"}</td> <td className="py-3 px-4"> <Badge variant="secondary" className="capitalize"> {entry.action.replace(/_/g,"")} </Badge> </td> <td className="py-3 px-4 capitalize"> {entry.dataType} </td> </tr> ))} </tbody> </table> </div> <div className="mt-4 text-sm text-muted-foreground"> Showing {filteredAuditEntries.length} of {auditEntries.length}{""} entries </div> </CardContent> </Card> </TabsContent> {/* Settings Tab */} <TabsContent value="settings" className="space-y-4"> <Card> <CardHeader> <CardTitle>Privacy Settings</CardTitle> <CardDescription> Configure privacy and compliance settings </CardDescription> </CardHeader> <CardContent className="space-y-4"> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <Shield className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">Encryption at Rest</p> <p className="text-sm text-muted-foreground"> All data encrypted with AES-256 </p> </div> </div> <Badge variant="default">Enabled</Badge> </div> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <Lock className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">Encryption in Transit</p> <p className="text-sm text-muted-foreground"> TLS 1.3 for all connections </p> </div> </div> <Badge variant="default">Enabled</Badge> </div> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <Eye className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">Audit Logging</p> <p className="text-sm text-muted-foreground"> All data access logged and monitored </p> </div> </div> <Badge variant="default">Enabled</Badge> </div> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <FileText className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">Right to Access</p> <p className="text-sm text-muted-foreground"> Users can download their data anytime </p> </div> </div> <Badge variant="default">Enabled</Badge> </div> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <Trash2 className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">Right to be Forgotten</p> <p className="text-sm text-muted-foreground"> Users can request data deletion </p> </div> </div> <Badge variant="default">Enabled</Badge> </div> </CardContent> </Card> <Card> <CardHeader> <CardTitle>Compliance Documentation</CardTitle> <CardDescription> Download compliance reports and documentation </CardDescription> </CardHeader> <CardContent className="space-y-2"> <Button variant="outline" className="w-full justify-start gap-2"> <Download className="w-4 h-4" /> Data Protection Impact Assessment (DPIA) </Button> <Button variant="outline" className="w-full justify-start gap-2"> <Download className="w-4 h-4" /> Privacy Policy </Button> <Button variant="outline" className="w-full justify-start gap-2"> <Download className="w-4 h-4" /> Data Processing Agreement (DPA) </Button> <Button variant="outline" className="w-full justify-start gap-2"> <Download className="w-4 h-4" /> Audit Trail Report (Last 90 Days) </Button> </CardContent> </Card> </TabsContent> </Tabs> </div> </AppLayout> );
  };
}
function DataExportForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (userId: string, userName: string, format: string) => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [format, setFormat] = useState("json");
  return (
    <div className="space-y-4 py-4">
      {" "}
      <div>
        {" "}
        <Label htmlFor="user-id">User ID</Label>{" "}
        <input
          id="user-id"
          className="w-full px-3 py-2 border rounded-md bg-background mt-1"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="user-123"
        />{" "}
      </div>{" "}
      <div>
        {" "}
        <Label htmlFor="user-name">User Name</Label>{" "}
        <input
          id="user-name"
          className="w-full px-3 py-2 border rounded-md bg-background mt-1"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="John Doe"
        />{" "}
      </div>{" "}
      <div>
        {" "}
        <Label htmlFor="format">Format</Label>{" "}
        <Select value={format} onValueChange={setFormat}>
          {" "}
          <SelectTrigger className="mt-1">
            {" "}
            <SelectValue />{" "}
          </SelectTrigger>{" "}
          <SelectContent>
            {" "}
            <SelectItem value="json">JSON</SelectItem>{" "}
            <SelectItem value="csv">CSV</SelectItem>{" "}
            <SelectItem value="pdf">PDF</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
      </div>{" "}
      <div className="flex gap-2 justify-end pt-4">
        {" "}
        <Button variant="outline" onClick={onCancel}>
          {" "}
          Cancel{" "}
        </Button>{" "}
        <Button
          onClick={() => onSubmit(userId, userName, format)}
          disabled={!userId || !userName}
        >
          {" "}
          Request Export{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
export default ComplianceManagerPage;
