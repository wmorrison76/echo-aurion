import axios from "axios";

interface WebhookEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  status: "pending" | "sent" | "failed";
  retries: number;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  rateLimit: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  headers?: Record<string, string>;
  createdAt: Date;
  lastTriggeredAt?: Date;
  deliverySummary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface WebhookTriggerPayload {
  event: string;
  data: any;
  timestamp: Date;
}

class WebhookService {
  private webhooks: Map<string, Webhook> = new Map();
  private webhookId = 0;
  private eventLog: WebhookEvent[] = [];

  async createWebhook(
    webhook: Omit<Webhook, "id" | "createdAt" | "deliverySummary">,
  ): Promise<Webhook> {
    const response = await axios.post("/api/webhooks", webhook);

    const newWebhook: Webhook = {
      id: `webhook-${this.webhookId++}`,
      ...webhook,
      createdAt: new Date(),
      deliverySummary: {
        total: 0,
        successful: 0,
        failed: 0,
      },
    };

    this.webhooks.set(newWebhook.id, newWebhook);
    return newWebhook;
  }

  async updateWebhook(
    webhookId: string,
    updates: Partial<Webhook>,
  ): Promise<Webhook> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error("Webhook not found");
    }

    await axios.put(`/api/webhooks/${webhookId}`, updates);

    const updated = { ...webhook, ...updates };
    this.webhooks.set(webhookId, updated);
    return updated;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await axios.delete(`/api/webhooks/${webhookId}`);
    this.webhooks.delete(webhookId);
  }

  async testWebhook(
    webhookId: string,
  ): Promise<{ success: boolean; statusCode: number; duration: number }> {
    const response = await axios.post(`/api/webhooks/${webhookId}/test`);
    return response.data;
  }

  async triggerEvent(event: string, data: any): Promise<WebhookEvent> {
    const response = await axios.post("/api/webhooks/trigger", {
      event,
      data,
      timestamp: new Date(),
    });

    const webhookEvent: WebhookEvent = {
      id: response.data.id || `event-${Date.now()}`,
      type: event,
      payload: data,
      timestamp: new Date(),
      status: "pending",
      retries: 0,
    };

    this.eventLog.push(webhookEvent);
    return webhookEvent;
  }

  async getDeliveries(
    webhookId: string,
    options?: { limit?: number; offset?: number; status?: string },
  ): Promise<{ events: WebhookEvent[]; total: number }> {
    const response = await axios.get(`/api/webhooks/${webhookId}/deliveries`, {
      params: options,
    });
    return response.data;
  }

  async retryDelivery(
    eventId: string,
  ): Promise<{ success: boolean; statusCode: number }> {
    const response = await axios.post(`/api/webhooks/retry/${eventId}`);
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<Webhook | undefined> {
    return this.webhooks.get(webhookId);
  }

  async getAllWebhooks(): Promise<Webhook[]> {
    const response = await axios.get("/api/webhooks");
    return response.data.webhooks || Array.from(this.webhooks.values());
  }

  async getEventLog(options?: {
    limit?: number;
    filter?: { event?: string; status?: string };
  }): Promise<WebhookEvent[]> {
    const response = await axios.get("/api/webhooks/events", {
      params: options,
    });
    return response.data.events || this.eventLog.slice(-options?.limit || 50);
  }

  async enableWebhook(webhookId: string): Promise<void> {
    await this.updateWebhook(webhookId, { active: true });
  }

  async disableWebhook(webhookId: string): Promise<void> {
    await this.updateWebhook(webhookId, { active: false });
  }

  async verifyWebhookSignature(
    signature: string,
    payload: string,
    secret: string,
  ): Promise<boolean> {
    const response = await axios.post("/api/webhooks/verify-signature", {
      signature,
      payload,
      secret,
    });
    return response.data.valid || false;
  }

  getLocalWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  getLocalEventLog(): WebhookEvent[] {
    return this.eventLog;
  }
}

let webhookService: WebhookService | null = null;

export function getWebhookService(): WebhookService {
  if (!webhookService) {
    webhookService = new WebhookService();
  }
  return webhookService;
}
