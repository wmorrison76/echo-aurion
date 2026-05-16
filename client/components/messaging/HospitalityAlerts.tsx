import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  Flame,
  AlertTriangle,
  Package,
  Clock,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HospitalityAlertsProps {
  orgId: string;
  onAlert?: (alert: HospitalityAlert) => void;
}

export interface HospitalityAlert {
  id: string;
  type: 'beo' | 'allergen' | 'inventory' | 'schedule' | 'incident';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  data: Record<string, any>;
  timestamp: Date;
  read: boolean;
}

export const HospitalityAlerts: React.FC<HospitalityAlertsProps> = ({
  orgId,
  onAlert,
}) => {
  const [alerts, setAlerts] = useState<HospitalityAlert[]>([]);
  const [showBeoForm, setShowBeoForm] = useState(false);
  const [showAllergenForm, setShowAllergenForm] = useState(false);
  const [beoData, setBeoData] = useState({
    eventName: '',
    courseNumber: '',
    tableCount: '',
    notes: '',
  });
  const [allergenData, setAllergenData] = useState({
    tableNumber: '',
    allergens: '',
    orderId: '',
  });

  // ============================================================================
  // BEO (BANQUET EVENT ORDER) ALERTS
  // ============================================================================

  const handleBeoAlert = async () => {
    if (!beoData.eventName || !beoData.courseNumber) {
      alert('Fill in event name and course number');
      return;
    }

    try {
      const res = await fetch('/api/echo-chat/beo/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': orgId,
        },
        body: JSON.stringify({
          eventName: beoData.eventName,
          courseNumber: parseInt(beoData.courseNumber),
          fireTime: new Date(),
          details: beoData.notes,
          orgId,
        }),
      });

      const newAlert: HospitalityAlert = {
        id: `beo-${Date.now()}`,
        type: 'beo',
        title: `🔥 Course ${beoData.courseNumber} Fired - ${beoData.eventName}`,
        message: `Table count: ${beoData.tableCount || 'N/A'} | ${beoData.notes}`,
        severity: 'critical',
        data: beoData,
        timestamp: new Date(),
        read: false,
      };

      setAlerts((prev) => [newAlert, ...prev]);
      if (onAlert) onAlert(newAlert);

      setBeoData({ eventName: '', courseNumber: '', tableCount: '', notes: '' });
      setShowBeoForm(false);
    } catch (error) {
      console.error('Failed to create BEO alert:', error);
    }
  };

  // ============================================================================
  // ALLERGEN WARNINGS
  // ============================================================================

  const handleAllergenAlert = async () => {
    if (!allergenData.allergens || !allergenData.tableNumber) {
      alert('Fill in table number and allergens');
      return;
    }

    try {
      const res = await fetch('/api/echo-chat/alerts/allergen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': orgId,
        },
        body: JSON.stringify({
          allergens: allergenData.allergens.split(',').map((a) => a.trim()),
          tableNumber: allergenData.tableNumber,
          orderId: allergenData.orderId,
          orgId,
        }),
      });

      const newAlert: HospitalityAlert = {
        id: `allergen-${Date.now()}`,
        type: 'allergen',
        title: `⚠️ ALLERGEN WARNING - Table ${allergenData.tableNumber}`,
        message: `Allergens: ${allergenData.allergens}`,
        severity: 'critical',
        data: allergenData,
        timestamp: new Date(),
        read: false,
      };

      setAlerts((prev) => [newAlert, ...prev]);
      if (onAlert) onAlert(newAlert);

      setAllergenData({ tableNumber: '', allergens: '', orderId: '' });
      setShowAllergenForm(false);
    } catch (error) {
      console.error('Failed to create allergen alert:', error);
    }
  };

  // ============================================================================
  // INVENTORY ALERTS (Real-time check from system)
  // ============================================================================

  const triggerInventoryAlert = (item: string, quantity: number) => {
    const newAlert: HospitalityAlert = {
      id: `inv-${Date.now()}`,
      type: 'inventory',
      title: `📦 Low Stock Alert - ${item}`,
      message: `Only ${quantity} units remaining. Reorder?`,
      severity: 'warning',
      data: { item, quantity },
      timestamp: new Date(),
      read: false,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    if (onAlert) onAlert(newAlert);
  };

  // ============================================================================
  // SCHEDULE ALERTS (When capacity issues detected)
  // ============================================================================

  const triggerScheduleAlert = (event: string, issue: string) => {
    const newAlert: HospitalityAlert = {
      id: `sched-${Date.now()}`,
      type: 'schedule',
      title: `⏱️ Scheduling Alert - ${event}`,
      message: issue,
      severity: 'warning',
      data: { event, issue },
      timestamp: new Date(),
      read: false,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    if (onAlert) onAlert(newAlert);
  };

  // ============================================================================
  // INCIDENT REPORTS
  // ============================================================================

  const triggerIncidentAlert = (title: string, description: string, severity: 'warning' | 'critical') => {
    const newAlert: HospitalityAlert = {
      id: `incident-${Date.now()}`,
      type: 'incident',
      title: `🚨 ${title}`,
      message: description,
      severity,
      data: { title, description },
      timestamp: new Date(),
      read: false,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    if (onAlert) onAlert(newAlert);
  };

  const getAlertIcon = (type: HospitalityAlert['type']) => {
    switch (type) {
      case 'beo':
        return <Flame className="h-4 w-4 text-red-500" />;
      case 'allergen':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-yellow-500" />;
      case 'schedule':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'incident':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={showBeoForm ? 'default' : 'outline'}
          onClick={() => setShowBeoForm(!showBeoForm)}
          className="gap-2"
        >
          <Flame className="h-3 w-3" />
          Course Fire
        </Button>

        <Button
          size="sm"
          variant={showAllergenForm ? 'default' : 'outline'}
          onClick={() => setShowAllergenForm(!showAllergenForm)}
          className="gap-2"
        >
          <AlertTriangle className="h-3 w-3" />
          Allergen
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => triggerInventoryAlert('Chicken Breast', 5)}
          className="gap-2"
        >
          <Package className="h-3 w-3" />
          Low Stock
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => triggerScheduleAlert('Saturday Dinner', 'Understaffed - need 2 servers')}
          className="gap-2"
        >
          <Clock className="h-3 w-3" />
          Scheduling
        </Button>
      </div>

      {/* BEO Form */}
      {showBeoForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-red-50 dark:bg-red-950">
          <h4 className="font-semibold text-sm">🔥 COURSE FIRE ALERT</h4>
          <Input
            placeholder="Event name (e.g., Johnson Wedding)"
            value={beoData.eventName}
            onChange={(e) => setBeoData({ ...beoData, eventName: e.target.value })}
            className="text-sm"
          />
          <Input
            placeholder="Course number (1, 2, 3...)"
            value={beoData.courseNumber}
            onChange={(e) => setBeoData({ ...beoData, courseNumber: e.target.value })}
            type="number"
            className="text-sm"
          />
          <Input
            placeholder="Table count"
            value={beoData.tableCount}
            onChange={(e) => setBeoData({ ...beoData, tableCount: e.target.value })}
            className="text-sm"
          />
          <Input
            placeholder="Notes (menu items, timing, etc)"
            value={beoData.notes}
            onChange={(e) => setBeoData({ ...beoData, notes: e.target.value })}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleBeoAlert}
              className="bg-red-600 hover:bg-red-700"
            >
              Fire Course
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowBeoForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Allergen Form */}
      {showAllergenForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-yellow-50 dark:bg-yellow-950">
          <h4 className="font-semibold text-sm">⚠️ ALLERGEN WARNING</h4>
          <Input
            placeholder="Table number"
            value={allergenData.tableNumber}
            onChange={(e) => setAllergenData({ ...allergenData, tableNumber: e.target.value })}
            className="text-sm"
          />
          <Input
            placeholder="Allergens (comma separated: nut, shellfish, gluten)"
            value={allergenData.allergens}
            onChange={(e) => setAllergenData({ ...allergenData, allergens: e.target.value })}
            className="text-sm"
          />
          <Input
            placeholder="Order ID (optional)"
            value={allergenData.orderId}
            onChange={(e) => setAllergenData({ ...allergenData, orderId: e.target.value })}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAllergenAlert}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Send Alert
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAllergenForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Alerts Feed */}
      {alerts.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'p-2 rounded-lg text-sm border-l-4 flex gap-2',
                alert.severity === 'critical'
                  ? 'bg-red-50 dark:bg-red-950 border-l-red-500'
                  : 'bg-yellow-50 dark:bg-yellow-950 border-l-yellow-500'
              )}
            >
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <div className="font-semibold">{alert.title}</div>
                <div className="text-xs opacity-75">{alert.message}</div>
                <div className="text-xs opacity-50 mt-1">
                  {alert.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalityAlerts;
