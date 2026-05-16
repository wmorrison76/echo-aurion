/**
 * Ecosystem Control Panel - Phase 4: Real-time Collaboration
 * Live presence indicators, notifications, and collaborative updates
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/button';
import {
  Users,
  MessageSquare,
  Activity,
  Eye,
  Share2,
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'staff';
  isEditing: boolean;
  currentView: string;
  lastActiveAt: Date;
  color: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: Date;
  details?: Record<string, any>;
}

interface CollaborativeUpdate {
  id: string;
  userId: string;
  userName: string;
  type: 'edit' | 'create' | 'delete' | 'comment' | 'share';
  resource: string;
  description: string;
  timestamp: Date;
  seen: boolean;
}

interface EcosystemRealTimeCollaborationProps {
  activeUsers?: ActiveUser[];
  activityLog?: ActivityLog[];
  updates?: CollaborativeUpdate[];
  onUserAction?: (action: string, target: string) => Promise<void>;
  onShareResource?: (resourceId: string, userIds: string[]) => Promise<void>;
  onNotificationRead?: (updateId: string) => Promise<void>;
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  staff: 'bg-gray-100 text-gray-800',
};

const roleInitials: Record<string, string> = {
  admin: 'AD',
  manager: 'MG',
  staff: 'ST',
};

export const EcosystemRealTimeCollaboration: React.FC<
  EcosystemRealTimeCollaborationProps
> = ({
  activeUsers = [],
  activityLog = [],
  updates = [],
  onUserAction,
  onShareResource,
  onNotificationRead,
}) => {
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Calculate statistics
  const statistics = useMemo(() => {
    return {
      activeUsers: activeUsers.length,
      adminsActive: activeUsers.filter(u => u.role === 'admin').length,
      managersActive: activeUsers.filter(u => u.role === 'manager').length,
      staffActive: activeUsers.filter(u => u.role === 'staff').length,
      editing: activeUsers.filter(u => u.isEditing).length,
      unreadUpdates: updates.filter(u => !u.seen).length,
      recentActivity: activityLog.slice(0, 5),
      recentUpdates: updates.slice(0, 5),
    };
  }, [activeUsers, updates, activityLog]);

  // Mark notification as read
  const handleMarkAsRead = useCallback(
    async (updateId: string) => {
      if (!onNotificationRead) return;

      try {
        await onNotificationRead(updateId);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    [onNotificationRead]
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.activeUsers}</div>
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              <p>{statistics.adminsActive} Admins</p>
              <p>{statistics.managersActive} Managers</p>
              <p>{statistics.staffActive} Staff</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Currently Editing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.editing}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Live edits in progress
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Unread Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              statistics.unreadUpdates > 0 ? 'text-orange-600' : 'text-gray-600'
            )}>
              {statistics.unreadUpdates}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              New notifications
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Last Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono text-gray-900">
              {statistics.recentUpdates[0]
                ? new Date(statistics.recentUpdates[0].timestamp).toLocaleTimeString()
                : 'N/A'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {statistics.recentUpdates[0]?.userName || 'No activity'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Users & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Users</CardTitle>
            <CardDescription>
              Users currently viewing the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeUsers.length > 0 ? (
                activeUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className={cn(
                          'text-xs font-bold',
                          roleColors[user.role]
                        )}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border border-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {user.currentView}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {user.isEditing && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          <Zap className="h-2.5 w-2.5 mr-1" />
                          Editing
                        </Badge>
                      )}
                      <Badge className={cn('text-xs', roleColors[user.role])}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 text-center py-4">
                  No active users
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>
              Latest actions in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.recentActivity.length > 0 ? (
                statistics.recentActivity.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg border text-sm"
                  >
                    <div className="pt-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {activity.userName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {activity.action} {activity.target}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Updates & Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Collaborative Updates</CardTitle>
              <CardDescription>
                Changes made by team members
              </CardDescription>
            </div>
            {statistics.unreadUpdates > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                {statistics.unreadUpdates} New
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            {statistics.recentUpdates.length > 0 ? (
              statistics.recentUpdates.map(update => (
                <div
                  key={update.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    update.seen
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  )}
                >
                  {/* Type Icon */}
                  <div className="pt-1">
                    {update.type === 'edit' && (
                      <Activity className="h-4 w-4 text-blue-600" />
                    )}
                    {update.type === 'create' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {update.type === 'delete' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    {update.type === 'comment' && (
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                    )}
                    {update.type === 'share' && (
                      <Share2 className="h-4 w-4 text-orange-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {update.userName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {update.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(update.timestamp).toLocaleString()}
                        </p>
                      </div>

                      {!update.seen && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleMarkAsRead(update.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600 text-center py-4">
                No updates yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Activity</DialogTitle>
            <DialogDescription>
              Details about {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className={cn(
                    'text-sm font-bold',
                    roleColors[selectedUser.role]
                  )}>
                    {selectedUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedUser.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedUser.email}
                  </p>
                  <Badge className={cn('mt-2 text-xs', roleColors[selectedUser.role])}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Status</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 border rounded text-sm">
                    <p className="text-gray-600 text-xs">Current View</p>
                    <p className="font-medium">{selectedUser.currentView}</p>
                  </div>
                  <div className="p-2 border rounded text-sm">
                    <p className="text-gray-600 text-xs">Last Active</p>
                    <p className="font-medium">
                      {new Date(selectedUser.lastActiveAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcosystemRealTimeCollaboration;
