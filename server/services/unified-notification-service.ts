/**
 * Unified Notification Service
 * 
 * TODO-011, TODO-012, TODO-013: Enterprise notification service with:
 * - Delivery guarantees (at-least-once delivery)
 * - Deduplication (prevents duplicate notifications)
 * - Delivery status tracking (sent, delivered, failed, dead_letter)
 * 
 * Uses unified_notifications table from migration 038_unified_notifications.sql
 */

import { getSupabaseServiceClient } from '../lib/supabase-service-client';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export interface UnifiedNotification {
  id: string;
  tenant_id: string;
  recipient_id: string;
  recipient_type: 'user' | 'employee' | 'department' | 'role';
  notification_type: string;
  title?: string;
  message: string;
  channels: string[]; // ['email', 'sms', 'slack', 'push', 'in_app']
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'dead_letter';
  deduplication_key: string;
  delivery_status: Record<string, any>; // Per-channel status
  delivery_attempts: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
  expires_at?: string;
}

export interface SendNotificationRequest {
  tenant_id: string;
  recipient_id: string;
  recipient_type: 'user' | 'employee' | 'department' | 'role';
  notification_type: string;
  title?: string;
  message: string;
  channels: string[];
  priority?: 'critical' | 'high' | 'normal' | 'low';
  deduplication_key?: string; // Optional: if not provided, will be generated
  metadata?: Record<string, any>;
  expires_at?: string;
}

export interface DeliveryStatus {
  channel: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  attempt_count: number;
  last_attempt_at?: string;
  provider_id?: string;
  error_message?: string;
}

/**
 * Unified Notification Service
 */
export class UnifiedNotificationService {
  private readonly MAX_DELIVERY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 5000;

