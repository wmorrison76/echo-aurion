/**
 * HR System Sync API
 * Handles OAuth flows, sync orchestration, credential management
 * Supports ADP, Gusto, OnTrack, Unfocus
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  HRSyncOrchestrator,
  ADPAdapter,
  GustoAdapter,
  OnTrackAdapter,
  UnfocusAdapter,
} from '../integrations/hr-sync-engine';

// Helper functions for encryption (basic implementation)
const encryptData = (data: string): string => Buffer.from(data).toString('base64');
const decryptData = (data: string): string => Buffer.from(data, 'base64').toString('utf-8');

const router = Router();

// Initialize Supabase
let supabase: any;
try {
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  } else {
    // Provide a stub client for development without Supabase
    supabase = {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        eq: function() { return this; },
        single: function() { return this; },
      }),
    };
  }
} catch (err) {
  // Fallback stub if createClient fails
  console.warn('[HR-SYNC] Supabase initialization failed, using stub');
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: function() { return this; },
      single: function() { return this; },
    }),
  };
}

// Validation schemas
const ConfigureHRSystemSchema = z.object({
  system_type: z.enum(['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS']),
  api_endpoint: z.string().url(),
  api_key: z.string().min(10),
  api_secret: z.string().optional(),
  username: z.string().optional(),
});

const OAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
  system_type: z.enum(['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS']),
});

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

/**
 * POST /api/hr-sync/configure
 * Configure HR system credentials
 */
