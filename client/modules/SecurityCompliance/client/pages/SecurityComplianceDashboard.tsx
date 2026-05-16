import React from "react";
import { format, parseISO } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Download,
  Eye,
  FileText,
  Globe,
  Lock,
  RefreshCw,
  Search,
  UserCheck,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface SecurityCompliancePanelProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: "success" | "failed" | "denied";
}

interface DataSubject {
  id: string;
  email: string;
  name: string;
  dataType: string;
  requestType: "access" | "deletion" | "portability";
  status: "pending" | "processing" | "completed";
  requestedAt: string;
}

function generateMockRoles(): Role[] {
  return [
    {
      id: "role-1",
      name: "Super Admin",
      description: "Full system access",
      permissions: ["*"],
      userCount: 2,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "role-2",
      name: "Event Manager",
      description: "Manage events and BEOs",
      permissions: ["events:*", "beo:*"],
      userCount: 15,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "role-3",
      name: "Chef",
      description: "Kitchen and recipe management",
      permissions: ["recipes:*", "inventory:read"],
      userCount: 25,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "role-4",
      name: "Sales Rep",
      description: "CRM and client management",
      permissions: ["crm:*", "clients:*"],
      userCount: 10,
      createdAt: "2024-01-01T00:00:00Z",
    },
  ];
}

function generateMockAuditLogs(): AuditLog[] {
  const actions = [
    "login",
    "logout",
    "create",
    "update",
    "delete",
    "export",
    "view",
  ];
  const resources = ["BEO", "Event", "Client", "Recipe", "Order", "Report"];
  const users = [
    "admin@example.com",
    "chef@example.com",
    "manager@example.com",
  ];

  return Array.from({ length: 50 }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(Date.now() - i * 60_000).toISOString(),
    user: users[i % users.length],
    action: actions[i % actions.length],
    resource: resources[i % resources.length],
    ipAddress: `192.168.1.${100 + (i % 50)}`,
    status: i % 10 === 0 ? "failed" : i % 20 === 0 ? "denied" : "success",
  }));
}

function generateMockDataSubjects(): DataSubject[] {
  return [
    {
      id: "subject-1",
      email: "user@example.com",
      name: "John Doe",
      dataType: "Client Data",
      requestType: "access",
      status: "completed",
      requestedAt: "2024-01-15T00:00:00Z",
    },
    {
      id: "subject-2",
      email: "user2@example.com",
      name: "Jane Smith",
      dataType: "Event Data",
      requestType: "deletion",
      status: "processing",
      requestedAt: "2024-01-20T00:00:00Z",
    },
  ];
}

function statusVariant(
  status: AuditLog["status"],
): "default" | "secondary" | "destructive" {
  if (status === "success") return "default";
  return "destructive";
}

export default function SecurityComplianceDashboard(
  _props: SecurityCompliancePanelProps,
) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<
    "roles" | "audit" | "gdpr" | "settings"
  >("roles");
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [dataSubjects, setDataSubjects] = React.useState<DataSubject[]>([]);

  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const [encryptionEnabled, setEncryptionEnabled] = React.useState(true);
  const [auditLoggingEnabled, setAuditLoggingEnabled] = React.useState(true);
  const [gdprEnabled, setGdprEnabled] = React.useState(true);

  const loadData = React.useCallback(() => {
    setRoles(generateMockRoles());
    setAuditLogs(generateMockAuditLogs());
    setDataSubjects(generateMockDataSubjects());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAuditLogs = React.useMemo(() => {
    let filtered = auditLogs;
    if (filterStatus !== "all")
      filtered = filtered.filter((log) => log.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.user.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.resource.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [auditLogs, filterStatus, searchQuery]);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="border-b border-border/30 p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Security & Compliance
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              RBAC, audit trails, and GDPR compliance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast({
                  title: "Export queued",
                  description: "Audit export started (mock)",
                })
              }
            >
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Roles</p>
                  <p className="text-2xl font-bold">{roles.length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Audit Logs
                  </p>
                  <p className="text-2xl font-bold">{auditLogs.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    GDPR Requests
                  </p>
                  <p className="text-2xl font-bold">{dataSubjects.length}</p>
                </div>
                <Globe className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Encryption
                  </p>
                  <p className="text-2xl font-bold">
                    {encryptionEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <Lock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="h-full flex flex-col"
        >
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="gdpr">GDPR Compliance</TabsTrigger>
            <TabsTrigger value="settings">Security Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  Manage user roles and their permission sets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          {role.name}
                        </TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {role.permissions[0] === "*"
                              ? "All"
                              : `${role.permissions.length} perms`}
                          </Badge>
                        </TableCell>
                        <TableCell>{role.userCount}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              toast({
                                title: "Role details",
                                description: role.name,
                              })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>
                      Complete log of key system actions
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8 w-64"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(parseISO(log.timestamp), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.user}
                          </TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.resource}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.ipAddress}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(log.status)}>
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gdpr" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>GDPR Requests</CardTitle>
                <CardDescription>Track data subject requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Request</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataSubjects.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {s.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {s.requestType}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.dataType}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              s.status === "completed"
                                ? "default"
                                : s.status === "processing"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(s.requestedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              toast({
                                title: "Request opened",
                                description: s.id,
                              })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure baseline security toggles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label
                      htmlFor="encryption"
                      className="font-medium cursor-pointer"
                    >
                      Data Encryption
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Encrypt data at rest and in transit
                    </p>
                  </div>
                  <Switch
                    id="encryption"
                    checked={encryptionEnabled}
                    onCheckedChange={setEncryptionEnabled}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label
                      htmlFor="audit"
                      className="font-medium cursor-pointer"
                    >
                      Audit Logging
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Log system actions for compliance
                    </p>
                  </div>
                  <Switch
                    id="audit"
                    checked={auditLoggingEnabled}
                    onCheckedChange={setAuditLoggingEnabled}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label
                      htmlFor="gdpr"
                      className="font-medium cursor-pointer"
                    >
                      GDPR Compliance
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable GDPR request handling
                    </p>
                  </div>
                  <Switch
                    id="gdpr"
                    checked={gdprEnabled}
                    onCheckedChange={setGdprEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
