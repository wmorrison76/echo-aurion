/**
 * Echo AI³ System Bridge
 * 
 * Centralized event and state management for system-wide awareness.
 * All modules publish their operations, metrics, and alerts here.
 * Echo subscribes to this bridge to maintain real-time system knowledge.
 */

export type ModuleType = 
  | 'culinary' 
  | 'pastry' 
  | 'labor' 
  | 'purchasing' 
  | 'inventory'
  | 'pos'
  | 'forecasting'
  | 'guardian'
  | 'vendors'
  | 'whiteboard'
  | 'calendar';

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface SystemEvent {
  id: string;
  timestamp: number;
  module: ModuleType;
  type: string; // e.g., 'metric_update', 'alert', 'action_complete', 'error'
  severity: EventSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionable?: boolean;
  suggestedAction?: string;
}

export interface ModuleMetrics {
  module: ModuleType;
  timestamp: number;
  metrics: Record<string, number | string>;
  health: 'healthy' | 'warning' | 'critical';
}

export interface SystemState {
  modules: Record<ModuleType, {
    active: boolean;
    lastUpdate: number;
    metrics: Record<string, any>;
    alerts: SystemEvent[];
  }>;
  globalMetrics: {
    activeOperations: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    lastUpdate: number;
  };
}

type EventSubscriber = (event: SystemEvent) => void;
type MetricsSubscriber = (metrics: ModuleMetrics) => void;
type StateSubscriber = (state: SystemState) => void;

class EchoSystemBridge {
  private eventSubscribers: Set<EventSubscriber> = new Set();
  private metricsSubscribers: Set<MetricsSubscriber> = new Set();
  private stateSubscribers: Set<StateSubscriber> = new Set();
  
  private state: SystemState = {
    modules: {
      culinary: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      pastry: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      labor: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      purchasing: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      inventory: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      pos: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      forecasting: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      guardian: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      vendors: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      whiteboard: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
      calendar: { active: false, lastUpdate: 0, metrics: {}, alerts: [] },
    },
    globalMetrics: {
      activeOperations: 0,
      systemHealth: 'healthy',
      lastUpdate: Date.now(),
    },
  };

  private recentEvents: SystemEvent[] = [];
  private maxRecentEvents = 50;

  /**
   * Publish an event from a module
   */
  publishEvent(event: Omit<SystemEvent, 'id' | 'timestamp'>) {
    const fullEvent: SystemEvent = {
      ...event,
      id: `${event.module}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    this.recentEvents.unshift(fullEvent);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.pop();
    }

    // Update module state
    const moduleState = this.state.modules[event.module];
    if (moduleState) {
      moduleState.lastUpdate = Date.now();
      moduleState.active = true;
      
      if (event.severity === 'critical') {
        moduleState.alerts.push(fullEvent);
        // Keep only last 10 alerts per module
        if (moduleState.alerts.length > 10) {
          moduleState.alerts = moduleState.alerts.slice(-10);
        }
      }
    }

    // Notify subscribers
    this.eventSubscribers.forEach(sub => {
      try {
        sub(fullEvent);
      } catch (err) {
        console.warn('[Echo Bridge] Event subscriber error:', err);
      }
    });

    // Notify state subscribers
    this.notifyStateSubscribers();
  }

  /**
   * Publish metrics from a module
   */
  publishMetrics(metrics: Omit<ModuleMetrics, 'timestamp'>) {
    const fullMetrics: ModuleMetrics = {
      ...metrics,
      timestamp: Date.now(),
    };

    // Update module state
    const moduleState = this.state.modules[metrics.module];
    if (moduleState) {
      moduleState.metrics = metrics.metrics;
      moduleState.lastUpdate = Date.now();
      moduleState.active = true;
    }

    // Update global health
    this.updateGlobalHealth();

    // Notify subscribers
    this.metricsSubscribers.forEach(sub => {
      try {
        sub(fullMetrics);
      } catch (err) {
        console.warn('[Echo Bridge] Metrics subscriber error:', err);
      }
    });

    // Notify state subscribers
    this.notifyStateSubscribers();
  }

  /**
   * Subscribe to system events
   */
  onEvent(callback: EventSubscriber): () => void {
    this.eventSubscribers.add(callback);
    return () => this.eventSubscribers.delete(callback);
  }

  /**
   * Subscribe to module metrics
   */
  onMetrics(callback: MetricsSubscriber): () => void {
    this.metricsSubscribers.add(callback);
    return () => this.metricsSubscribers.delete(callback);
  }

  /**
   * Subscribe to overall system state
   */
  onStateChange(callback: StateSubscriber): () => void {
    this.stateSubscribers.add(callback);
    return () => this.stateSubscribers.delete(callback);
  }

  /**
   * Get current system state
   */
  getState(): SystemState {
    return structuredClone(this.state);
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit = 20): SystemEvent[] {
    return this.recentEvents.slice(0, limit);
  }

  /**
   * Get alerts for a specific module
   */
  getModuleAlerts(module: ModuleType): SystemEvent[] {
    return this.state.modules[module]?.alerts || [];
  }

  /**
   * Get all active alerts across system
   */
  getActiveAlerts(): SystemEvent[] {
    const alerts: SystemEvent[] = [];
    Object.values(this.state.modules).forEach(m => {
      alerts.push(...m.alerts);
    });
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Update global system health based on module states
   */
  private updateGlobalHealth() {
    let criticalCount = 0;
    let warningCount = 0;
    let activeCount = 0;

    Object.values(this.state.modules).forEach(m => {
      if (m.active) activeCount++;
      if (m.alerts.some(a => a.severity === 'critical')) criticalCount++;
      if (m.alerts.some(a => a.severity === 'warning')) warningCount++;
    });

    this.state.globalMetrics.activeOperations = activeCount;
    this.state.globalMetrics.systemHealth = 
      criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy';
    this.state.globalMetrics.lastUpdate = Date.now();
  }

  /**
   * Notify all state subscribers
   */
  private notifyStateSubscribers() {
    const state = this.getState();
    this.stateSubscribers.forEach(sub => {
      try {
        sub(state);
      } catch (err) {
        console.warn('[Echo Bridge] State subscriber error:', err);
      }
    });
  }

  /**
   * Reset all state (useful for testing)
   */
  reset() {
    Object.keys(this.state.modules).forEach(key => {
      const module = key as ModuleType;
      this.state.modules[module] = {
        active: false,
        lastUpdate: 0,
        metrics: {},
        alerts: [],
      };
    });
    this.recentEvents = [];
    this.updateGlobalHealth();
    this.notifyStateSubscribers();
  }
}

// Global singleton instance
export const echoSystemBridge = new EchoSystemBridge();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__echoSystemBridge = echoSystemBridge;
}
