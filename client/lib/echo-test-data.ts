/**
 * Echo System Test Data Generator
 * 
 * Use this to test the Echo AI³ system-aware integration.
 * Run in browser console to simulate module data.
 */

import { echoSystemBridge } from './echo-system-bridge';

export function initializeTestData() {
  console.log('[Echo Test] Initializing test data...');

  // Simulate Culinary module
  echoSystemBridge.publishMetrics({
    module: 'culinary',
    metrics: {
      costPerPlate: 12.50,
      foodCostPercent: 32.1,
      recipesActive: 42,
      daysInventory: 3.2,
      lowStockItems: 3,
    },
    health: 'healthy',
  });

  echoSystemBridge.publishEvent({
    module: 'culinary',
    type: 'cost_update',
    severity: 'info',
    title: 'Food Cost Updated',
    message: 'Food cost percentage now at 32.1% - within target',
    data: { costPercent: 32.1, target: 32 },
  });

  // Simulate Labor module
  echoSystemBridge.publishMetrics({
    module: 'labor',
    metrics: {
      efficiency: 88,
      staffUtilization: 92,
      activeStaff: 24,
      scheduledStaff: 28,
    },
    health: 'healthy',
  });

  echoSystemBridge.publishEvent({
    module: 'labor',
    type: 'efficiency_update',
    severity: 'info',
    title: 'Shift Efficiency',
    message: 'Morning shift reaching 88% efficiency - strong performance',
    data: { efficiency: 88 },
  });

  // Simulate POS module
  echoSystemBridge.publishMetrics({
    module: 'pos',
    metrics: {
      coversToday: 128,
      revenue: 3840,
      bevCost: 28.5,
      avgCheck: 30,
    },
    health: 'healthy',
  });

  echoSystemBridge.publishEvent({
    module: 'pos',
    type: 'daily_update',
    severity: 'info',
    title: 'Daily Service',
    message: '128 covers served today - on pace for 240 by close',
    data: { covers: 128, avgCheck: 30 },
  });

  // Simulate Purchasing module
  echoSystemBridge.publishMetrics({
    module: 'purchasing',
    metrics: {
      pendingOrders: 5,
      expectedDeliveries: 3,
      onTimeRate: 94,
    },
    health: 'healthy',
  });

  // Simulate Forecasting module
  echoSystemBridge.publishMetrics({
    module: 'forecasting',
    metrics: {
      weekendCovers: 320,
      projectedRevenue: 9600,
      confidence: 92,
    },
    health: 'healthy',
  });

  // Simulate Guardian module (monitoring)
  echoSystemBridge.publishMetrics({
    module: 'guardian',
    metrics: {
      alertCount: 0,
      systemHealth: 100,
    },
    health: 'healthy',
  });

  // Simulate Inventory module
  echoSystemBridge.publishMetrics({
    module: 'inventory',
    metrics: {
      parCompliance: 96,
      stockValue: 15430,
      belowParItems: 2,
    },
    health: 'healthy',
  });

  console.log('[Echo Test] Test data published. Check window.__echoSystemBridge.getState()');
}

export function addTestAlert() {
  console.log('[Echo Test] Adding test critical alert...');

  echoSystemBridge.publishEvent({
    module: 'purchasing',
    type: 'delivery_late',
    severity: 'critical',
    title: 'Vendor Delivery Critical',
    message: 'Sysco delivery 2 days late - alternative sourcing activated',
    data: { vendor: 'Sysco', daysLate: 2 },
    actionable: true,
    suggestedAction: 'Contact Sysco immediately or confirm substitute items arrival',
  });
}

export function addTestWarning() {
  console.log('[Echo Test] Adding test warning...');

  echoSystemBridge.publishEvent({
    module: 'culinary',
    type: 'cost_warning',
    severity: 'warning',
    title: 'Food Cost Elevated',
    message: 'Food cost trending toward 34% - monitor portion sizes',
    data: { currentCost: 33.5, target: 32 },
    actionable: true,
    suggestedAction: 'Review high-cost items on current menu mix',
  });
}

export function simulateLiveUpdates() {
  console.log('[Echo Test] Starting live update simulation...');

  let coverId = 0;
  let foodCost = 32.1;

  const interval = setInterval(() => {
    // Update POS covers
    coverId++;
    echoSystemBridge.publishMetrics({
      module: 'pos',
      metrics: {
        coversToday: 128 + coverId,
        revenue: 3840 + coverId * 30,
        bevCost: 28.5,
        avgCheck: 30,
      },
      health: 'healthy',
    });

    // Fluctuate food cost
    if (Math.random() > 0.7) {
      foodCost += (Math.random() - 0.5);
      echoSystemBridge.publishMetrics({
        module: 'culinary',
        metrics: {
          costPerPlate: 12.50,
          foodCostPercent: Math.max(30, Math.min(35, foodCost)),
          recipesActive: 42,
          daysInventory: 3.2,
          lowStockItems: Math.floor(Math.random() * 5),
        },
        health: foodCost > 33 ? 'warning' : 'healthy',
      });
    }

    // Random labor efficiency
    if (Math.random() > 0.8) {
      echoSystemBridge.publishMetrics({
        module: 'labor',
        metrics: {
          efficiency: 85 + Math.random() * 10,
          staffUtilization: 90 + Math.random() * 8,
          activeStaff: 24,
          scheduledStaff: 28,
        },
        health: 'healthy',
      });
    }
  }, 5000);

  return () => {
    clearInterval(interval);
    console.log('[Echo Test] Live update simulation stopped');
  };
}

export function resetSystem() {
  console.log('[Echo Test] Resetting system...');
  echoSystemBridge.reset();
}

// Export as global for easy console access
if (typeof window !== 'undefined') {
  (window as any).__echoTest = {
    init: initializeTestData,
    addAlert: addTestAlert,
    addWarning: addTestWarning,
    simulate: simulateLiveUpdates,
    reset: resetSystem,
    getState: () => echoSystemBridge.getState(),
    getAlerts: () => echoSystemBridge.getActiveAlerts(),
    getEvents: (limit?: number) => echoSystemBridge.getRecentEvents(limit),
  };
}
