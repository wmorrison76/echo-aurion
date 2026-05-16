/**
 * Echo CRM Events Integration Panel
 * Provides real-time sync status, conflict resolution, and integration controls
 */

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Settings, 
  Eye,
  X,
  ArrowRightLeft,
  Users,
  Calendar as CalendarIcon,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useBEOStore } from '../../stores/beoStore';
import type { 
  SyncStatus, 
  DataConflict, 
  SyncOperation, 
  EchoCRMEvent 
} from '../../types/echo-integration';

interface EchoIntegrationPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const SyncStatusIndicator: React.FC<{ status: SyncStatus | null }> = ({ status }) => {
  if (!status) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-sm text-muted-foreground">Not connected</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!status.isConnected) return 'bg-red-500';
    if (status.stats.failedOperations > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!status.isConnected) return 'Disconnected';
    if (status.stats.failedOperations > 0) return 'Issues detected';
    return 'Connected';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
      <span className="text-sm">{getStatusText()}</span>
      {status.lastSyncAt && (
        <span className="text-xs text-muted-foreground">
          Last sync: {new Date(status.lastSyncAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

const ConflictCard: React.FC<{ 
  conflict: DataConflict; 
  onResolve: (conflictId: string, resolution: 'echo_wins' | 'maestro_wins') => void;
}> = ({ conflict, onResolve }) => {
  const [selectedResolution, setSelectedResolution] = useState<'echo_wins' | 'maestro_wins'>('echo_wins');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <Card className={`border-l-4 ${getPriorityColor(conflict.priority)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {conflict.conflictType.replace('_', ' ').toUpperCase()}
          </CardTitle>
          <Badge variant="outline" className={getPriorityColor(conflict.priority)}>
            {conflict.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{conflict.impactAssessment}</p>
        
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Conflicting Fields:</h4>
          {conflict.conflicts.map((fieldConflict, index) => (
            <div key={index} className="p-2 bg-muted/30 rounded text-xs">
              <div className="font-medium">{fieldConflict.field}</div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <span className="text-blue-600">Echo CRM:</span> {String(fieldConflict.echoValue)}
                </div>
                <div>
                  <span className="text-green-600">Maestro:</span> {String(fieldConflict.maestroValue)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedResolution} onValueChange={(value: any) => setSelectedResolution(value)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="echo_wins">Use Echo CRM version</SelectItem>
              <SelectItem value="maestro_wins">Use Maestro version</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={() => onResolve(conflict.id, selectedResolution)}
          >
            Resolve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const SyncOperationItem: React.FC<{ operation: SyncOperation }> = ({ operation }) => {
  const getStatusIcon = () => {
    switch (operation.status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <X className="h-4 w-4 text-red-500" />;
      case 'conflicted': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getDirectionIcon = () => {
    return operation.direction === 'echo_to_maestro' ? 
      <ArrowRightLeft className="h-3 w-3 rotate-180" /> : 
      <ArrowRightLeft className="h-3 w-3" />;
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium capitalize">
              {operation.operationType}
            </span>
            {getDirectionIcon()}
            <span className="text-xs text-muted-foreground">
              {operation.direction.replace('_', ' → ')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(operation.startedAt).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={operation.status === 'completed' ? 'default' : 'destructive'}>
          {operation.status}
        </Badge>
        {operation.errorMessage && (
          <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
            {operation.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

const EchoCrmEventCard: React.FC<{ event: EchoCRMEvent; onCreateBEO: (eventId: string) => void }> = ({ 
  event, 
  onCreateBEO 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-800 border-green-200';
      case 'negotiating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'proposal_sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="glass-panel">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-medium">{event.eventName}</h3>
            <p className="text-sm text-muted-foreground">{event.clientName}</p>
          </div>
          <Badge className={getStatusColor(event.contractStatus)}>
            {event.contractStatus.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>{new Date(event.eventDate).toLocaleDateString()} at {event.eventTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{event.guestCount.guaranteed} guests</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-medium">${event.budget.totalBudget.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            Sales Rep: {event.salesRepName}
          </div>
          <div className="flex items-center gap-2">
            {event.maestroBEOId ? (
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                View BEO
              </Button>
            ) : (
              <Button size="sm" onClick={() => onCreateBEO(event.crmEventId)}>
                <FileText className="h-4 w-4 mr-1" />
                Create BEO
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const EchoIntegrationPanel: React.FC<EchoIntegrationPanelProps> = ({ 
  isVisible, 
  onClose 
}) => {
  const {
    syncStatus,
    pendingConflicts,
    echoCrmEvents,
    isIntegrationEnabled,
    syncWithEchoCrm,
    resolveConflict,
    createBEOFromEchoCrmEvent,
    refreshSyncStatus,
    loadEchoCrmEvents
  } = useBEOStore();

  const [activeTab, setActiveTab] = useState('status');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible && isIntegrationEnabled) {
      refreshSyncStatus();
      loadEchoCrmEvents();
    }
  }, [isVisible, isIntegrationEnabled, refreshSyncStatus, loadEchoCrmEvents]);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await syncWithEchoCrm();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'echo_wins' | 'maestro_wins') => {
    try {
      await resolveConflict(conflictId, resolution);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleCreateBEO = async (echoCrmEventId: string) => {
    try {
      await createBEOFromEchoCrmEvent(echoCrmEventId);
    } catch (error) {
      console.error('Failed to create BEO:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <Card className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Echo CRM Events Integration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time synchronization between Echo CRM Events and Maestro Banquets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator status={syncStatus} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 pb-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="conflicts">
                  Conflicts
                  {pendingConflicts.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingConflicts.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="events">Echo Events</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </div>

            <div className="px-6 pb-6 max-h-96 overflow-y-auto">
              <TabsContent value="status" className="space-y-4">
                {!isIntegrationEnabled ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Echo CRM Events integration is not configured. Contact your administrator to set up the integration.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-green-600">
                            {syncStatus?.stats.totalSynced || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Synced</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {syncStatus?.stats.pendingOperations || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-red-600">
                            {syncStatus?.stats.failedOperations || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Failed</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-yellow-600">
                            {syncStatus?.stats.conflictsToResolve || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Conflicts</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sync Controls */}
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSync} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Syncing...' : 'Sync Now'}
                      </Button>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="conflicts" className="space-y-4">
                {pendingConflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No conflicts</h3>
                    <p className="text-muted-foreground">All data is synchronized successfully</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingConflicts.map(conflict => (
                      <ConflictCard
                        key={conflict.id}
                        conflict={conflict}
                        onResolve={handleResolveConflict}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Recent Echo CRM Events</h3>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Echo CRM
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {echoCrmEvents.slice(0, 6).map(event => (
                    <EchoCrmEventCard
                      key={event.id}
                      event={event}
                      onCreateBEO={handleCreateBEO}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="space-y-3">
                  {syncStatus?.currentOperations?.map(operation => (
                    <SyncOperationItem key={operation.id} operation={operation} />
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent operations
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EchoIntegrationPanel;
