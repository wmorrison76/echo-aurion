/**
 * Echo CRM Events Integration - Server Routes
 * Handles webhooks and API endpoints for bidirectional synchronization
 */

import { RequestHandler } from "express";
import { z } from "zod";
import crypto from "crypto";

// Validation schemas
const EchoCRMWebhookSchema = z.object({
  eventType: z.enum(['event.created', 'event.updated', 'event.deleted', 'contract.signed']),
  timestamp: z.string(),
  webhookId: z.string(),
  organizationId: z.string(),
  data: z.object({
    event: z.object({
      id: z.string(),
      crmEventId: z.string(),
      eventName: z.string(),
      eventDate: z.string(),
      eventTime: z.string(),
      venue: z.string(),
      room: z.string(),
      clientName: z.string(),
      clientEmail: z.string(),
      guestCount: z.object({
        expected: z.number(),
        guaranteed: z.number(),
        maximum: z.number()
      }),
      contractStatus: z.enum(['inquiry', 'proposal_sent', 'negotiating', 'signed', 'cancelled']),
      lastModifiedAt: z.string(),
      lastModifiedBy: z.string()
    }),
    changes: z.array(z.object({
      field: z.string(),
      oldValue: z.any(),
      newValue: z.any()
    })).optional(),
    metadata: z.object({
      userId: z.string(),
      userEmail: z.string(),
      source: z.string()
    })
  })
});

const SyncConfigSchema = z.object({
  organizationId: z.string(),
  echoCrmApiUrl: z.string(),
  echoCrmApiKey: z.string(),
  maestroApiUrl: z.string(),
  maestroApiKey: z.string(),
  webhookSecret: z.string(),
  syncDirection: z.enum(['bidirectional', 'echo_to_maestro', 'maestro_to_echo']),
  autoSync: z.boolean(),
  syncInterval: z.number(),
  conflictResolution: z.enum(['echo_wins', 'maestro_wins', 'manual', 'newest_wins'])
});

// In-memory storage for integration data (in production, use a database)
let integrationConfig: any = null;
let syncOperations: any[] = [];
let pendingConflicts: any[] = [];

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const actualSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(actualSignature, 'hex')
  );
}

/**
 * Initialize Echo CRM Events integration
 */
export const initializeIntegration: RequestHandler = async (req, res) => {
  try {
    const config = SyncConfigSchema.parse(req.body);
    
    // Store configuration (in production, save to database)
    integrationConfig = {
      ...config,
      id: `config-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Test connection to Echo CRM
    try {
      const testResponse = await fetch(`${config.echoCrmApiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${config.echoCrmApiKey}`
        }
      });
      
      if (!testResponse.ok) {
        throw new Error(`Echo CRM connection test failed: ${testResponse.status}`);
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Failed to connect to Echo CRM Events API',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    res.status(201).json({
      success: true,
      config: {
        id: integrationConfig.id,
        organizationId: config.organizationId,
        syncDirection: config.syncDirection,
        autoSync: config.autoSync,
        status: 'active'
      }
    });
    
    console.log('Echo CRM Events integration initialized:', config.organizationId);
  } catch (error) {
    res.status(400).json({
      error: 'Invalid configuration',
      details: error instanceof z.ZodError ? error.errors : error
    });
  }
};

/**
 * Get integration status
 */
export const getIntegrationStatus: RequestHandler = (req, res) => {
  if (!integrationConfig) {
    return res.status(404).json({
      error: 'Integration not configured'
    });
  }
  
  const recentOperations = syncOperations
    .filter(op => new Date(op.startedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000))
    .slice(-10);
  
  const stats = {
    totalOperations: syncOperations.length,
    successfulOperations: syncOperations.filter(op => op.status === 'completed').length,
    failedOperations: syncOperations.filter(op => op.status === 'failed').length,
    pendingConflicts: pendingConflicts.length
  };
  
  res.json({
    config: {
      id: integrationConfig.id,
      organizationId: integrationConfig.organizationId,
      syncDirection: integrationConfig.syncDirection,
      autoSync: integrationConfig.autoSync,
      status: integrationConfig.status
    },
    stats,
    recentOperations,
    pendingConflicts: pendingConflicts.map(conflict => ({
      id: conflict.id,
      conflictType: conflict.conflictType,
      status: conflict.status,
      detectedAt: conflict.detectedAt,
      priority: conflict.priority
    }))
  });
};

/**
 * Handle incoming webhook from Echo CRM Events
 */
export const handleEchoCrmWebhook: RequestHandler = async (req, res) => {
  try {
    if (!integrationConfig) {
      return res.status(400).json({
        error: 'Integration not configured'
      });
    }
    
    // Verify webhook signature
    const signature = req.headers['x-echo-signature'] as string;
    if (!signature) {
      return res.status(401).json({
        error: 'Missing webhook signature'
      });
    }
    
    const payload = JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(
      payload,
      signature,
      integrationConfig.webhookSecret
    );
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid webhook signature'
      });
    }
    
    // Validate webhook payload
    const webhookData = EchoCRMWebhookSchema.parse(req.body);
    
    // Process webhook
    const operation = await processEchoCrmWebhook(webhookData);
    syncOperations.push(operation);
    
    res.json({
      success: true,
      operationId: operation.id,
      status: operation.status
    });
    
    console.log('Echo CRM webhook processed:', webhookData.eventType, operation.id);
  } catch (error) {
    console.error('Error processing Echo CRM webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Send webhook to Echo CRM Events (for Maestro updates)
 */
export const sendMaestroWebhook: RequestHandler = async (req, res) => {
  try {
    if (!integrationConfig) {
      return res.status(400).json({
        error: 'Integration not configured'
      });
    }
    
    const { eventType, beoData, changes } = req.body;
    
    // Create webhook payload
    const webhookPayload = {
      eventType,
      timestamp: new Date().toISOString(),
      webhookId: `maestro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: integrationConfig.organizationId,
      data: {
        beo: beoData,
        echoCrmEventId: beoData.echoCrmEventId,
        changes: changes || [],
        metadata: {
          userId: req.body.userId || 'system',
          userEmail: req.body.userEmail || 'system@maestrobanquets.com',
          department: req.body.department || 'kitchen'
        }
      }
    };
    
    // Send webhook to Echo CRM
    const response = await fetch(`${integrationConfig.echoCrmApiUrl}/webhooks/maestro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integrationConfig.echoCrmApiKey}`,
        'X-Maestro-Signature': generateWebhookSignature(
          JSON.stringify(webhookPayload),
          integrationConfig.maestroApiKey
        )
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (!response.ok) {
      throw new Error(`Echo CRM webhook failed: ${response.status} ${response.statusText}`);
    }
    
    const operation = {
      id: `maestro-webhook-${Date.now()}`,
      operationType: 'webhook',
      direction: 'maestro_to_echo',
      sourceSystem: 'maestro_banquets',
      sourceRecordId: beoData.id,
      sourceRecordType: 'beo',
      targetSystem: 'echo_crm',
      targetRecordId: beoData.echoCrmEventId,
      targetRecordType: 'event',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      changes: changes || [],
      triggeredBy: req.body.userId || 'system',
      syncConfigId: integrationConfig.id,
      retryCount: 0,
      maxRetries: 3
    };
    
    syncOperations.push(operation);
    
    res.json({
      success: true,
      operationId: operation.id,
      webhookId: webhookPayload.webhookId
    });
    
    console.log('Maestro webhook sent to Echo CRM:', eventType, operation.id);
  } catch (error) {
    console.error('Error sending Maestro webhook:', error);
    res.status(500).json({
      error: 'Failed to send webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Trigger manual sync
 */
export const triggerSync: RequestHandler = async (req, res) => {
  try {
    if (!integrationConfig) {
      return res.status(400).json({
        error: 'Integration not configured'
      });
    }
    
    const { direction = 'echo_to_maestro' } = req.body;
    
    // Simulate sync operation
    const operation = {
      id: `manual-sync-${Date.now()}`,
      operationType: 'sync',
      direction,
      sourceSystem: direction === 'echo_to_maestro' ? 'echo_crm' : 'maestro_banquets',
      sourceRecordType: 'batch',
      targetSystem: direction === 'echo_to_maestro' ? 'maestro_banquets' : 'echo_crm',
      targetRecordType: 'batch',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      changes: [],
      triggeredBy: req.body.userId || 'manual',
      syncConfigId: integrationConfig.id,
      retryCount: 0,
      maxRetries: 3
    };
    
    syncOperations.push(operation);
    
    res.json({
      success: true,
      operation,
      summary: {
        created: 2,
        updated: 3,
        deleted: 0,
        conflicted: 1
      }
    });
    
    console.log('Manual sync triggered:', direction, operation.id);
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({
      error: 'Failed to trigger sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Resolve conflict
 */
export const resolveConflict: RequestHandler = async (req, res) => {
  try {
    const { conflictId } = req.params;
    const { resolution, customData } = req.body;
    
    const conflict = pendingConflicts.find(c => c.id === conflictId);
    if (!conflict) {
      return res.status(404).json({
        error: 'Conflict not found'
      });
    }
    
    // Mark conflict as resolved
    conflict.status = 'resolved';
    conflict.resolution = {
      resolvedBy: req.body.userId || 'system',
      resolvedAt: new Date().toISOString(),
      resolutionMethod: resolution,
      customResolution: customData
    };
    
    // Create operation record
    const operation = {
      id: `conflict-resolution-${Date.now()}`,
      operationType: 'conflict_resolution',
      direction: 'bidirectional',
      sourceSystem: 'maestro_banquets',
      sourceRecordType: 'conflict',
      sourceRecordId: conflictId,
      targetSystem: 'echo_crm',
      targetRecordType: 'conflict',
      targetRecordId: conflictId,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      changes: [{
        field: 'conflict_resolution',
        oldValue: 'pending',
        newValue: resolution
      }],
      triggeredBy: req.body.userId || 'system',
      syncConfigId: integrationConfig?.id,
      retryCount: 0,
      maxRetries: 1
    };
    
    syncOperations.push(operation);
    
    res.json({
      success: true,
      conflict,
      operationId: operation.id
    });
    
    console.log('Conflict resolved:', conflictId, resolution);
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({
      error: 'Failed to resolve conflict',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get sync operations history
 */
export const getSyncHistory: RequestHandler = (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  const paginatedOperations = syncOperations
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(Number(offset), Number(offset) + Number(limit));
  
  res.json({
    operations: paginatedOperations,
    total: syncOperations.length,
    limit: Number(limit),
    offset: Number(offset)
  });
};

// Helper functions

async function processEchoCrmWebhook(webhookData: any) {
  const operation = {
    id: `echo-webhook-${Date.now()}`,
    operationType: getOperationTypeFromWebhook(webhookData.eventType),
    direction: 'echo_to_maestro',
    sourceSystem: 'echo_crm',
    sourceRecordId: webhookData.data.event.crmEventId,
    sourceRecordType: 'event',
    targetSystem: 'maestro_banquets',
    targetRecordType: 'event',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    changes: webhookData.data.changes || [],
    triggeredBy: webhookData.data.metadata.userId,
    syncConfigId: integrationConfig.id,
    retryCount: 0,
    maxRetries: 3
  };
  
  // Simulate processing based on event type
  switch (webhookData.eventType) {
    case 'event.created':
      // Would create new calendar event in Maestro
      console.log('Processing new Echo CRM event:', webhookData.data.event.eventName);
      break;
    case 'event.updated':
      // Would update existing calendar event in Maestro
      console.log('Processing Echo CRM event update:', webhookData.data.event.eventName);
      break;
    case 'event.deleted':
      // Would mark calendar event as deleted in Maestro
      console.log('Processing Echo CRM event deletion:', webhookData.data.event.eventName);
      break;
    case 'contract.signed':
      // Would trigger BEO creation in Maestro
      console.log('Processing contract signing for:', webhookData.data.event.eventName);
      break;
  }
  
  return operation;
}

function getOperationTypeFromWebhook(eventType: string): string {
  const typeMap: Record<string, string> = {
    'event.created': 'create',
    'event.updated': 'update',
    'event.deleted': 'delete',
    'contract.signed': 'update'
  };
  return typeMap[eventType] || 'update';
}

function generateWebhookSignature(payload: string, secret: string): string {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

export default initializeIntegration;
