/**
 * Operational Collision Detection (OCD)
 * Detects resource conflicts between concurrent operations
 */

import {
  Operation,
  Resource,
  CollisionDetection,
} from '../../../../shared/types/aurionos';
import { UUID } from '../../../../shared/types/base';

export class CollisionDetector {
  /**
   * Detect collisions between operations
   */
  async detectCollisions(
    operations: Operation[],
    resources: Resource[]
  ): Promise<CollisionDetection[]> {
    const collisions: CollisionDetection[] = [];
    
    // Build resource usage timeline
    const timeline = this.buildTimeline(operations, resources);
    
    // Check each time slot for conflicts
    for (const [timeSlot, usage] of Object.entries(timeline)) {
      const conflicts = this.findConflicts(usage, resources);
      
      if (conflicts.length > 0) {
        collisions.push({
          id: crypto.randomUUID() as UUID,
          detectedAt: new Date().toISOString(),
          severity: this.calculateSeverity(conflicts),
          operations: usage.map((u: any) => u.operationId),
          conflicts,
          resolutions: this.suggestResolutions(conflicts, operations),
          autoResolved: false
        });
      }
    }
    
    return collisions;
  }
  
  /**
   * Build timeline of resource usage
   */
  private buildTimeline(
    operations: Operation[],
    resources: Resource[]
  ): Record<string, Array<{ operationId: UUID; resourceId: UUID; required: number }>> {
    const timeline: Record<string, any[]> = {};
    
    for (const op of operations) {
      const slots = this.getTimeSlots(op.scheduledStart, op.scheduledEnd);
      
      for (const slot of slots) {
        if (!timeline[slot]) timeline[slot] = [];
        
        for (const req of op.requiredResources) {
          timeline[slot].push({
            operationId: op.id,
            resourceId: req.resourceId,
            required: req.required
          });
        }
      }
    }
    
    return timeline;
  }
  
  /**
   * Get time slots between start and end
   */
  private getTimeSlots(start: string, end: string): string[] {
    const slots: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    let current = new Date(startDate);
    while (current <= endDate) {
      slots.push(current.toISOString().slice(0, 13)); // Hour granularity
      current.setHours(current.getHours() + 1);
    }
    
    return slots;
  }
  
  /**
   * Find resource conflicts in a time slot
   */
  private findConflicts(
    usage: Array<{ operationId: UUID; resourceId: UUID; required: number }>,
    resources: Resource[]
  ): Array<{ resourceId: UUID; resourceName: string; required: number; available: number; deficit: number }> {
    const conflicts: any[] = [];
    
    // Group by resource
    const byResource: Record<string, number> = {};
    usage.forEach((u: any) => {
      byResource[u.resourceId] = (byResource[u.resourceId] || 0) + u.required;
    });
    
    // Check each resource
    for (const [resourceId, required] of Object.entries(byResource)) {
      const resource = resources.find((r: Resource) => r.id === resourceId);
      if (!resource) continue;
      
      if (required > resource.available) {
        conflicts.push({
          resourceId,
          resourceName: resource.name,
          required,
          available: resource.available,
          deficit: required - resource.available
        });
      }
    }
    
    return conflicts;
  }
  
  /**
   * Calculate collision severity
   */
  private calculateSeverity(conflicts: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (conflicts.length === 0) return 'low';
    const maxDeficit = Math.max(...conflicts.map((c: any) => (c.deficit / Math.max(c.available, 1))));
    
    if (maxDeficit > 0.5) return 'critical';
    if (maxDeficit > 0.3) return 'high';
    if (maxDeficit > 0.1) return 'medium';
    return 'low';
  }
  
  /**
   * Suggest resolutions
   */
  private suggestResolutions(
    conflicts: any[],
    operations: Operation[]
  ): Array<{ option: string; impact: string; effort: 'low' | 'medium' | 'high' }> {
    return [
      {
        option: 'Reschedule lower priority operation',
        impact: 'Minimal service disruption',
        effort: 'low'
      },
      {
        option: 'Acquire additional resources',
        impact: 'Increased cost',
        effort: 'medium'
      },
      {
        option: 'Reduce scope of conflicting operation',
        impact: 'Service quality reduction',
        effort: 'low'
      }
    ];
  }
}

export const collisionDetector = new CollisionDetector();
