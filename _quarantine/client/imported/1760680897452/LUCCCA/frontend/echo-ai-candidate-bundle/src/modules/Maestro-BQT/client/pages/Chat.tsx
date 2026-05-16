/**
 * Chat Page - Maestro Banquets
 * Main communication hub for messaging and video calls between team members
 */

import React, { useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { ChatPanel } from '../components/panels/ChatPanel';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Users, 
  Video, 
  MessageSquare, 
  Phone, 
  Settings,
  Bell,
  BellOff,
  Zap
} from 'lucide-react';
import { useCommunicationStore } from '../stores/communicationStore';
import { useBEOStore } from '../stores/beoStore';

export default function Chat() {
  const {
    notifications,
    getOnlineUsers,
    activeCall,
    loadNotifications,
    markAllNotificationsAsRead,
    updateSettings,
    settings
  } = useCommunicationStore();

  const { isIntegrationEnabled } = useBEOStore();

  const onlineUsers = getOnlineUsers();
  const unreadNotifications = notifications.filter(n => !n.readAt);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleToggleNotifications = () => {
    updateSettings({
      desktopNotifications: !settings.desktopNotifications
    });
  };

  const headerActions = (
    <>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-green-600 border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          {onlineUsers.length} Online
        </Badge>
        
        {isIntegrationEnabled && (
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            <Zap className="h-3 w-3 mr-1" />
            Echo CRM
          </Badge>
        )}
      </div>

      {activeCall && (
        <Badge variant="destructive" className="animate-pulse">
          <Video className="h-3 w-3 mr-1" />
          Call Active
        </Badge>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleNotifications}
      >
        {settings.desktopNotifications ? (
          <Bell className="h-4 w-4 mr-2" />
        ) : (
          <BellOff className="h-4 w-4 mr-2" />
        )}
        Notifications
      </Button>

      {unreadNotifications.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={markAllNotificationsAsRead}
        >
          Mark All Read
          <Badge variant="destructive" className="ml-2">
            {unreadNotifications.length}
          </Badge>
        </Button>
      )}

      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
    </>
  );

  return (
    <DashboardLayout
      title="Internal Chat"
      subtitle="Direct messaging and video conferencing with your team"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Online Now</p>
                  <p className="text-2xl font-bold text-green-600">{onlineUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unread Messages</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {unreadNotifications.filter(n => n.type === 'message').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Calls</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {activeCall ? 1 : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">BEO Discussions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Object.values(useCommunicationStore.getState().conversations)
                      .filter(c => c.type === 'beo_discussion').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Notifications */}
        {unreadNotifications.filter(n => n.priority === 'urgent').length > 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <Bell className="h-5 w-5" />
                Urgent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unreadNotifications
                  .filter(n => n.priority === 'urgent')
                  .slice(0, 3)
                  .map(notification => (
                    <div key={notification.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Chat Interface */}
        <ChatPanel className="min-h-[600px]" />

        {/* Communication Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">BEO Communications</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use urgent priority for time-sensitive BEO changes</li>
                  <li>• Include BEO reference number in relevant messages</li>
                  <li>• Video calls recommended for complex menu discussions</li>
                  <li>• Echo CRM integration syncs with sales team automatically</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Video Calling</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• HD quality available for detailed menu reviews</li>
                  <li>• Screen sharing for BEO document collaboration</li>
                  <li>• Call recording available for important discussions</li>
                  <li>• Mobile and desktop access supported</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
