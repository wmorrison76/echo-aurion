/**
 * BEO Execution Service
 * 
 * Handles day-of event execution, real-time status updates,
 * staff assignment tracking, equipment deployment, and issue reporting
 * 
 * Features:
 * - Event timeline execution
 * - Real-time status updates
 * - Staff assignment tracking
 * - Equipment deployment tracking
 * - Guest count updates
 * - Issue reporting and resolution
 * - Post-event analysis
 */

import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';

export interface ChecklistItem {
  id: string;
  beoId: string;
  category: string;
  task: string;
  assignedTo?: string;
  dueDate?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  notes?: string;
  dependencies?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  completedAt?: string;
  completedBy?: string;
}

export interface TimelineEvent {
  id: string;
  beoId: string;
  time: string;
  title: string;
  description: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'delayed';
  assignedTo?: string;
  category: string;
  actualTime?: string;
  notes?: string;
}

export interface RealTimeUpdate {
  id: string;
  beoId: string;
  timestamp: string;
  type: 'status' | 'issue' | 'note' | 'photo';
  message: string;
  author: string;
  authorId: string;
  category: string;
  attachments?: string[];
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PostEventMetric {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export interface BEOExecutionStatus {
  beoId: string;
  eventDate: string;
  isActive: boolean;
  startedAt?: string;
  endedAt?: string;
  checklistProgress: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    percentComplete: number;
  };
  timelineProgress: {
    total: number;
    completed: number;
    upcoming: number;
    delayed: number;
  };
  guestCount: {
    planned: number;
    actual?: number;
    guaranteed: number;
  };
  issues: {
    open: number;
    resolved: number;
    critical: number;
  };
}

class BEOExecutionService {
  /**
   * Get execution status for a BEO
   */
  async getExecutionStatus(beoId: string, orgId: string): Promise<BEOExecutionStatus> {
    try {
      // Fetch BEO details
      const { data: beo, error: beoError } = await supabase
        .from('beo_banquet_orders')
        .select('event_date, guaranteed_guests, guest_count')
        .eq('id', beoId)
        .eq('org_id', orgId)
        .single();

      if (beoError || !beo) {
        throw new Error('BEO not found');
      }

      // Get checklist items
      const checklist = await this.getChecklist(beoId, orgId);
      const checklistProgress = {
        total: checklist.length,
        completed: checklist.filter(i => i.status === 'completed').length,
        inProgress: checklist.filter(i => i.status === 'in-progress').length,
        blocked: checklist.filter(i => i.status === 'blocked').length,
        percentComplete: checklist.length > 0
          ? (checklist.filter(i => i.status === 'completed').length / checklist.length) * 100
          : 0,
      };

      // Get timeline events
      const timeline = await this.getTimeline(beoId, orgId);
      const timelineProgress = {
        total: timeline.length,
        completed: timeline.filter(e => e.status === 'completed').length,
        upcoming: timeline.filter(e => e.status === 'upcoming').length,
        delayed: timeline.filter(e => e.status === 'delayed').length,
      };

      // Get issues
      const updates = await this.getUpdates(beoId, orgId);
      const issues = {
        open: updates.filter(u => u.type === 'issue' && !u.resolved).length,
        resolved: updates.filter(u => u.type === 'issue' && u.resolved).length,
        critical: updates.filter(u => u.type === 'issue' && !u.resolved && u.category === 'critical').length,
      };

      // Check if event is active
      const eventDate = new Date(beo.event_date);
      const now = new Date();
      const isActive = eventDate <= now && eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);

      return {
        beoId,
        eventDate: beo.event_date,
        isActive,
        checklistProgress,
        timelineProgress,
        guestCount: {
          planned: beo.guest_count || 0,
          actual: undefined, // Will be updated during execution
          guaranteed: beo.guaranteed_guests || 0,
        },
        issues,
      };
    } catch (error) {
      logger.error('[BEOExecution] Error getting execution status:', error);
      throw error;
    }
  }

  /**
   * Get checklist items for a BEO
   */
  async getChecklist(beoId: string, orgId: string): Promise<ChecklistItem[]> {
    try {
      const { data, error } = await supabase
        .from('beo_execution_checklist')
        .select('*')
        .eq('beo_id', beoId)
        .eq('org_id', orgId)
        .order('category', { ascending: true })
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });

