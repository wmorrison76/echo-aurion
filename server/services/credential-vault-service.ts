/**
 * Credential Vault Service
 * 
 * TODO-027: Centralized credential vault
 * Provides secure storage for integration credentials (POS, payment, etc.)
 * Extends hr_system_credentials pattern to all integrations
 */

import { getSupabaseServiceClient } from '../lib/supabase-service-client';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export interface CredentialEntry {
  id: string;
  tenant_id: string;
  integration_type: string; // 'pos', 'payment', 'hr', 'calendar', etc.
  integration_provider: string; // 'toast', 'square', 'rippling', etc.
  credential_key: string; // 'api_key', 'client_secret', 'access_token', etc.
  credential_value_encrypted: string; // Encrypted credential value
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

/**
 * Simple encryption key (in production, use AWS KMS, HashiCorp Vault, etc.)
 */
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Encrypt credential value
 */
function encryptCredential(value: string): string {
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32), Buffer.alloc(16, 0));
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${encrypted}:${authTag}`;
}

/**
 * Decrypt credential value
 */
function decryptCredential(encrypted: string): string {
  const [encryptedValue, authTag] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32), Buffer.alloc(16, 0));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Credential Vault Service
 */
export class CredentialVaultService {
  /**
   * Store credential
   * TODO-027: Centralized credential vault
   */
  async storeCredential(
    tenantId: string,
    integrationType: string,
    integrationProvider: string,
    credentialKey: string,
    credentialValue: string,
    metadata?: Record<string, any>,
    expiresAt?: string
  ): Promise<string> {
    try {
      const encryptedValue = encryptCredential(credentialValue);
      const credentialId = `cred_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('integration_credentials')
        .insert({
          id: credentialId,
          tenant_id: tenantId,
          integration_type: integrationType,
          integration_provider: integrationProvider,
          credential_key: credentialKey,
          credential_value_encrypted: encryptedValue,
          metadata: metadata || {},
          expires_at: expiresAt || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        logger.error('[CredentialVault] Failed to store credential', { error });
        throw error;
      }

      logger.info('[CredentialVault] Credential stored', {
        credential_id: credentialId,
        integration_type: integrationType,
        integration_provider: integrationProvider,
      });

      return data.id;
    } catch (error) {
      logger.error('[CredentialVault] Error storing credential', { error });
      throw error;
    }
  }

  /**
   * Retrieve credential
   */
  async getCredential(
    tenantId: string,
    integrationType: string,
    integrationProvider: string,
    credentialKey: string
  ): Promise<string | null> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('integration_credentials')
        .select('credential_value_encrypted, expires_at')
        .eq('tenant_id', tenantId)
        .eq('integration_type', integrationType)
        .eq('integration_provider', integrationProvider)
        .eq('credential_key', credentialKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('[CredentialVault] Failed to get credential', { error });
        throw error;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        logger.warn('[CredentialVault] Credential expired', {
          integration_type: integrationType,
          integration_provider: integrationProvider,
          credential_key: credentialKey,
        });
        return null;
      }

      const decryptedValue = decryptCredential(data.credential_value_encrypted);
      return decryptedValue;
    } catch (error) {
      logger.error('[CredentialVault] Error getting credential', { error });
      throw error;
    }
  }

  /**
   * Delete credential
   */
  async deleteCredential(
    tenantId: string,
    integrationType: string,
    integrationProvider: string,
    credentialKey: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase
        .from('integration_credentials')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('integration_type', integrationType)
        .eq('integration_provider', integrationProvider)
        .eq('credential_key', credentialKey);

      if (error) {
        logger.error('[CredentialVault] Failed to delete credential', { error });
        throw error;
      }

      logger.info('[CredentialVault] Credential deleted', {
        integration_type: integrationType,
        integration_provider: integrationProvider,
        credential_key: credentialKey,
      });
    } catch (error) {
      logger.error('[CredentialVault] Error deleting credential', { error });
      throw error;
    }
  }
}

// Singleton instance
export const credentialVaultService = new CredentialVaultService();
