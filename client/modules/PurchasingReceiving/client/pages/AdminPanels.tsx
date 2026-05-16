import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Settings,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Shield,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "receiver" | "chef" | "finance";
  outletId?: string;
  active: boolean;
  createdAt: Date;
  lastLogin?: Date;
}
interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  status: "success" | "failed";
} // Mock data
const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    name: "Jane Admin",
    role: "admin",
    active: true,
    createdAt: new Date("2024-01-01"),
    lastLogin: new Date(),
  },
  {
    id: "2",
    email: "manager1@example.com",
    name: "John Manager",
    role: "manager",
    outletId: "outlet-1",
    active: true,
    createdAt: new Date("2024-02-15"),
    lastLogin: new Date(Date.now() - 3600000),
  },
  {
    id: "3",
    email: "receiver@example.com",
    name: "Bob Receiver",
    role: "receiver",
    outletId: "outlet-1",
    active: true,
    createdAt: new Date("2024-03-10"),
    lastLogin: new Date(Date.now() - 86400000),
  },
];
const mockAuditLogs: AuditLog[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `log-${i}`,
  userId: mockUsers[Math.floor(Math.random() * mockUsers.length)].id,
  userName: mockUsers[Math.floor(Math.random() * mockUsers.length)].name,
  action: ["login", "logout", "create", "update", "delete", "export"][
    Math.floor(Math.random() * 6)
  ],
  resource: ["user", "invoice", "purchase_order", "inventory", "settings"][
    Math.floor(Math.random() * 5)
  ],
  resourceId: `res-${Math.floor(Math.random() * 1000)}`,
  timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  ipAddress: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
  status: Math.random() > 0.1 ? "success" : "failed",
}));
export function AdminPanels() {
  const { organization } = useMultiOutlet();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Filter audit logs const filteredLogs = useMemo(() => { return auditLogs.filter((log) => { const actionMatch = filterAction ==="all" || log.action === filterAction; const statusMatch = filterStatus ==="all" || log.status === filterStatus; return actionMatch && statusMatch; }); }, [auditLogs, filterAction, filterStatus]); const handleAddUser = (newUser: Partial<User>) => { const user: User = { id: `user-${Date.now()}`, email: newUser.email ||"", name: newUser.name ||"", role: newUser.role ||"receiver", outletId: newUser.outletId, active: true, createdAt: new Date(), }; setUsers([...users, user]); setNewUserDialogOpen(false); }; const handleUpdateUser = (updatedUser: User) => { setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u))); setEditDialogOpen(false); setSelectedUser(null); }; const handleDeleteUser = (userId: string) => { setUsers(users.filter((u) => u.id !== userId)); setDeleteDialogOpen(false); setSelectedUser(null); }; const roleDescriptions: Record<string, string> = { admin:"Full access to all organization features and settings", manager:"Manage outlet operations, view analytics", receiver:"Receive and process incoming inventory", chef:"View menu items and recipe costing", finance:"View financial reports and invoicing", }; return ( <AppLayout> <div className="space-y-6 pb-6"> <div> <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1> <p className="text-muted-foreground mt-2"> Manage users, organization settings, and view audit logs </p> </div> <Tabs defaultValue="users" className="space-y-4"> <TabsList> <TabsTrigger value="users">User Management</TabsTrigger> <TabsTrigger value="settings">Organization Settings</TabsTrigger> <TabsTrigger value="audit">Audit Logs</TabsTrigger> </TabsList> {/* User Management Tab */} <TabsContent value="users" className="space-y-4"> <div className="flex justify-between items-center"> <div> <h2 className="text-2xl font-bold">Users</h2> <p className="text-muted-foreground"> Manage user accounts and permissions </p> </div> <Dialog open={newUserDialogOpen} onOpenChange={setNewUserDialogOpen} > <DialogTrigger asChild> <Button> <Plus className="w-4 h-4 mr-2" /> Add User </Button> </DialogTrigger> <DialogContent> <DialogHeader> <DialogTitle>Add New User</DialogTitle> <DialogDescription> Create a new user account </DialogDescription> </DialogHeader> <NewUserForm onSubmit={handleAddUser} onCancel={() => setNewUserDialogOpen(false)} /> </DialogContent> </Dialog> </div> <div className="grid gap-4 grid-cols-1"> {users.map((user) => ( <Card key={user.id}> <CardContent className="pt-6"> <div className="flex items-start justify-between gap-4"> <div className="flex-1"> <div className="flex items-center gap-2 mb-2"> <h3 className="font-semibold text-lg">{user.name}</h3> <Badge variant={user.active ?"default" :"secondary"} className="capitalize" > {user.active ?"Active" :"Inactive"} </Badge> <Badge variant="secondary" className="capitalize"> {user.role} </Badge> </div> <p className="text-sm text-muted-foreground mb-3"> {user.email} </p> <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 text-sm"> <div> <p className="text-muted-foreground">Created</p> <p className="font-medium"> {user.createdAt.toLocaleDateString()} </p> </div> {user.lastLogin && ( <div> <p className="text-muted-foreground">Last Login</p> <p className="font-medium"> {user.lastLogin.toLocaleDateString()} </p> </div> )} {user.outletId && ( <div> <p className="text-muted-foreground">Outlet</p> <p className="font-medium">{user.outletId}</p> </div> )} </div> <p className="text-xs text-muted-foreground mt-3"> {roleDescriptions[user.role]} </p> </div> <div className="flex gap-2"> <Dialog open={editDialogOpen && selectedUser?.id === user.id} > <DialogTrigger asChild> <Button variant="outline" size="icon" onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }} > <Edit2 className="w-4 h-4" /> </Button> </DialogTrigger> <DialogContent> <DialogHeader> <DialogTitle>Edit User</DialogTitle> <DialogDescription> Update user account details </DialogDescription> </DialogHeader> {selectedUser && ( <EditUserForm user={selectedUser} onSubmit={handleUpdateUser} onCancel={() => { setEditDialogOpen(false); setSelectedUser(null); }} /> )} </DialogContent> </Dialog> <AlertDialog open={deleteDialogOpen && selectedUser?.id === user.id} > <Button variant="outline" size="icon" onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }} > <Trash2 className="w-4 h-4" /> </Button> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Delete User</AlertDialogTitle> <AlertDialogDescription> Are you sure you want to delete {user.name}? This action cannot be undone. </AlertDialogDescription> </AlertDialogHeader> <div className="flex gap-4 justify-end"> <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setSelectedUser(null); }} > Cancel </AlertDialogCancel> <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700" > Delete </AlertDialogAction> </div> </AlertDialogContent> </AlertDialog> </div> </div> </CardContent> </Card> ))} </div> <Card> <CardHeader> <CardTitle className="text-lg">Role Definitions</CardTitle> </CardHeader> <CardContent className="space-y-4"> {Object.entries(roleDescriptions).map(([role, description]) => ( <div key={role} className="flex items-start gap-3 pb-3 border-b last:pb-0 last:border-0" > <div className="pt-1"> <Badge variant="secondary" className="capitalize"> {role} </Badge> </div> <p className="text-sm text-muted-foreground">{description}</p> </div> ))} </CardContent> </Card> </TabsContent> {/* Organization Settings Tab */} <TabsContent value="settings" className="space-y-4"> <Card> <CardHeader> <CardTitle>Organization Information</CardTitle> <CardDescription> Basic information about your organization </CardDescription> </CardHeader> <CardContent className="space-y-6"> <div className="grid gap-6"> <div> <Label className="text-base font-semibold"> Organization Name </Label> <p className="text-lg font-bold mt-2">{organization?.name}</p> </div> <div> <Label className="text-base font-semibold">Tier</Label> <Badge className="mt-2 capitalize" variant="secondary"> {organization?.tier} </Badge> </div> <div> <Label className="text-base font-semibold"> Total Outlets </Label> <p className="text-lg font-bold mt-2"> {organization?.outlets} </p> </div> <div> <Label className="text-base font-semibold">Created</Label> <p className="text-lg font-bold mt-2"> {organization?.createdAt && new Date(organization.createdAt).toLocaleDateString()} </p> </div> </div> </CardContent> </Card> <Card> <CardHeader> <CardTitle>Features & Permissions</CardTitle> <CardDescription> Enabled features for this organization </CardDescription> </CardHeader> <CardContent> <div className="grid gap-3"> {organization?.features.map((feature) => ( <div key={feature} className="flex items-center gap-2 p-3 rounded-lg border" > <CheckCircle2 className="w-5 h-5 text-green-600" /> <span className="capitalize font-medium">{feature}</span> </div> ))} </div> </CardContent> </Card> <Card> <CardHeader> <CardTitle>Security Settings</CardTitle> <CardDescription> Configure security policies for your organization </CardDescription> </CardHeader> <CardContent className="space-y-4"> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <Lock className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">Two-Factor Authentication</p> <p className="text-sm text-muted-foreground"> Require 2FA for all users </p> </div> </div> <Button variant="outline" size="sm"> Configure </Button> </div> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <Shield className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">IP Whitelisting</p> <p className="text-sm text-muted-foreground"> Restrict access by IP address </p> </div> </div> <Button variant="outline" size="sm"> Configure </Button> </div> <div className="flex items-center justify-between p-4 border rounded-lg"> <div className="flex items-center gap-3"> <Activity className="w-5 h-5 text-muted-foreground" /> <div> <p className="font-medium">Session Timeout</p> <p className="text-sm text-muted-foreground"> 30 minutes of inactivity </p> </div> </div> <Button variant="outline" size="sm"> Configure </Button> </div> </CardContent> </Card> </TabsContent> {/* Audit Logs Tab */} <TabsContent value="audit" className="space-y-4"> <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-2"> <div className="flex-1"> <h2 className="text-2xl font-bold">Audit Logs</h2> <p className="text-muted-foreground"> Track all actions performed in your organization </p> </div> <div className="flex gap-2"> <Select value={filterAction} onValueChange={setFilterAction}> <SelectTrigger className="w-40"> <SelectValue placeholder="Filter by action" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Actions</SelectItem> <SelectItem value="login">Login</SelectItem> <SelectItem value="logout">Logout</SelectItem> <SelectItem value="create">Create</SelectItem> <SelectItem value="update">Update</SelectItem> <SelectItem value="delete">Delete</SelectItem> <SelectItem value="export">Export</SelectItem> </SelectContent> </Select> <Select value={filterStatus} onValueChange={setFilterStatus}> <SelectTrigger className="w-40"> <SelectValue placeholder="Filter by status" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Status</SelectItem> <SelectItem value="success">Success</SelectItem> <SelectItem value="failed">Failed</SelectItem> </SelectContent> </Select> </div> </div> <Card> <CardContent className="pt-6"> <div className="overflow-x-auto"> <table className="w-full text-sm"> <thead className="border-b"> <tr> <th className="text-left py-3 px-4 font-medium"> Timestamp </th> <th className="text-left py-3 px-4 font-medium">User</th> <th className="text-left py-3 px-4 font-medium"> Action </th> <th className="text-left py-3 px-4 font-medium"> Resource </th> <th className="text-left py-3 px-4 font-medium"> IP Address </th> <th className="text-center py-3 px-4 font-medium"> Status </th> </tr> </thead> <tbody> {filteredLogs.map((log) => ( <tr key={log.id} className="border-b hover:bg-muted/50 last:border-0" > <td className="py-3 px-4"> <div className="flex items-center gap-2"> <Clock className="w-4 h-4 text-muted-foreground" /> {log.timestamp.toLocaleString()} </div> </td> <td className="py-3 px-4">{log.userName}</td> <td className="py-3 px-4"> <Badge variant="secondary" className="capitalize"> {log.action} </Badge> </td> <td className="py-3 px-4"> <div> <p className="capitalize font-medium"> {log.resource} </p> <p className="text-xs text-muted-foreground"> {log.resourceId} </p> </div> </td> <td className="py-3 px-4 font-mono text-xs"> {log.ipAddress} </td> <td className="py-3 px-4 text-center"> {log.status ==="success" ? ( <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /> ) : ( <AlertCircle className="w-4 h-4 text-red-600 mx-auto" /> )} </td> </tr> ))} </tbody> </table> </div> <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"> <p> Showing {filteredLogs.length} of {auditLogs.length} logs </p> <Button variant="outline" size="sm"> Load More </Button> </div> </CardContent> </Card> </TabsContent> </Tabs> </div> </AppLayout> );
} // User form components
function NewUserForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (user: Partial<User>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "receiver" as const,
    outletId: "",
  });
  return (
    <div className="space-y-4 py-4">
      {" "}
      <div>
        {" "}
        <Label htmlFor="name">Name</Label>{" "}
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
        />{" "}
      </div>{" "}
      <div>
        {" "}
        <Label htmlFor="email">Email</Label>{" "}
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@example.com"
        />{" "}
      </div>{" "}
      <div>
        {" "}
        <Label htmlFor="role">Role</Label>{" "}
        <Select
          value={formData.role}
          onValueChange={(role: any) => setFormData({ ...formData, role })}
        >
          {" "}
          <SelectTrigger>
            {" "}
            <SelectValue />{" "}
          </SelectTrigger>{" "}
          <SelectContent>
            {" "}
            <SelectItem value="admin">Admin</SelectItem>{" "}
            <SelectItem value="manager">Manager</SelectItem>{" "}
            <SelectItem value="receiver">Receiver</SelectItem>{" "}
            <SelectItem value="chef">Chef</SelectItem>{" "}
            <SelectItem value="finance">Finance</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
      </div>{" "}
      <div className="flex gap-2 justify-end pt-4">
        {" "}
        <Button variant="outline" onClick={onCancel}>
          {" "}
          Cancel{" "}
        </Button>{" "}
        <Button onClick={() => onSubmit(formData)}>Create User</Button>{" "}
      </div>{" "}
    </div>
  );
}
function EditUserForm({
  user,
  onSubmit,
  onCancel,
}: {
  user: User;
  onSubmit: (user: User) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(user);
  return (
    <div className="space-y-4 py-4">
      {" "}
      <div>
        {" "}
        <Label htmlFor="name">Name</Label>{" "}
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />{" "}
      </div>{" "}
      <div>
        {" "}
        <Label htmlFor="email">Email</Label>{" "}
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />{" "}
      </div>{" "}
      <div>
        {" "}
        <Label htmlFor="role">Role</Label>{" "}
        <Select
          value={formData.role}
          onValueChange={(role: any) => setFormData({ ...formData, role })}
        >
          {" "}
          <SelectTrigger>
            {" "}
            <SelectValue />{" "}
          </SelectTrigger>{" "}
          <SelectContent>
            {" "}
            <SelectItem value="admin">Admin</SelectItem>{" "}
            <SelectItem value="manager">Manager</SelectItem>{" "}
            <SelectItem value="receiver">Receiver</SelectItem>{" "}
            <SelectItem value="chef">Chef</SelectItem>{" "}
            <SelectItem value="finance">Finance</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
      </div>{" "}
      <div className="flex gap-2 justify-end pt-4">
        {" "}
        <Button variant="outline" onClick={onCancel}>
          {" "}
          Cancel{" "}
        </Button>{" "}
        <Button onClick={() => onSubmit(formData)}>Save Changes</Button>{" "}
      </div>{" "}
    </div>
  );
}
export default AdminPanels;