  /**
   * Generate deduplication key from notification content
   */
  private generateDeduplicationKey(request: SendNotificationRequest): string {
    if (request.deduplication_key) {
      return request.deduplication_key;
    }

    // Generate key from notification content
    const canonical = JSON.stringify({
      tenant_id: request.tenant_id,
      recipient_id: request.recipient_id,
      notification_type: request.notification_type,
      message: request.message,
      channels: request.channels.sort().join(','),
    });

    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Check if notification already exists (deduplication)
   * TODO-012: Deduplication
   */
  private async checkDuplicate(deduplicationKey: string, tenantId: string): Promise<UnifiedNotification | null> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('unified_notifications')
        .select('*')
        .eq('deduplication_key', deduplicationKey)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - not a duplicate
          return null;
        }
        logger.error('[UnifiedNotification] Error checking duplicate', { error, deduplication_key: deduplicationKey });
        throw error;
      }

      return data as UnifiedNotification;
    } catch (error) {
      logger.error('[UnifiedNotification] Error checking duplicate', { error, deduplication_key: deduplicationKey });
      throw error;
    }
  }

  /**
   * Send notification with delivery guarantees
   * TODO-011: Delivery guarantees (at-least-once delivery)
   * TODO-012: Deduplication
   * TODO-013: Delivery status tracking
   */
  async sendNotification(request: SendNotificationRequest): Promise<UnifiedNotification> {
    try {
      const deduplicationKey = this.generateDeduplicationKey(request);

      // Check for duplicate (deduplication)
      const existing = await this.checkDuplicate(deduplicationKey, request.tenant_id);
      if (existing) {
        logger.debug('[UnifiedNotification] Duplicate notification detected, returning existing', {
          notification_id: existing.id,
          deduplication_key: deduplicationKey,
        });
        return existing;
      }

      // Create notification record
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const now = new Date().toISOString();

      const notification: Omit<UnifiedNotification, 'id' | 'created_at' | 'updated_at'> = {
        tenant_id: request.tenant_id,
        recipient_id: request.recipient_id,
        recipient_type: request.recipient_type,
        notification_type: request.notification_type,
        title: request.title,
        message: request.message,
        channels: request.channels,
        priority: request.priority || 'normal',
        status: 'pending',
        deduplication_key: deduplicationKey,
        delivery_status: {},
        delivery_attempts: 0,
        metadata: request.metadata || {},
        expires_at: request.expires_at || null,
      };

      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('unified_notifications')
        .insert({
          id: notificationId,
          ...notification,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (error) {
        logger.error('[UnifiedNotification] Failed to create notification', { error });
        throw error;
      }

      const createdNotification = data as UnifiedNotification;

      // Attempt delivery (async, don't await)
      this.attemptDelivery(createdNotification).catch((error) => {
        logger.error('[UnifiedNotification] Delivery attempt failed', {
          error,
          notification_id: createdNotification.id,
        });
      });

      logger.info('[UnifiedNotification] Notification created', {
        notification_id: createdNotification.id,
        recipient_id: request.recipient_id,
        notification_type: request.notification_type,
      });

      return createdNotification;
    } catch (error) {
      logger.error('[UnifiedNotification] Error sending notification', { error });
      throw error;
    }
  }

  /**
   * Attempt delivery of notification
   * TODO-011: Delivery guarantees (retry on failure)
   * TODO-013: Delivery status tracking
   */
  private async attemptDelivery(notification: UnifiedNotification): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      // Update attempt count
      const newAttemptCount = notification.delivery_attempts + 1;
      const deliveryStatus: Record<string, DeliveryStatus> = {
        ...notification.delivery_status,
      };

      // Attempt delivery for each channel
      let allSucceeded = true;
      let allFailed = true;

      for (const channel of notification.channels) {
        try {
          // TODO: Integrate with actual delivery providers (SendGrid, Twilio, Slack, etc.)
          // For now, simulate delivery
          const deliveryResult = await this.deliverToChannel(notification, channel);

          deliveryStatus[channel] = {
            channel,
            status: deliveryResult.success ? 'delivered' : 'failed',
            attempt_count: newAttemptCount,
            last_attempt_at: new Date().toISOString(),
            provider_id: deliveryResult.provider_id,
            error_message: deliveryResult.error_message,
          };

          if (deliveryResult.success) {
            allFailed = false;
          } else {
            allSucceeded = false;
          }
        } catch (error) {
          deliveryStatus[channel] = {
            channel,
            status: 'failed',
            attempt_count: newAttemptCount,
            last_attempt_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : String(error),
          };
          allSucceeded = false;
        }
      }

      // Update notification status
      let newStatus: UnifiedNotification['status'] = notification.status;
      if (allSucceeded) {
        newStatus = 'delivered';
      } else if (allFailed && newAttemptCount >= this.MAX_DELIVERY_ATTEMPTS) {
        newStatus = 'dead_letter';
        // Move to dead letter queue
        await this.addToDeadLetterQueue(notification.id, notification.tenant_id, 'Max delivery attempts exceeded');
      } else {
        newStatus = 'sent'; // Partial success or retry needed
      }

      // Update notification
      const { error: updateError } = await supabase
        .from('unified_notifications')
        .update({
          status: newStatus,
          delivery_status: deliveryStatus,
          delivery_attempts: newAttemptCount,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() }),
        })
        .eq('id', notification.id)
        .eq('tenant_id', notification.tenant_id);

      if (updateError) {
        logger.error('[UnifiedNotification] Failed to update notification status', {
          error: updateError,
          notification_id: notification.id,
        });
        throw updateError;
      }

      // If delivery failed and we haven't exceeded max attempts, retry
      if (!allSucceeded && newAttemptCount < this.MAX_DELIVERY_ATTEMPTS) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, newAttemptCount - 1); // Exponential backoff
        setTimeout(() => {
          this.attemptDelivery(notification).catch((error) => {
            logger.error('[UnifiedNotification] Retry delivery failed', {
              error,
              notification_id: notification.id,
            });
          });
        }, delay);
      }
    } catch (error) {
      logger.error('[UnifiedNotification] Error attempting delivery', {
        error,
        notification_id: notification.id,
      });
      throw error;
    }
  }

  /**
   * Deliver to specific channel (placeholder - integrate with actual providers)
   */
  private async deliverToChannel(
    notification: UnifiedNotification,
    channel: string
  ): Promise<{ success: boolean; provider_id?: string; error_message?: string }> {
    // TODO: Integrate with actual delivery providers
    // - email: SendGrid, AWS SES
    // - sms: Twilio, AWS SNS
    // - slack: Slack API
    // - push: FCM, APNS
    // - in_app: Database/push to client

    // For now, simulate success
    return {
      success: true,
      provider_id: `provider-${channel}-${Date.now()}`,
    };
  }

  /**
   * Add notification to dead letter queue
   */
  private async addToDeadLetterQueue(
    notificationId: string,
    tenantId: string,
    reason: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase
        .from('notification_dead_letter_queue')
        .insert({
          notification_id: notificationId,
          tenant_id: tenantId,
          failure_reason: reason,
          last_attempt_at: new Date().toISOString(),
          retry_count: this.MAX_DELIVERY_ATTEMPTS,
        });

      if (error) {
        logger.error('[UnifiedNotification] Failed to add to dead letter queue', {
          error,
          notification_id: notificationId,
        });
        // Don't throw - dead letter queue failure shouldn't break notification flow
      }
    } catch (error) {
      logger.error('[UnifiedNotification] Error adding to dead letter queue', {
        error,
        notification_id: notificationId,
      });
      // Don't throw - dead letter queue failure shouldn't break notification flow
    }
  }

  /**
   * Get notification delivery status
   * TODO-013: Delivery status tracking
   */
  async getDeliveryStatus(notificationId: string, tenantId: string): Promise<UnifiedNotification | null> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('unified_notifications')
        .select('*')
        .eq('id', notificationId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('[UnifiedNotification] Failed to get delivery status', { error, notification_id: notificationId });
        throw error;
      }

      return data as UnifiedNotification;
    } catch (error) {
      logger.error('[UnifiedNotification] Error getting delivery status', { error, notification_id: notificationId });
      throw error;
    }
  }

  /**
   * Get notifications for recipient
   */
  async getNotificationsForRecipient(
    tenantId: string,
    recipientId: string,
    limit: number = 50
  ): Promise<UnifiedNotification[]> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('unified_notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('[UnifiedNotification] Failed to get notifications', { error, recipient_id: recipientId });
        throw error;
      }

      return (data || []) as UnifiedNotification[];
    } catch (error) {
      logger.error('[UnifiedNotification] Error getting notifications', { error, recipient_id: recipientId });
      throw error;
    }
  }
}

// Singleton instance
export const unifiedNotificationService = new UnifiedNotificationService();
