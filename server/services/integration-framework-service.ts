/**
 * Integration Framework Service
 * Provides unified integration management, credential vault, sync scheduler, and webhook framework
 * 
 * Features:
 * - Credential vault interface (HashiCorp Vault or AWS Secrets Manager)
 * - Unified sync scheduler
 * - Integration registry
 * - Webhook framework
 * - Standardized integration pattern
 */

import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Integration Types
 */
export type IntegrationProvider = "aws_secrets_manager" | "hashicorp_vault" | "supabase_vault";
export type IntegrationStatus = "active" | "inactive" | "error";
export type SyncFrequency = "realtime" | "hourly" | "daily" | "weekly" | "manual";

export interface Integration {
  id: string;
  orgId: string;
  name: string;
  displayName: string;
  description?: string;
  provider: string; // e.g., "square", "toast", "gusto", "sysco"
  type: string; // e.g., "pos", "payroll", "supplier"
  status: IntegrationStatus;
  config: Record<string, any>; // Integration-specific configuration
  credentialsId?: string; // Reference to credential vault
  lastSyncAt?: string;
  nextSyncAt?: string;
  syncFrequency: SyncFrequency;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: string;
  orgId: string;
  integrationId: string;
  key: string; // Credential key (e.g., "api_key", "access_token")
  value: string; // Encrypted credential value
  encrypted: boolean;
  provider?: IntegrationProvider; // Vault provider
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  integrationId: string;
  orgId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
  recordsProcessed?: number;
  metadata?: Record<string, any>;
}

export interface Webhook {
  id: string;
  orgId: string;
  integrationId: string;
  url: string;
  events: string[]; // e.g., ["order.created", "payment.completed"]
  secret?: string; // Webhook secret for signature verification
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Credential Vault Service
 */
export class CredentialVault {
  private encryptionKey: Buffer;
  private vaultProvider: IntegrationProvider;

  constructor(provider: IntegrationProvider = "supabase_vault") {
    this.vaultProvider = provider;
    // In production, use environment variable or key management service
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY || randomBytes(32).toString("hex");
    this.encryptionKey = Buffer.from(key.slice(0, 32), "hex");
  }