      if (error) {
        logger.error('[BEOExecution] Error fetching checklist:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        beoId: item.beo_id,
        category: item.category,
        task: item.task,
        assignedTo: item.assigned_to,
        dueDate: item.due_date,
        status: item.status,
        notes: item.notes,
        dependencies: item.dependencies || [],
        priority: item.priority,
        completedAt: item.completed_at,
        completedBy: item.completed_by,
      }));
    } catch (error) {
      logger.error('[BEOExecution] Error getting checklist:', error);
      throw error;
    }
  }

  /**
   * Update checklist item status
   */
  async updateChecklistItem(
    itemId: string,
    updates: Partial<ChecklistItem>,
    userId: string,
    orgId: string
  ): Promise<ChecklistItem> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userId;
      }

      const { data, error } = await supabase
        .from('beo_execution_checklist')
        .update(updateData)
        .eq('id', itemId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) throw error;

      const item = {
        id: data.id,
        beoId: data.beo_id,
        category: data.category,
        task: data.task,
        assignedTo: data.assigned_to,
        dueDate: data.due_date,
        status: data.status,
        notes: data.notes,
        dependencies: data.dependencies || [],
        priority: data.priority,
        completedAt: data.completed_at,
        completedBy: data.completed_by,
      };

      // Broadcast real-time checklist update
      const { beoRealtimeTracker } = await import('./beo-realtime-tracker.js');
      beoRealtimeTracker.broadcastChecklistUpdate(data.beo_id, item);

      // Emit MaestroBQT event
      await this.emitMaestroBQTEvent(data.beo_id, 'checklist_updated', item);

      return item;
    } catch (error) {
      logger.error('[BEOExecution] Error updating checklist item:', error);
      throw error;
    }
  }

  /**
   * Get timeline events for a BEO
   */
  async getTimeline(beoId: string, orgId: string): Promise<TimelineEvent[]> {
    try {
      const { data, error } = await supabase
        .from('beo_execution_timeline')
        .select('*')
        .eq('beo_id', beoId)
        .eq('org_id', orgId)
        .order('time', { ascending: true });

      if (error) {
        logger.error('[BEOExecution] Error fetching timeline:', error);
        return [];
      }

      return (data || []).map(event => ({
        id: event.id,
        beoId: event.beo_id,
        time: event.time,
        title: event.title,
        description: event.description,
        status: event.status,
        assignedTo: event.assigned_to,
        category: event.category,
        actualTime: event.actual_time,
        notes: event.notes,
      }));
    } catch (error) {
      logger.error('[BEOExecution] Error getting timeline:', error);
      throw error;
    }
  }

  /**
   * Update timeline event status
   */
  async updateTimelineEvent(
    eventId: string,
    updates: Partial<TimelineEvent>,
    userId: string,
    orgId: string
  ): Promise<TimelineEvent> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.status === 'completed') {
        updateData.actual_time = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('beo_execution_timeline')
        .update(updateData)
        .eq('id', eventId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) throw error;

      const event = {
        id: data.id,
        beoId: data.beo_id,
        time: data.time,
        title: data.title,
        description: data.description,
        status: data.status,
        assignedTo: data.assigned_to,
        category: data.category,
        actualTime: data.actual_time,
        notes: data.notes,
      };

      // Broadcast real-time timeline update
      const { beoRealtimeTracker } = await import('./beo-realtime-tracker.js');
      beoRealtimeTracker.broadcastTimelineUpdate(data.beo_id, event);

      // Emit MaestroBQT event
      await this.emitMaestroBQTEvent(data.beo_id, 'timeline_updated', event);

      return event;
    } catch (error) {
      logger.error('[BEOExecution] Error updating timeline event:', error);
      throw error;
    }
  }

  /**
   * Get real-time updates for a BEO
   */
  async getUpdates(beoId: string, orgId: string): Promise<RealTimeUpdate[]> {
    try {
      const { data, error } = await supabase
        .from('beo_execution_updates')
        .select('*')
        .eq('beo_id', beoId)
        .eq('org_id', orgId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('[BEOExecution] Error fetching updates:', error);
        return [];
      }

      return (data || []).map(update => ({
        id: update.id,
        beoId: update.beo_id,
        timestamp: update.timestamp,
        type: update.type,
        message: update.message,
        author: update.author,
        authorId: update.author_id,
        category: update.category,
        attachments: update.attachments || [],
        resolved: update.resolved,
        resolvedAt: update.resolved_at,
        resolvedBy: update.resolved_by,
      }));
    } catch (error) {
      logger.error('[BEOExecution] Error getting updates:', error);
      throw error;
    }
  }

  /**
   * Add a real-time update
   */
  async addUpdate(
    beoId: string,
    update: Omit<RealTimeUpdate, 'id' | 'beoId' | 'timestamp'>,
    orgId: string
  ): Promise<RealTimeUpdate> {
    try {
      const { data, error } = await supabase
        .from('beo_execution_updates')
        .insert({
          beo_id: beoId,
          org_id: orgId,
          type: update.type,
          message: update.message,
          author: update.author,
          author_id: update.authorId,
          category: update.category,
          attachments: update.attachments || [],
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const newUpdate: RealTimeUpdate = {
        id: data.id,
        beoId: data.beo_id,
        timestamp: data.timestamp,
        type: data.type,
        message: data.message,
        author: data.author,
        authorId: data.author_id,
        category: data.category,
        attachments: data.attachments || [],
        resolved: data.resolved,
        resolvedAt: data.resolved_at,
        resolvedBy: data.resolved_by,
      };

      // Broadcast real-time update
      const { beoRealtimeTracker } = await import('./beo-realtime-tracker.js');
      if (newUpdate.type === 'issue') {
        beoRealtimeTracker.broadcastIssue(beoId, newUpdate, newUpdate.category === 'critical');
      } else {
        beoRealtimeTracker.broadcastStatus(beoId, { type: 'update', data: newUpdate });
      }

      // Emit MaestroBQT event
      await this.emitMaestroBQTEvent(beoId, 'update_added', newUpdate);

      return newUpdate;
    } catch (error) {
      logger.error('[BEOExecution] Error adding update:', error);
      throw error;
    }
  }

  /**
   * Resolve an issue
   */
  async resolveIssue(
    updateId: string,
    userId: string,
    orgId: string
  ): Promise<RealTimeUpdate> {
    try {
      const { data, error } = await supabase
        .from('beo_execution_updates')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
        })
        .eq('id', updateId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) throw error;

      const update = {
        id: data.id,
        beoId: data.beo_id,
        timestamp: data.timestamp,
        type: data.type,
        message: data.message,
        author: data.author,
        authorId: data.author_id,
        category: data.category,
        attachments: data.attachments || [],
        resolved: data.resolved,
        resolvedAt: data.resolved_at,
        resolvedBy: data.resolved_by,
      };

      // Broadcast real-time issue resolution
      const { beoRealtimeTracker } = await import('./beo-realtime-tracker.js');
      beoRealtimeTracker.broadcastIssue(beoId, update, false);

      // Emit MaestroBQT event
      await this.emitMaestroBQTEvent(update.beoId, 'issue_resolved', update);

      return update;
    } catch (error) {
      logger.error('[BEOExecution] Error resolving issue:', error);
      throw error;
    }
  }

  /**
   * Update guest count
   */
  async updateGuestCount(
    beoId: string,
    actualCount: number,
    userId: string,
    orgId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('beo_banquet_orders')
        .update({
          actual_guest_count: actualCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', beoId)
        .eq('org_id', orgId);

      if (error) throw error;

      // Log as update
      await this.addUpdate(
        beoId,
        {
          type: 'status',
          message: `Guest count updated to ${actualCount}`,
          author: 'System',
          authorId: userId,
          category: 'Service',
        },
        orgId
      );

      // Broadcast real-time guest count update
      const { beoRealtimeTracker } = await import('./beo-realtime-tracker.js');
      const { data: beo } = await supabase
        .from('beo_banquet_orders')
        .select('guest_count, guaranteed_guests')
        .eq('id', beoId)
        .eq('org_id', orgId)
        .single();

      if (beo) {
        beoRealtimeTracker.broadcastGuestCount(beoId, {
          planned: beo.guest_count || 0,
          actual: actualCount,
          guaranteed: beo.guaranteed_guests || 0,
        });

        // Emit MaestroBQT event
        await this.emitMaestroBQTEvent(beoId, 'guest_count_updated', {
          planned: beo.guest_count || 0,
          actual: actualCount,
          guaranteed: beo.guaranteed_guests || 0,
        });
      }
    } catch (error) {
      logger.error('[BEOExecution] Error updating guest count:', error);
      throw error;
    }
  }

  /**
   * Get post-event metrics
   */
  async getPostEventMetrics(beoId: string, orgId: string): Promise<PostEventMetric[]> {
    try {
      // Fetch BEO data
      const { data: beo, error: beoError } = await supabase
        .from('beo_banquet_orders')
        .select('guest_count, actual_guest_count, total_cost, actual_cost')
        .eq('id', beoId)
        .eq('org_id', orgId)
        .single();

      if (beoError || !beo) {
        throw new Error('BEO not found');
      }

      const metrics: PostEventMetric[] = [];

      // Guest count metric
      if (beo.guest_count && beo.actual_guest_count) {
        const variance = beo.actual_guest_count - beo.guest_count;
        metrics.push({
          category: 'Guest Count',
          planned: beo.guest_count,
          actual: beo.actual_guest_count,
          variance,
          variancePercent: (variance / beo.guest_count) * 100,
        });
      }

      // Food cost metric (if available)
      if (beo.total_cost && beo.actual_cost) {
        const variance = beo.actual_cost - beo.total_cost;
        metrics.push({
          category: 'Food Cost',
          planned: beo.total_cost,
          actual: beo.actual_cost,
          variance,
          variancePercent: (variance / beo.total_cost) * 100,
        });
      }

      // Labor hours (would need to calculate from time tracking)
      // This is a placeholder - in production, calculate from actual time tracking data

      return metrics;
    } catch (error) {
      logger.error('[BEOExecution] Error getting post-event metrics:', error);
      throw error;
    }
  }

  /**
   * Start event execution
   */
  async startEvent(beoId: string, userId: string, orgId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('beo_execution_status')
        .upsert({
          beo_id: beoId,
          org_id: orgId,
          is_active: true,
          started_at: new Date().toISOString(),
          started_by: userId,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Log as update
      await this.addUpdate(
        beoId,
        {
          type: 'status',
          message: 'Event execution started',
          author: 'System',
          authorId: userId,
          category: 'General',
        },
        orgId
      );

      // Broadcast real-time update
      const { beoRealtimeTracker } = await import('./beo-realtime-tracker.js');
      const status = await this.getExecutionStatus(beoId, orgId);
      beoRealtimeTracker.broadcastStatus(beoId, status);

      // Emit MaestroBQT event
      await this.emitMaestroBQTEvent(beoId, 'event_started', { status, startedBy: userId });
    } catch (error) {
      logger.error('[BEOExecution] Error starting event:', error);
      throw error;
    }
  }

  /**
   * End event execution
   */
  async endEvent(beoId: string, userId: string, orgId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('beo_execution_status')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          ended_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('beo_id', beoId)
        .eq('org_id', orgId);

      if (error) throw error;

      // Log as update
      await this.addUpdate(
        beoId,
        {
          type: 'status',
          message: 'Event execution completed',
          author: 'System',
          authorId: userId,
          category: 'General',
        },
        orgId
      );

      // Broadcast real-time update
      const { beoRealtimeTracker } = await import('./beo-realtime-tracker.js');
      const status = await this.getExecutionStatus(beoId, orgId);
      beoRealtimeTracker.broadcastStatus(beoId, status);

      // Broadcast post-event metrics
      const metrics = await this.getPostEventMetrics(beoId, orgId);
      beoRealtimeTracker.broadcastMetrics(beoId, metrics);

      // Emit MaestroBQT event
      await this.emitMaestroBQTEvent(beoId, 'event_ended', { status, metrics, endedBy: userId });
    } catch (error) {
      logger.error('[BEOExecution] Error ending event:', error);
      throw error;
    }
  }

  /**
   * Emit MaestroBQT event for cross-module integration
   */
  private async emitMaestroBQTEvent(beoId: string, eventType: string, data: any): Promise<void> {
    try {
      // Try to import MaestroBQT event bus if available
      const maestroEventBus = await import('../../client/modules/MaestroBQT/event-bus.js').catch(() => null);
      
      if (maestroEventBus && maestroEventBus.default) {
        maestroEventBus.default.emit(`beo:execution:${eventType}`, {
          beoId,
          timestamp: new Date().toISOString(),
          data,
        });
        logger.debug('[BEOExecution] MaestroBQT event emitted', { beoId, eventType });
      }

      // Also try to emit to unified event bus
      const { stratusEventEmitter } = await import('../lib/module-event-emitters.js').catch(() => ({ stratusEventEmitter: null }));
      
      if (stratusEventEmitter) {
        // Extract org_id from BEO if available
        const { data: beo } = await supabase
          .from('beo_banquet_orders')
          .select('org_id')
          .eq('id', beoId)
          .single();

        if (beo) {
          await stratusEventEmitter.emit('beo.execution.updated', {
            tenant_id: beo.org_id,
            beo_id: beoId,
            event_type: eventType,
            data,
          }, {
            aggregateId: beoId,
          });
        }
      }
    } catch (error) {
      // Don't fail if event emission fails - it's non-critical
      logger.warn('[BEOExecution] Failed to emit MaestroBQT event', { error, beoId, eventType });
    }
  }
}

export const beoExecutionService = new BEOExecutionService();
