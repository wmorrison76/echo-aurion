/**
 * Maestro Banquets Dashboard Panel
 * 
 * Main dashboard for Chef interface with moveable panels, real-time notifications,
 * Nova Lab integration, and live BEO document updates.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { 
  DashboardPanel,
  DashboardPanelType,
  BEONotification,
  GlobalCalendarNotification,
  UpcomingBEO,
  CurrentOrder,
  InventoryLocation,
  StaffSchedule,
  StickyNote,
  AIRecommendation,
  LiveBEODocument,
  BEODocumentStatus,
  DocumentChange
} from '../../types/dashboard';

interface MaestroDashboardPanelProps {
  eventId?: string;
}

// === Notification Components ===

const NotificationItem: React.FC<{ 
  notification: BEONotification | GlobalCalendarNotification;
  onView: (id: string) => void;
  onAcknowledge?: (id: string) => void;
}> = ({ notification, onView, onAcknowledge }) => {
  const isBEONotification = 'beoId' in notification;
  const isGlobalNotification = 'acknowledgmentRequired' in notification;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 animate-pulse';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${!notification.viewed ? 'border-blue-500 bg-blue-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-3 h-3 rounded-full mt-1 ${getUrgencyColor(isBEONotification ? (notification as BEONotification).urgency : 'medium')}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-sm truncate">{notification.title}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isBEONotification && (
                  <Badge variant="outline" className="text-xs">
                    BEO #{(notification as BEONotification).beoNumber}
                  </Badge>
                )}
                <span>{new Date(notification.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(notification.id)}
                className="text-xs h-7"
              >
                {isBEONotification ? 'View BEO' : 'View Details'}
              </Button>
              {isGlobalNotification && (notification as GlobalCalendarNotification).acknowledgmentRequired && onAcknowledge && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onAcknowledge(notification.id)}
                  className="text-xs h-7"
                >
                  Acknowledge
                </Button>
              )}
              {!notification.viewed && (
                <Badge variant="secondary" className="text-xs">Unread</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const GlobalCalendarQuickAccess: React.FC<{
  notifications: GlobalCalendarNotification[];
  newBEOCount: number;
  onNavigateToNewBEO: () => void;
}> = ({ notifications, newBEOCount, onNavigateToNewBEO }) => {
  const unviewedBEOs = notifications.filter(n => n.type === 'new_event' && !n.viewed);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          📅 Global Calendar
          {newBEOCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {newBEOCount} New
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {newBEOCount > 0 ? (
          <div className="space-y-3">
            <Button
              onClick={onNavigateToNewBEO}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              📋 Take Me to New BEO{newBEOCount > 1 ? 's' : ''}
            </Button>
            {newBEOCount > 1 && (
              <div className="text-sm text-muted-foreground text-center">
                {newBEOCount} unviewed BEOs available
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No new BEOs pending review
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// === Upcoming BEOs Panel ===

const UpcomingBEOItem: React.FC<{
  beo: UpcomingBEO;
  onSelect: (beoId: string) => void;
}> = ({ beo, onSelect }) => {
  const getStatusColor = (status: BEODocumentStatus) => {
    switch (status) {
      case 'in_process': return 'bg-yellow-500 text-black font-bold animate-pulse';
      case 'confirmed': return 'bg-green-500 text-white font-bold';
      case 'updating': return 'bg-orange-500 text-white font-bold animate-pulse';
      case 'updated': return 'bg-blue-500 text-white font-bold';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${beo.hasUnviewedChanges ? 'border-blue-500 bg-blue-50/50 animate-pulse' : ''}`}
      onClick={() => onSelect(beo.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium truncate">{beo.beoName}</h4>
              <Badge variant="outline" className="text-xs">#{beo.beoNumber}</Badge>
              {beo.hasUnviewedChanges && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  Updated
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>📅 Event: {new Date(beo.eventDate).toLocaleDateString()}</div>
              <div>🚚 Delivery: {new Date(beo.deliveryDate).toLocaleDateString()}</div>
              <div>👥 Guests: {beo.guestCount.toLocaleString()}</div>
              <div>💰 Amount: {formatCurrency(beo.orderAmount, beo.currency)}</div>
              <div>⏱️ Prep Time: {beo.estimatedPrepTime}h</div>
            </div>

            {beo.nextDeadline && (
              <Alert className="mt-3 p-2">
                <AlertDescription className="text-xs">
                  <strong>Next: </strong>{beo.nextDeadline.description}
                  <br />
                  📅 {new Date(beo.nextDeadline.datetime).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge 
              className={`text-xs px-2 py-1 ${getStatusColor(beo.status)}`}
            >
              {beo.status.replace('_', ' ').toUpperCase()}
            </Badge>
            
            {beo.priority !== 'low' && (
              <Badge 
                variant={beo.priority === 'urgent' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {beo.priority.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// === Live BEO Document Viewer ===

const LiveBEOViewer: React.FC<{
  document: LiveBEODocument;
  onClose: () => void;
}> = ({ document, onClose }) => {
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const unviewedChanges = document.changeLog.filter(change => !change.acknowledged);
  
  const getStatusDisplay = (status: BEODocumentStatus) => {
    const timestamp = new Date(document.lastModified).toLocaleString();
    
    switch (status) {
      case 'in_process':
        return (
          <Badge className="bg-yellow-500 text-black font-bold text-lg px-4 py-2 animate-pulse">
            IN PROCESS
          </Badge>
        );
      case 'confirmed':
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge className="bg-green-500 text-white font-bold text-lg px-4 py-2">
              CONFIRMED
            </Badge>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>
        );
      case 'updating':
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge className="bg-orange-500 text-white font-bold text-lg px-4 py-2 animate-pulse">
              UPDATING
            </Badge>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>
        );
      case 'updated':
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge className="bg-blue-500 text-white font-bold text-lg px-4 py-2">
              UPDATED
            </Badge>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>
        );
      default:
        return (
          <Badge variant="outline" className="text-lg px-4 py-2">
            {status.replace('_', ' ').toUpperCase()}
          </Badge>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl">Live BEO Document</CardTitle>
              {getStatusDisplay(document.status)}
            </div>
            <div className="flex items-center gap-3">
              {document.activeEditors.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  {document.activeEditors.length} active editor{document.activeEditors.length !== 1 ? 's' : ''}
                </div>
              )}
              <Button variant="outline" onClick={onClose}>
                ✕ Close
              </Button>
            </div>
          </div>
          
          {unviewedChanges.length > 0 && (
            <Alert className="mt-3">
              <AlertDescription>
                <strong>{unviewedChanges.length} unviewed change{unviewedChanges.length !== 1 ? 's' : ''}</strong> since your last view
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="flex h-[60vh]">
            {/* Changes Sidebar */}
            <div className="w-80 border-r bg-gray-50 p-4">
              <h3 className="font-medium mb-3">Recent Changes</h3>
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {document.changeLog.slice(0, 20).map(change => (
                    <Card 
                      key={change.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        !change.acknowledged 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedSection(change.section)}
                    >
                      <div className="text-xs space-y-1">
                        <div className="font-medium">{change.section}</div>
                        <div className="text-muted-foreground">
                          {change.type.replace('_', ' ')} by {change.changedBy}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(change.timestamp).toLocaleString()}
                        </div>
                        {!change.acknowledged && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Document Content */}
            <div className="flex-1 p-6">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  <div className="text-center text-muted-foreground">
                    Live BEO Document Content
                    <br />
                    <span className="text-sm">
                      Document ID: {document.beoId} | Version: {document.version}
                    </span>
                  </div>
                  
                  {/* This would be replaced with actual BEO content rendering */}
                  <div className="bg-gray-100 p-8 rounded-lg text-center">
                    <p className="text-muted-foreground">
                      BEO document content would be rendered here with real-time updates
                      and highlighted changes based on the changeLog.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Integration with BEOREOEditorPanel component for full editing capabilities.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// === Sticky Notes Panel ===

const StickyNotesPanel: React.FC<{
  notes: StickyNote[];
  onCreateNote: () => void;
  onEditNote: (noteId: string) => void;
}> = ({ notes, onCreateNote, onEditNote }) => {
  const getColorClass = (color: string) => {
    const colors = {
      yellow: 'bg-yellow-200 border-yellow-300',
      blue: 'bg-blue-200 border-blue-300',
      green: 'bg-green-200 border-green-300',
      red: 'bg-red-200 border-red-300',
      orange: 'bg-orange-200 border-orange-300',
      purple: 'bg-purple-200 border-purple-300',
      pink: 'bg-pink-200 border-pink-300',
      gray: 'bg-gray-200 border-gray-300'
    };
    return colors[color as keyof typeof colors] || colors.yellow;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Sticky Notes</h3>
        <Button size="sm" onClick={onCreateNote}>
          + Add Note
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {notes.map(note => (
          <Card 
            key={note.id}
            className={`cursor-pointer transition-all hover:shadow-md ${getColorClass(note.color)}`}
            onClick={() => onEditNote(note.id)}
          >
            <CardContent className="p-3">
              {note.title && (
                <h4 className="font-medium text-sm mb-2 truncate">{note.title}</h4>
              )}
              <p className="text-sm text-gray-700 overflow-hidden" style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const
              }}>{note.content}</p>
              
              <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {note.type}
                  </Badge>
                  {note.priority !== 'low' && (
                    <Badge 
                      variant={note.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {note.priority}
                    </Badge>
                  )}
                </div>
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
              
              {note.targetUser && (
                <div className="mt-2 text-xs text-blue-600">
                  📝 For: {note.targetUser}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// === Main Dashboard Component ===

export const MaestroDashboardPanel: React.FC<MaestroDashboardPanelProps> = ({ eventId }) => {
  // State management
  const [notifications, setNotifications] = useState<BEONotification[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<GlobalCalendarNotification[]>([]);
  const [upcomingBEOs, setUpcomingBEOs] = useState<UpcomingBEO[]>([]);
  const [currentOrders, setCurrentOrders] = useState<CurrentOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryLocation[]>([]);
  const [staffSchedule, setStaffSchedule] = useState<StaffSchedule | null>(null);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedBEODocument, setSelectedBEODocument] = useState<LiveBEODocument | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);

  // Mock data loading (replace with real API calls)
  useEffect(() => {
    loadDashboardData();
    setupWebSocketConnection();
  }, []);

  const loadDashboardData = async () => {
    // Mock data - replace with actual API calls
    setNotifications([
      {
        id: 'notif-1',
        type: 'new_beo',
        eventId: 'ev-001',
        beoId: 'beo-001',
        beoName: 'Smith Wedding Reception',
        beoNumber: 'BEO-2024-001',
        title: 'New BEO Created',
        message: 'Smith Wedding Reception BEO has been created and is ready for review.',
        timestamp: new Date().toISOString(),
        viewed: false,
        urgency: 'medium',
        source: 'nova_lab'
      }
    ]);

    setGlobalNotifications([
      {
        id: 'global-1',
        type: 'new_event',
        eventId: 'ev-001',
        title: 'New Event Added to Calendar',
        message: 'Smith Wedding Reception scheduled for next Saturday.',
        timestamp: new Date().toISOString(),
        actionRequired: true,
        actionUrl: '/beo/beo-001',
        viewed: false,
        acknowledgmentRequired: true
      }
    ]);

    setUpcomingBEOs([
      {
        id: 'beo-001',
        beoNumber: 'BEO-2024-001',
        beoName: 'Smith Wedding Reception',
        eventName: 'Smith Wedding',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        guestCount: 150,
        orderAmount: 12500,
        currency: 'USD',
        status: 'in_process',
        priority: 'high',
        assignedChef: 'Chef Johnson',
        hasUnviewedChanges: true,
        estimatedPrepTime: 24,
        nextDeadline: {
          type: 'menu_confirmation',
          datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Menu confirmation due'
        }
      }
    ]);
  };

  const setupWebSocketConnection = () => {
    // Mock WebSocket connection
    setTimeout(() => setWebsocketConnected(true), 1000);
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      simulateRealTimeUpdate();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  };

  const simulateRealTimeUpdate = () => {
    // Simulate BEO status change
    setUpcomingBEOs(prev => prev.map(beo => ({
      ...beo,
      hasUnviewedChanges: Math.random() > 0.7
    })));
  };

  const handleViewNotification = (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && 'beoId' in notification) {
      // Load and show live BEO document
      loadLiveBEODocument(notification.beoId);
    }
    
    // Mark as viewed
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, viewed: true, viewedAt: new Date().toISOString() } : n
    ));
  };

  const loadLiveBEODocument = async (beoId: string) => {
    // Mock live document loading
    const mockDocument: LiveBEODocument = {
      id: 'live-doc-1',
      beoId,
      content: {},
      version: 3,
      status: 'in_process',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Event Planner Sarah',
      activeEditors: [
        {
          userId: 'user-1',
          userName: 'Sarah Johnson',
          role: 'event_planner',
          lastActivity: new Date().toISOString(),
          currentSection: 'Menu'
        }
      ],
      changeLog: [
        {
          id: 'change-1',
          type: 'text_change',
          section: 'Menu',
          field: 'appetizer_count',
          oldValue: '12',
          newValue: '15',
          changedBy: 'Sarah Johnson',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          highlighted: true,
          acknowledged: false
        }
      ],
      viewerState: {
        lastViewedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        lastViewedBy: 'Chef Johnson',
        lastViewedVersion: 2,
        unviewedChanges: [],
        scrollPosition: 0
      }
    };
    
    setSelectedBEODocument(mockDocument);
  };

  const handleNavigateToNewBEO = () => {
    const newBEOs = globalNotifications.filter(n => n.type === 'new_event' && !n.viewed);
    if (newBEOs.length > 0) {
      handleViewNotification(newBEOs[0].id);
    }
  };

  const newBEOCount = globalNotifications.filter(n => n.type === 'new_event' && !n.viewed).length;
  const unreadNotifications = notifications.filter(n => !n.viewed).length;

  const toolbarRight = (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${websocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-muted-foreground">
          {websocketConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>
      <Button
        size="sm"
        variant={isEditMode ? "default" : "outline"}
        onClick={() => setIsEditMode(!isEditMode)}
      >
        {isEditMode ? '✓ Done' : '✎ Edit Layout'}
      </Button>
      <Button size="sm" variant="outline">
        ⚙️ Settings
      </Button>
    </div>
  );

  return (
    <>
      <PanelShell title="Maestro Banquets Dashboard" toolbarRight={toolbarRight}>
        <div className="space-y-6">
          {/* Top Bar - Global Calendar & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlobalCalendarQuickAccess
              notifications={globalNotifications}
              newBEOCount={newBEOCount}
              onNavigateToNewBEO={handleNavigateToNewBEO}
            />
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  🔔 Notifications
                  {unreadNotifications > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {unreadNotifications}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-24">
                  {notifications.length > 0 ? (
                    <div className="space-y-2">
                      {notifications.slice(0, 3).map(notification => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onView={handleViewNotification}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No new notifications
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Panels */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="beos">BEOs</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="notes">Notes & AI</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Upcoming BEOs Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Upcoming BEOs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {upcomingBEOs.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {upcomingBEOs.filter(b => b.hasUnviewedChanges).length} with updates
                    </div>
                  </CardContent>
                </Card>

                {/* Current Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {currentOrders.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      In preparation
                    </div>
                  </CardContent>
                </Card>

                {/* Staff Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Staff Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {staffSchedule?.totalStaffCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Scheduled
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="beos" className="space-y-4">
              <div className="space-y-4">
                {upcomingBEOs.map(beo => (
                  <UpcomingBEOItem
                    key={beo.id}
                    beo={beo}
                    onSelect={(beoId) => loadLiveBEODocument(beoId)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="operations" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Inventory Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Inventory Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                      Inventory tracking panel
                      <br />
                      <span className="text-sm">Shows cooler, freezer, and dry storage levels</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Staff Schedule */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Staff Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                      Staff schedule panel
                      <br />
                      <span className="text-sm">Shows in/out times and assignments</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <StickyNotesPanel
                notes={stickyNotes}
                onCreateNote={() => {/* TODO: Implement note creation */}}
                onEditNote={(noteId) => {/* TODO: Implement note editing */}}
              />
            </TabsContent>
          </Tabs>
        </div>
      </PanelShell>

      {/* Live BEO Document Viewer Modal */}
      {selectedBEODocument && (
        <LiveBEOViewer
          document={selectedBEODocument}
          onClose={() => setSelectedBEODocument(null)}
        />
      )}
    </>
  );
};

export default MaestroDashboardPanel;
