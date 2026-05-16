import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CloudRain,
  Wind,
  Thermometer,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  X,
  Bell,
  Calendar,
  Building2,
  Navigation,
  Eye
} from "lucide-react";
import { EventWeatherAlert, weatherNotificationService } from "@/lib/weather-notification-service";
import { formatAddress } from "@/lib/event-location-utils";
import { cn } from "@/lib/utils";

interface WeatherNotificationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  alert?: EventWeatherAlert;
}

export default function WeatherNotificationPopup({ 
  isOpen, 
  onClose, 
  alert 
}: WeatherNotificationPopupProps) {
  const [alerts, setAlerts] = useState<EventWeatherAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<EventWeatherAlert | null>(null);

  useEffect(() => {
    // Load all active alerts
    const activeAlerts = weatherNotificationService.getActiveAlerts();
    setAlerts(activeAlerts);
    
    // If a specific alert was passed, select it
    if (alert) {
      setSelectedAlert(alert);
    } else if (activeAlerts.length > 0) {
      setSelectedAlert(activeAlerts[0]);
    }
  }, [alert, isOpen]);

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'medium': return <CloudRain className="h-5 w-5 text-yellow-600" />;
      case 'low': return <Bell className="h-5 w-5 text-blue-600" />;
      default: return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getWeatherIcon = (weatherType: string) => {
    switch (weatherType.toLowerCase()) {
      case 'precipitation':
      case 'rain':
        return <CloudRain className="h-4 w-4" />;
      case 'high_winds':
      case 'wind':
        return <Wind className="h-4 w-4" />;
      case 'extreme_temperature':
      case 'temperature':
        return <Thermometer className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatTimeUntilEvent = (eventDate: Date): string => {
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Event in progress';
    if (diffHours < 24) return `${diffHours} hours until event`;
    
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} until event`;
  };

  const handleAcknowledge = (alertId: string) => {
    weatherNotificationService.acknowledgeAlert(alertId);
    setAlerts(prevAlerts => 
      prevAlerts.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      )
    );
  };

  const handleViewOnMap = (alert: EventWeatherAlert) => {
    // This would trigger opening the weather radar focused on the event location
    onClose();
    // In a real application, this would communicate with the weather radar component
    console.log('Viewing event location on weather radar:', alert.location);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Weather Alerts for Events</span>
            <Badge variant="outline" className="ml-2">
              {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[70vh]">
          {/* Alert List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[55vh]">
                  <div className="space-y-2 p-4">
                    {alerts.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>No active weather alerts</p>
                        <p className="text-xs">All events are clear</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            selectedAlert?.id === alert.id 
                              ? "bg-primary/10 border-primary" 
                              : "hover:bg-muted/50",
                            alert.acknowledged && "opacity-60"
                          )}
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {getSeverityIcon(alert.severity)}
                              <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            {alert.acknowledged && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          
                          <h4 className="font-medium text-sm mb-1 line-clamp-2">
                            {alert.event.name}
                          </h4>
                          
                          <div className="flex items-center text-xs text-muted-foreground mb-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {alert.location.venue?.name}
                          </div>
                          
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimeUntilEvent(alert.event.start_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Alert Details */}
          <div className="lg:col-span-2">
            {selectedAlert ? (
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2 mb-2">
                        {getSeverityIcon(selectedAlert.severity)}
                        <span>{selectedAlert.event.name}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {selectedAlert.location.venue?.name}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {selectedAlert.event.expected_guests} guests
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {selectedAlert.event.start_at.toLocaleDateString()}
                        </div>
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={cn("text-xs", getSeverityColor(selectedAlert.severity))}>
                        {selectedAlert.severity.toUpperCase()} RISK
                      </Badge>
                      {selectedAlert.acknowledged && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          ACKNOWLEDGED
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ScrollArea className="h-[45vh]">
                    <div className="space-y-4">
                      {/* Weather Alert Details */}
                      <Alert className={cn("border-l-4", getSeverityColor(selectedAlert.severity))}>
                        <div className="flex items-center space-x-2 mb-2">
                          {getWeatherIcon(selectedAlert.alert.event)}
                          <AlertTitle className="text-sm">
                            {selectedAlert.alert.event.replace('_', ' ').toUpperCase()} {selectedAlert.alert.type.toUpperCase()}
                          </AlertTitle>
                        </div>
                        <AlertDescription>
                          <p className="text-sm mb-2">{selectedAlert.alert.description}</p>
                          <div className="text-xs text-muted-foreground">
                            <p>Start: {selectedAlert.alert.start_time.toLocaleString()}</p>
                            <p>End: {selectedAlert.alert.end_time.toLocaleString()}</p>
                          </div>
                        </AlertDescription>
                      </Alert>

                      {/* Location Information */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          Event Location
                        </h4>
                        <div className="bg-muted/20 p-3 rounded-lg text-sm">
                          <p className="font-medium">{selectedAlert.location.venue?.name}</p>
                          <p className="text-muted-foreground">
                            {formatAddress(selectedAlert.location.address)}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-muted-foreground">
                            <Navigation className="h-3 w-3 mr-1" />
                            {selectedAlert.location.location.latitude.toFixed(4)}°N, {Math.abs(selectedAlert.location.location.longitude).toFixed(4)}°W
                          </div>
                        </div>
                      </div>

                      {/* Impact Assessment */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Impact Assessment</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-muted/20 p-3 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground">Outdoor Events</p>
                            <Badge className={cn("text-xs mt-1", 
                              selectedAlert.alert.impact_assessment.outdoor_events === 'critical' ? 'bg-red-100 text-red-700' :
                              selectedAlert.alert.impact_assessment.outdoor_events === 'high' ? 'bg-orange-100 text-orange-700' :
                              selectedAlert.alert.impact_assessment.outdoor_events === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            )}>
                              {selectedAlert.alert.impact_assessment.outdoor_events.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="bg-muted/20 p-3 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground">Guest Comfort</p>
                            <Badge className={cn("text-xs mt-1",
                              selectedAlert.alert.impact_assessment.guest_comfort === 'dangerous' ? 'bg-red-100 text-red-700' :
                              selectedAlert.alert.impact_assessment.guest_comfort === 'uncomfortable' ? 'bg-orange-100 text-orange-700' :
                              selectedAlert.alert.impact_assessment.guest_comfort === 'manageable' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            )}>
                              {selectedAlert.alert.impact_assessment.guest_comfort.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="bg-muted/20 p-3 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground">Equipment Risk</p>
                            <Badge className={cn("text-xs mt-1",
                              selectedAlert.alert.impact_assessment.equipment_risk === 'high' ? 'bg-red-100 text-red-700' :
                              selectedAlert.alert.impact_assessment.equipment_risk === 'moderate' ? 'bg-orange-100 text-orange-700' :
                              selectedAlert.alert.impact_assessment.equipment_risk === 'minimal' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            )}>
                              {selectedAlert.alert.impact_assessment.equipment_risk.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Recommended Actions</h4>
                        <div className="space-y-2">
                          {selectedAlert.recommended_actions.map((action, index) => (
                            <div key={index} className="flex items-start space-x-2 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                              <span>{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Timeline</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Alert Created:</span>
                            <span>{selectedAlert.created_at.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time Until Event:</span>
                            <span>{formatTimeUntilEvent(selectedAlert.event.start_at)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event Duration:</span>
                            <span>
                              {selectedAlert.event.start_at.toLocaleTimeString()} - {selectedAlert.event.end_at.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>Select an alert to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {selectedAlert && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewOnMap(selectedAlert)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View on Weather Radar
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              {!selectedAlert.acknowledged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcknowledge(selectedAlert.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
