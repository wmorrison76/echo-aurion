import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Settings,
  Shield,
  UserPlus,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'chef' | 'server' | 'coordinator';
  department: 'culinary' | 'pastry' | 'events' | 'management' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
}

const roles = [
  { value: 'admin', label: 'Administrator', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'Team and event management' },
  { value: 'chef', label: 'Chef', description: 'Culinary operations' },
  { value: 'server', label: 'Server', description: 'Event service' },
  { value: 'coordinator', label: 'Event Coordinator', description: 'Event planning and coordination' },
];

const departments = [
  { value: 'admin', label: 'Administration' },
  { value: 'management', label: 'Management' },
  { value: 'culinary', label: 'Culinary' },
  { value: 'pastry', label: 'Pastry' },
  { value: 'events', label: 'Events & Catering' },
];

const permissions = [
  'view_dashboard',
  'manage_events',
  'manage_contacts',
  'view_analytics',
  'manage_beo_reo',
  'admin_settings',
  'user_management',
  'financial_reports',
  'calendar_management',
  'system_backup'
];

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'William Morrison',
      email: 'william@hospitalitycrm.com',
      role: 'admin',
      department: 'admin',
      status: 'active',
      lastLogin: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      permissions: ['view_dashboard', 'manage_events', 'manage_contacts', 'view_analytics', 'manage_beo_reo', 'admin_settings', 'user_management', 'financial_reports', 'calendar_management', 'system_backup']
    }
  ]);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'server',
    department: 'events',
    status: 'pending',
    permissions: ['view_dashboard']
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const createUser = () => {
    const user: User = {
      id: Date.now().toString(),
      name: newUser.name || '',
      email: newUser.email || '',
      role: newUser.role as User['role'] || 'server',
      department: newUser.department as User['department'] || 'events',
      status: 'pending',
      lastLogin: 'Never',
      createdAt: new Date().toISOString(),
      permissions: newUser.permissions || ['view_dashboard']
    };
    
    setUsers([...users, user]);
    setNewUser({
      name: '',
      email: '',
      role: 'server',
      department: 'events',
      status: 'pending',
      permissions: ['view_dashboard']
    });
    setIsCreateDialogOpen(false);
  };

  const updateUser = () => {
    if (!selectedUser) return;
    
    setUsers(users.map(user => 
      user.id === selectedUser.id ? selectedUser : user
    ));
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const resetSystemData = () => {
    // Reset to clean state - keep admin user only
    setUsers([users[0]]); // Keep William Morrison as admin
    // TODO: Add API calls to reset other data tables
    console.log('System data reset to clean state');
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-700 dark:text-red-300';
      case 'manager': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'chef': return 'bg-orange-500/20 text-orange-700 dark:text-orange-300';
      case 'coordinator': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, permissions, and system settings</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="apple-button bg-primary hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-panel">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="backup">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Filters and Search */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="apple-button"
                  />
                </div>
                <div>
                  <Label htmlFor="role-filter">Filter by Role</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="apple-button">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-filter">Filter by Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="apple-button">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterRole('all');
                      setFilterStatus('all');
                    }}
                    className="apple-button"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg glass-panel hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={`/placeholder.svg`} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{user.name}</h3>
                          <div className={cn("w-2 h-2 rounded-full", getStatusColor(user.status))} />
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn("text-xs", getRoleColor(user.role))}>
                            {roles.find(r => r.value === user.role)?.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {departments.find(d => d.value === user.department)?.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditDialogOpen(true);
                        }}
                        className="apple-button"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.id !== '1' && ( // Prevent deleting admin
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="apple-button text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-panel">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="apple-button">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteUser(user.id)}
                                className="apple-button bg-red-500 hover:bg-red-600 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Security Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Two-Factor Authentication</span>
                      <Badge className="bg-green-500/20 text-green-700">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Session Timeout</span>
                      <span className="text-sm text-muted-foreground">30 minutes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Password Policy</span>
                      <Badge className="bg-blue-500/20 text-blue-700">Strong</Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">System Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database Status</span>
                      <Badge className="bg-green-500/20 text-green-700">Online</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Status</span>
                      <Badge className="bg-green-500/20 text-green-700">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Backup</span>
                      <span className="text-sm text-muted-foreground">2 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Backup, restore, and reset system data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Backup & Restore</h4>
                  <div className="space-y-3">
                    <Button className="w-full apple-button">
                      <Download className="h-4 w-4 mr-2" />
                      Export System Backup
                    </Button>
                    <Button variant="outline" className="w-full apple-button">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Backup
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-red-600">Danger Zone</h4>
                  <div className="space-y-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full apple-button">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Reset System Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-panel">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-600">Reset System Data</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all customer data, events, and BEO/REOs. 
                            Only user accounts will be preserved. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="apple-button">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={resetSystemData}
                            className="apple-button bg-red-500 hover:bg-red-600 text-white"
                          >
                            Reset Data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with appropriate permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                className="apple-button"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="apple-button"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(value) => setNewUser({...newUser, role: value as User['role']})}
              >
                <SelectTrigger className="apple-button">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={newUser.department} 
                onValueChange={(value) => setNewUser({...newUser, department: value as User['department']})}
              >
                <SelectTrigger className="apple-button">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  {departments.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="apple-button">
              Cancel
            </Button>
            <Button onClick={createUser} className="apple-button bg-primary hover:bg-primary/90">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                  className="apple-button"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                  className="apple-button"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={selectedUser.role} 
                  onValueChange={(value) => setSelectedUser({...selectedUser, role: value as User['role']})}
                >
                  <SelectTrigger className="apple-button">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={selectedUser.status} 
                  onValueChange={(value) => setSelectedUser({...selectedUser, status: value as User['status']})}
                >
                  <SelectTrigger className="apple-button">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="apple-button">
              Cancel
            </Button>
            <Button onClick={updateUser} className="apple-button bg-primary hover:bg-primary/90">
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