router.post('/configure', async (req: Request, res: Response) => {
  try {
    const validated = ConfigureHRSystemSchema.parse(req.body);
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Encrypt credentials
    const encryptedKey = encryptData(validated.api_key);
    const encryptedSecret = validated.api_secret
      ? encryptData(validated.api_secret)
      : undefined;

    // Check if already configured
    const { data: existing } = await supabase
      .from('hr_system_credentials')
      .select('id')
      .eq('org_id', orgId)
      .eq('system_type', validated.system_type)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('hr_system_credentials')
        .update({
          api_endpoint: validated.api_endpoint,
          api_key_encrypted: encryptedKey,
          api_secret_encrypted: encryptedSecret,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('hr_system_credentials')
        .insert([
          {
            org_id: orgId,
            system_type: validated.system_type,
            api_endpoint: validated.api_endpoint,
            api_key_encrypted: encryptedKey,
            api_secret_encrypted: encryptedSecret,
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json({
      success: true,
      system: result.system_type,
      message: 'Credentials configured. Ready for authentication.',
    });
  } catch (error) {
    console.error('[HR Sync] Configure error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Configuration failed',
    });
  }
});

/**
 * GET /api/hr-sync/oauth-url
 * Get OAuth authorization URL
 */
router.get('/oauth-url', async (req: Request, res: Response) => {
  try {
    const { system_type } = req.query;
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!system_type || !['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS'].includes(system_type as string)) {
      return res.status(400).json({ error: 'Invalid system type' });
    }

    const { data: creds, error: credsError } = await supabase
      .from('hr_system_credentials')
      .select('*')
      .eq('org_id', orgId)
      .eq('system_type', system_type)
      .single();

    if (credsError || !creds) {
      return res.status(404).json({ error: 'HR system not configured' });
    }

    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/hr-sync/oauth-callback`;

    let oauthUrl = '';
    switch (system_type) {
      case 'ADP': {
        const adapter = new ADPAdapter(creds, supabase);
        oauthUrl = await adapter.getOAuthUrl(callbackUrl);
        break;
      }
      case 'GUSTO': {
        const adapter = new GustoAdapter(creds, supabase);
        oauthUrl = await adapter.getOAuthUrl(callbackUrl);
        break;
      }
      default:
        return res.status(400).json({ error: 'OAuth not supported for this system' });
    }

    res.json({ oauth_url: oauthUrl });
  } catch (error) {
    console.error('[HR Sync] OAuth URL error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate OAuth URL',
    });
  }
});

/**
 * POST /api/hr-sync/oauth-callback
 * Handle OAuth callback
 */
router.post('/oauth-callback', async (req: Request, res: Response) => {
  try {
    const validated = OAuthCallbackSchema.parse(req.body);
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify state
    const { data: creds, error: credsError } = await supabase
      .from('hr_system_credentials')
      .select('*')
      .eq('org_id', orgId)
      .eq('system_type', validated.system_type)
      .single();

    if (credsError || !creds) {
      return res.status(404).json({ error: 'HR system not configured' });
    }

    if (creds.oauth_state !== validated.state) {
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }

    let success = false;
    let error_msg = '';

    try {
      switch (validated.system_type) {
        case 'ADP': {
          const adapter = new ADPAdapter(creds, supabase);
          await adapter.exchangeOAuthCode(validated.code);
          success = true;
          break;
        }
        case 'GUSTO': {
          const adapter = new GustoAdapter(creds, supabase);
          const clientSecret = process.env.GUSTO_CLIENT_SECRET || '';
          await adapter.exchangeOAuthCode(validated.code, clientSecret);
          success = true;
          break;
        }
        default:
          error_msg = 'OAuth not supported for this system';
      }
    } catch (err) {
      error_msg = err instanceof Error ? err.message : 'OAuth exchange failed';
    }

    if (success) {
      res.json({
        success: true,
        system: validated.system_type,
        message: 'Successfully authenticated',
      });
    } else {
      res.status(400).json({ error: error_msg });
    }
  } catch (error) {
    console.error('[HR Sync] OAuth callback error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'OAuth callback failed',
    });
  }
});

// ============================================
// SYNC ENDPOINTS
// ============================================

/**
 * POST /api/hr-sync/sync-now
 * Trigger immediate sync
 */
router.post('/sync-now', async (req: Request, res: Response) => {
  try {
    const { system_type } = req.body;
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!system_type || !['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS'].includes(system_type)) {
      return res.status(400).json({ error: 'Invalid system type' });
    }

    const orchestrator = new HRSyncOrchestrator(orgId, supabase);
    const result = await orchestrator.syncFromHR(system_type as any);

    res.json({
      success: result.success,
      records_affected: result.recordsAffected,
      records_created: result.recordsCreated,
      records_updated: result.recordsUpdated,
      synced_at: result.syncedAt,
      duration_ms: result.duration,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[HR Sync] Sync now error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
});

/**
 * POST /api/hr-sync/sync-full-cycle
 * Sync employees + payroll/schedules
 */
router.post('/sync-full-cycle', async (req: Request, res: Response) => {
  try {
    const { system_type } = req.body;
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!system_type || !['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS'].includes(system_type)) {
      return res.status(400).json({ error: 'Invalid system type' });
    }

    const orchestrator = new HRSyncOrchestrator(orgId, supabase);
    const result = await orchestrator.syncFullCycle(system_type as any);

    res.json({
      success: result.success,
      records_affected: result.recordsAffected,
      records_created: result.recordsCreated,
      records_updated: result.recordsUpdated,
      synced_at: result.syncedAt,
      duration_ms: result.duration,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[HR Sync] Full cycle sync error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Full cycle sync failed',
    });
  }
});

/**
 * GET /api/hr-sync/status
 * Get sync status for all systems
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: credentials } = await supabase
      .from('hr_system_credentials')
      .select('system_type, is_active, updated_at')
      .eq('org_id', orgId);

    const { data: logs } = await supabase
      .from('sync_logs')
      .select('system_type, action, status, records_affected, started_at')
      .eq('org_id', orgId)
      .order('started_at', { ascending: false })
      .limit(4);

    const status = ['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS'].map((system) => {
      const config = credentials?.find((c) => c.system_type === system);
      const lastSync = logs?.find((l) => l.system_type === system);

      return {
        system: system,
        configured: !!config,
        is_active: config?.is_active || false,
        last_sync: lastSync?.started_at,
        last_status: lastSync?.status,
        records_affected: lastSync?.records_affected,
      };
    });

    res.json({ status });
  } catch (error) {
    console.error('[HR Sync] Status error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

/**
 * GET /api/hr-sync/sync-logs
 * Get sync history
 */
router.get('/sync-logs', async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.org_id;
    const { system_type, limit = '50' } = req.query;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let query = supabase
      .from('sync_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('started_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (system_type && ['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS'].includes(system_type as string)) {
      query = query.eq('system_type', system_type);
    }

    const { data } = await query;

    res.json({ logs: data || [] });
  } catch (error) {
    console.error('[HR Sync] Logs error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get logs',
    });
  }
});

/**
 * DELETE /api/hr-sync/credentials/:system_type
 * Remove HR system credentials
 */
router.delete('/credentials/:system_type', async (req: Request, res: Response) => {
  try {
    const { system_type } = req.params;
    const orgId = req.user?.org_id;

    if (!orgId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!['ADP', 'GUSTO', 'ONTRACK', 'UNFOCUS'].includes(system_type)) {
      return res.status(400).json({ error: 'Invalid system type' });
    }

    const { error } = await supabase
      .from('hr_system_credentials')
      .delete()
      .eq('org_id', orgId)
      .eq('system_type', system_type);

    if (error) throw error;

    res.json({ success: true, message: `${system_type} credentials removed` });
  } catch (error) {
    console.error('[HR Sync] Delete credentials error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete credentials',
    });
  }
});

export default router;
