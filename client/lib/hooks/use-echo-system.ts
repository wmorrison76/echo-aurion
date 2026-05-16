/**
 * useEchoSystem Hook
 * 
 * Provides Echo with real-time awareness of all system operations,
 * metrics, and alerts from all modules.
 */

import { useEffect, useState, useCallback } from 'react';
import { echoSystemBridge, SystemEvent, SystemState, ModuleMetrics, ModuleType } from '@/lib/echo-system-bridge';

export interface UseEchoSystemResult {
  // State
  systemState: SystemState | null;
  recentEvents: SystemEvent[];
  activeAlerts: SystemEvent[];
  systemHealth: 'healthy' | 'warning' | 'critical';
  
  // Methods
  publishEvent: (event: Omit<SystemEvent, 'id' | 'timestamp'>) => void;
  publishMetrics: (metrics: Omit<ModuleMetrics, 'timestamp'>) => void;
  getModuleAlerts: (module: ModuleType) => SystemEvent[];
  
  // Helpers
  getAwarenessText: () => string;
  shouldAlertUser: () => boolean;
}

export function useEchoSystem(): UseEchoSystemResult {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [recentEvents, setRecentEvents] = useState<SystemEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SystemEvent[]>([]);

  // Subscribe to system state changes
  useEffect(() => {
    const unsubscribe = echoSystemBridge.onStateChange((state) => {
      setSystemState(state);
      setActiveAlerts(echoSystemBridge.getActiveAlerts());
    });

    // Initial state
    setSystemState(echoSystemBridge.getState());
    setActiveAlerts(echoSystemBridge.getActiveAlerts());

    return unsubscribe;
  }, []);

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = echoSystemBridge.onEvent((event) => {
      setRecentEvents(prev => [event, ...prev].slice(0, 50));
    });

    // Initial events
    setRecentEvents(echoSystemBridge.getRecentEvents());

    return unsubscribe;
  }, []);

  const systemHealth = systemState?.globalMetrics.systemHealth || 'healthy';

  // Generate awareness text from recent events
  const getAwarenessText = useCallback((): string => {
    if (!recentEvents.length) {
      return 'All systems nominal — monitoring 11 operational modules';
    }

    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      return `⚠ ${criticalAlerts.length} CRITICAL ALERT${criticalAlerts.length > 1 ? 'S' : ''} — ${criticalAlerts[0].message}`;
    }

    const recentEvent = recentEvents[0];
    if (recentEvent) {
      const moduleName = recentEvent.module.charAt(0).toUpperCase() + recentEvent.module.slice(1);
      return `${moduleName}: ${recentEvent.message}`;
    }

    return 'System operational — monitoring all modules';
  }, [recentEvents, activeAlerts]);

  // Determine if user should be alerted
  const shouldAlertUser = useCallback((): boolean => {
    return activeAlerts.length > 0 && activeAlerts.some(a => a.severity === 'critical');
  }, [activeAlerts]);

  return {
    systemState,
    recentEvents,
    activeAlerts,
    systemHealth,
    publishEvent: (event) => echoSystemBridge.publishEvent(event),
    publishMetrics: (metrics) => echoSystemBridge.publishMetrics(metrics),
    getModuleAlerts: (module) => echoSystemBridge.getModuleAlerts(module),
    getAwarenessText,
    shouldAlertUser,
  };
}

/**
 * Helper hook for modules to publish metrics to Echo
 * 
 * Usage in Culinary, Labor, etc.:
 * const { publishMetrics } = useEchoMetrics('culinary');
 * publishMetrics({ metrics: { cost: 32.5, recipes: 42 }, health: 'healthy' });
 */
export function useEchoMetrics(module: ModuleType) {
  const publishMetrics = useCallback((metrics: Omit<ModuleMetrics, 'timestamp' | 'module'>) => {
    echoSystemBridge.publishMetrics({
      module,
      ...metrics,
    });
  }, [module]);

  const publishEvent = useCallback((event: Omit<SystemEvent, 'id' | 'timestamp' | 'module'>) => {
    echoSystemBridge.publishEvent({
      module,
      ...event,
    });
  }, [module]);

  return { publishMetrics, publishEvent };
}
