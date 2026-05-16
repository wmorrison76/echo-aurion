/**
 * ALICE (Asset/Logistics Integration & Compliance Engine)
 * Facilities Management System Integration
 *
 * Connects to external FM/CMMS systems for maintenance requests,
 * work order management, and asset tracking.
 */

export interface ALICEAsset {
  id: string;
  name: string;
  space: string;
  category: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  lastMaintenance?: string;
  nextScheduled?: string;
}

export interface ALICEWorkOrder {
  id: string;
  assetId: string;
  type: string;
  description: string;
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startTime: string;
  endTime?: string;
  assignedTo?: string;
  notes?: string;
}

export interface ALICEMaintenanceRequest {
  space: string;
  workType: string;
  description: string;
  startTime: string;
  endTime: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  externalCompany?: string;
}

export interface ALICESubmitResponse {
  success: boolean;
  workOrderId?: string;
  message: string;
  estimatedDuration?: number;
  conflictingEvents?: Array<{
    eventId: string;
    title: string;
    conflictType: 'overlap' | 'buffer-violation';
  }>;
}

export interface ALICEAvailabilityCheck {
  available: boolean;
  space: string;
  startTime: string;
  endTime: string;
  conflicts: Array<{
    type: 'event' | 'maintenance' | 'closure';
    title: string;
    time: string;
    severity: 'info' | 'warning' | 'error';
  }>;
  bufferMinutes: number;
}

// Mock ALICE API client (to be replaced with real API calls when credentials available)
export class ALICEClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    // In production, these would come from environment variables
    this.baseURL = process.env.ALICE_API_URL || 'https://api.alice-fm.com';
    this.apiKey = process.env.ALICE_API_KEY || 'mock-key';
  }

  /**
   * Check asset availability for maintenance in a given time window
   */
  async checkAvailability(
    space: string,
    startTime: string,
    endTime: string,
    bufferMinutes: number = 90
  ): Promise<ALICEAvailabilityCheck> {
    try {
      // Mock implementation - replace with actual API call when credentials are available
      return {
        available: true,
        space,
        startTime,
        endTime,
        conflicts: [],
        bufferMinutes,
      };
    } catch (error) {
      console.error('Error checking ALICE availability:', error);
      throw error;
    }
  }

  /**
   * Get list of assets in a space
   */
  async getAssetsInSpace(space: string): Promise<ALICEAsset[]> {
    try {
      // Mock implementation with common hospitality venue assets
      const mockAssets: ALICEAsset[] = [
        {
          id: 'hvac-001',
          name: 'Main HVAC System',
          space,
          category: 'HVAC',
          status: 'operational',
          lastMaintenance: '2025-01-15',
          nextScheduled: '2025-04-15',
        },
        {
          id: 'elec-001',
          name: 'Main Electrical Panel',
          space,
          category: 'Electrical',
          status: 'operational',
          lastMaintenance: '2024-12-01',
          nextScheduled: '2025-06-01',
        },
        {
          id: 'plumb-001',
          name: 'Kitchen Plumbing',
          space,
          category: 'Plumbing',
          status: 'operational',
          lastMaintenance: '2025-01-08',
        },
        {
          id: 'light-001',
          name: 'Lighting System',
          space,
          category: 'Lighting',
          status: 'operational',
          lastMaintenance: '2024-11-20',
          nextScheduled: '2025-05-20',
        },
      ];

      return mockAssets;
    } catch (error) {
      console.error('Error getting ALICE assets:', error);
      throw error;
    }
  }

  /**
   * Submit maintenance work order to ALICE
   */
  async submitWorkOrder(
    request: ALICEMaintenanceRequest
  ): Promise<ALICESubmitResponse> {
    try {
      // First check availability
      const availability = await this.checkAvailability(
        request.space,
        request.startTime,
        request.endTime
      );

      if (!availability.available) {
        return {
          success: false,
          message: 'Space not available for maintenance during requested time',
          conflictingEvents: availability.conflicts.map((c) => ({
            eventId: `evt-${Date.now()}`,
            title: c.title,
            conflictType: c.type === 'event' ? 'overlap' : 'buffer-violation',
          })),
        };
      }

      // Mock work order creation
      const workOrderId = `WO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        workOrderId,
        message: `Work order created successfully: ${workOrderId}`,
        estimatedDuration: Math.ceil(
          (new Date(request.endTime).getTime() -
            new Date(request.startTime).getTime()) /
            (1000 * 60)
        ),
      };
    } catch (error) {
      console.error('Error submitting ALICE work order:', error);
      throw error;
    }
  }

  /**
   * Get active work orders for a space
   */
  async getWorkOrders(space: string): Promise<ALICEWorkOrder[]> {
    try {
      // Mock work orders
      const mockOrders: ALICEWorkOrder[] = [
        {
          id: 'wo-001',
          assetId: 'hvac-001',
          type: 'HVAC Maintenance',
          description: 'Quarterly HVAC system inspection',
          status: 'scheduled',
          priority: 'medium',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)
            .toISOString(),
          assignedTo: 'HVAC Contractor ABC',
          notes: 'Routine maintenance, minimal disruption expected',
        },
      ];

      return mockOrders;
    } catch (error) {
      console.error('Error getting ALICE work orders:', error);
      throw error;
    }
  }

  /**
   * Get work order status
   */
  async getWorkOrderStatus(workOrderId: string): Promise<ALICEWorkOrder | null> {
    try {
      // Mock status lookup
      const workOrder: ALICEWorkOrder = {
        id: workOrderId,
        assetId: 'hvac-001',
        type: 'HVAC Maintenance',
        description: 'Quarterly HVAC system inspection',
        status: 'scheduled',
        priority: 'medium',
        startTime: new Date().toISOString(),
        assignedTo: 'HVAC Contractor ABC',
      };

      return workOrder;
    } catch (error) {
      console.error('Error getting ALICE work order status:', error);
      throw error;
    }
  }

  /**
   * Cancel a work order
   */
  async cancelWorkOrder(
    workOrderId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return {
        success: true,
        message: `Work order ${workOrderId} cancelled: ${reason}`,
      };
    } catch (error) {
      console.error('Error cancelling ALICE work order:', error);
      throw error;
    }
  }

  /**
   * Get maintenance history for an asset
   */
  async getAssetHistory(assetId: string): Promise<ALICEWorkOrder[]> {
    try {
      // Mock history
      const history: ALICEWorkOrder[] = [
        {
          id: 'wo-history-001',
          assetId,
          type: 'Preventive Maintenance',
          description: 'Monthly system check',
          status: 'completed',
          priority: 'medium',
          startTime: '2025-01-15T10:00:00Z',
          endTime: '2025-01-15T12:00:00Z',
          assignedTo: 'John Smith',
          notes: 'All systems functioning normally',
        },
        {
          id: 'wo-history-002',
          assetId,
          type: 'Corrective Maintenance',
          description: 'Filter replacement',
          status: 'completed',
          priority: 'low',
          startTime: '2024-12-20T14:00:00Z',
          endTime: '2024-12-20T15:00:00Z',
          assignedTo: 'Jane Doe',
          notes: 'Filter replaced, system efficiency improved',
        },
      ];

      return history;
    } catch (error) {
      console.error('Error getting ALICE asset history:', error);
      throw error;
    }
  }

  /**
   * Health check for ALICE API
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    message: string;
    timestamp: string;
  }> {
    try {
      return {
        status: 'ok',
        message: 'ALICE API is reachable',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error checking ALICE health:', error);
      return {
        status: 'error',
        message: 'ALICE API is unreachable',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Singleton instance
export const aliceClient = new ALICEClient();