  /**
   * Store credential
   */
  async storeCredential(
    orgId: string,
    integrationId: string,
    key: string,
    value: string,
  ): Promise<string> {
    try {
      // Encrypt credential
      const encrypted = this.encrypt(value);

      // Store in vault (Supabase by default, can be extended for other providers)
      const { data, error } = await supabase
        .from("integration_credentials")
        .insert({
          org_id: orgId,
          integration_id: integrationId,
          key,
          value: encrypted,
          encrypted: true,
          provider: this.vaultProvider,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      logger.info("[CredentialVault] Credential stored", { credentialId: data.id, key });
      return data.id;
    } catch (error) {
      logger.error("[CredentialVault] Failed to store credential", { error, key });
      throw error;
    }
  }

  /**
   * Retrieve credential
   */
  async retrieveCredential(credentialId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("integration_credentials")
        .select("value, encrypted")
        .eq("id", credentialId)
        .single();

      if (error || !data) return null;

      // Decrypt credential
      if (data.encrypted) {
        return this.decrypt(data.value);
      }

      return data.value;
    } catch (error) {
      logger.error("[CredentialVault] Failed to retrieve credential", { error, credentialId });
      return null;
    }
  }

  /**
   * Encrypt value
   */
  private encrypt(value: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", this.encryptionKey, iv);
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  }

  /**
   * Decrypt value
   */
  private decrypt(encryptedValue: string): string {
    const [ivHex, encrypted] = encryptedValue.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}

/**
 * Sync Scheduler Service
 */
export class SyncScheduler {
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule sync for integration
   */
  scheduleSync(integrationId: string, frequency: SyncFrequency, syncFn: () => Promise<void>): void {
    // Clear existing timer
    if (this.syncTimers.has(integrationId)) {
      clearInterval(this.syncTimers.get(integrationId)!);
    }

    let interval: number;
    switch (frequency) {
      case "realtime":
        // Realtime sync - run immediately and on events
        syncFn();
        return;

      case "hourly":
        interval = 60 * 60 * 1000; // 1 hour
        break;

      case "daily":
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;

      case "weekly":
        interval = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;

      case "manual":
        // Manual sync - no automatic scheduling
        return;

      default:
        interval = 60 * 60 * 1000; // Default: hourly
    }

    // Schedule periodic sync
    const timer = setInterval(async () => {
      try {
        await syncFn();
      } catch (error) {
        logger.error("[SyncScheduler] Sync failed", { error, integrationId });
      }
    }, interval);

    this.syncTimers.set(integrationId, timer);
    logger.info("[SyncScheduler] Sync scheduled", { integrationId, frequency });
  }

  /**
   * Cancel sync for integration
   */
  cancelSync(integrationId: string): void {
    if (this.syncTimers.has(integrationId)) {
      clearInterval(this.syncTimers.get(integrationId)!);
      this.syncTimers.delete(integrationId);
      logger.info("[SyncScheduler] Sync cancelled", { integrationId });
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(integrationId: string, syncFn: () => Promise<void>): Promise<void> {
    try {
      await syncFn();
      logger.info("[SyncScheduler] Manual sync triggered", { integrationId });
    } catch (error) {
      logger.error("[SyncScheduler] Manual sync failed", { error, integrationId });
      throw error;
    }
  }
}

/**
 * Webhook Framework Service
 */
export class WebhookFramework {
  /**
   * Register webhook
   */
  async registerWebhook(
    orgId: string,
    integrationId: string,
    url: string,
    events: string[],
  ): Promise<Webhook> {
    try {
      // Generate webhook secret
      const secret = randomBytes(32).toString("hex");

      const { data, error } = await supabase
        .from("integration_webhooks")
        .insert({
          org_id: orgId,
          integration_id: integrationId,
          url,
          events,
          secret,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      logger.info("[WebhookFramework] Webhook registered", { webhookId: data.id, url });
      return {
        id: data.id,
        orgId: data.org_id,
        integrationId: data.integration_id,
        url: data.url,
        events: data.events,
        secret: data.secret,
        active: data.active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      logger.error("[WebhookFramework] Failed to register webhook", { error, url });
      throw error;
    }
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(webhook: Webhook, event: string, payload: Record<string, any>): Promise<boolean> {
    if (!webhook.active) {
      logger.warn("[WebhookFramework] Webhook is inactive", { webhookId: webhook.id });
      return false;
    }

    if (!webhook.events.includes(event)) {
      logger.debug("[WebhookFramework] Event not subscribed", {
        webhookId: webhook.id,
        event,
      });
      return false;
    }

    try {
      // Generate webhook signature
      const signature = this.generateSignature(JSON.stringify(payload), webhook.secret || "");

      // Send webhook
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-Webhook-Signature": signature,
          "X-Webhook-Id": webhook.id,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.info("[WebhookFramework] Webhook triggered", {
          webhookId: webhook.id,
          event,
          status: response.status,
        });
        return true;
      } else {
        logger.warn("[WebhookFramework] Webhook failed", {
          webhookId: webhook.id,
          event,
          status: response.status,
        });
        return false;
      }
    } catch (error) {
      logger.error("[WebhookFramework] Webhook error", { error, webhookId: webhook.id, event });
      return false;
    }
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = createHash("sha256").update(payload + secret).digest("hex");
    return hmac;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return signature === expectedSignature;
  }
}

/**
 * Integration Framework Service
 */
export class IntegrationFrameworkService {
  private credentialVault: CredentialVault;
  private syncScheduler: SyncScheduler;
  private webhookFramework: WebhookFramework;

  constructor() {
    this.credentialVault = new CredentialVault();
    this.syncScheduler = new SyncScheduler();
    this.webhookFramework = new WebhookFramework();
  }

  /**
   * Register integration
   */
  async registerIntegration(
    orgId: string,
    name: string,
    provider: string,
    type: string,
    config: Record<string, any>,
    credentials?: Record<string, string>,
  ): Promise<Integration> {
    try {
      // Store credentials if provided
      let credentialsId: string | undefined;
      if (credentials) {
        const credentialIds: string[] = [];
        for (const [key, value] of Object.entries(credentials)) {
          const credentialId = await this.credentialVault.storeCredential(orgId, "", key, value);
          credentialIds.push(credentialId);
        }
        // Store credential IDs reference (simplified - in production, use a proper reference)
        credentialsId = credentialIds.join(",");
      }

      const { data, error } = await supabase
        .from("integrations")
        .insert({
          org_id: orgId,
          name,
          display_name: name,
          provider,
          type,
          status: "active",
          config,
          credentials_id: credentialsId,
          sync_frequency: "hourly",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule sync
      this.syncScheduler.scheduleSync(data.id, "hourly", async () => {
        await this.performSync(data.id);
      });

      logger.info("[IntegrationFramework] Integration registered", { integrationId: data.id, name });
      return {
        id: data.id,
        orgId: data.org_id,
        name: data.name,
        displayName: data.display_name,
        description: data.description || undefined,
        provider: data.provider,
        type: data.type,
        status: data.status,
        config: data.config,
        credentialsId: data.credentials_id || undefined,
        lastSyncAt: data.last_sync_at || undefined,
        nextSyncAt: data.next_sync_at || undefined,
        syncFrequency: data.sync_frequency,
        metadata: data.metadata || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      logger.error("[IntegrationFramework] Failed to register integration", { error, name });
      throw error;
    }
  }

  /**
   * Perform sync for integration
   */
  private async performSync(integrationId: string): Promise<void> {
    // Implementation depends on integration type
    logger.info("[IntegrationFramework] Performing sync", { integrationId });
    // In production, implement actual sync logic based on integration type
  }
}

// Export singleton instance
export const integrationFrameworkService = new IntegrationFrameworkService();
export const credentialVault = new CredentialVault();
export const syncScheduler = new SyncScheduler();
export const webhookFramework = new WebhookFramework();
