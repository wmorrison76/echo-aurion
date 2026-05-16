import express from "express";
import crypto from "crypto";
import axios from "axios";

const router = express.Router();

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

interface WebhookEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  status: "pending" | "sent" | "failed";
  retries: number;
}

const webhooks: Map<string, Webhook> = new Map();
const events: WebhookEvent[] = [];
let webhookCounter = 0;

router.get("/", (req, res) => {
  const webhooksList = Array.from(webhooks.values());
  res.json({ webhooks: webhooksList });
});

router.post("/", (req, res) => {
  try {
    const {
      name,
      url,
      events: eventTypes,
      secret,
      active,
      rateLimit,
      retryPolicy,
    } = req.body;

    if (!name || !url || !eventTypes || eventTypes.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing required fields: name, url, events" });
    }

    const webhook: Webhook = {
      id: `webhook-${webhookCounter++}`,
      name,
      url,
      events: eventTypes,
      secret: secret || `secret_${Math.random().toString(36).substr(2, 16)}`,
      active: active !== false,
      rateLimit: rateLimit || 100,
      retryPolicy: retryPolicy || {
        maxRetries: 3,
        backoffMultiplier: 2,
      },
      createdAt: new Date(),
      deliverySummary: {
        total: 0,
        successful: 0,
        failed: 0,
      },
    };

    webhooks.set(webhook.id, webhook);

    res.status(201).json(webhook);
  } catch (error) {
    console.error("Create webhook error:", error);
    res.status(500).json({
      error: "Failed to create webhook",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.put("/:webhookId", (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = webhooks.get(webhookId);

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const updates = req.body;
    const updated = {
      ...webhook,
      ...updates,
      id: webhook.id,
      createdAt: webhook.createdAt,
    };
    webhooks.set(webhookId, updated);

    res.json(updated);
  } catch (error) {
    console.error("Update webhook error:", error);
    res.status(500).json({
      error: "Failed to update webhook",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.delete("/:webhookId", (req, res) => {
  try {
    const { webhookId } = req.params;

    if (!webhooks.has(webhookId)) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    webhooks.delete(webhookId);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete webhook error:", error);
    res.status(500).json({
      error: "Failed to delete webhook",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/:webhookId/test", async (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = webhooks.get(webhookId);

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const startTime = Date.now();

    try {
      await axios.post(
        webhook.url,
        {
          event: "test.webhook",
          timestamp: new Date(),
          test: true,
        },
        {
          timeout: 10000,
          headers: webhook.headers || {},
        },
      );

      const duration = Date.now() - startTime;

      webhook.deliverySummary.total++;
      webhook.deliverySummary.successful++;
      webhook.lastTriggeredAt = new Date();

      res.json({
        success: true,
        statusCode: 200,
        duration,
      });
    } catch (error) {
      webhook.deliverySummary.total++;
      webhook.deliverySummary.failed++;

      const statusCode = axios.isAxiosError(error)
        ? error.response?.status || 0
        : 0;
      const duration = Date.now() - startTime;

      res.status(400).json({
        success: false,
        statusCode,
        duration,
        error:
          error instanceof Error ? error.message : "Failed to deliver webhook",
      });
    }
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({
      error: "Failed to test webhook",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/trigger", async (req, res) => {
  try {
    const { event, data, timestamp } = req.body;

    if (!event) {
      return res.status(400).json({ error: "Missing event type" });
    }

    const relevantWebhooks = Array.from(webhooks.values()).filter(
      (w) => w.active && w.events.includes(event),
    );

    if (relevantWebhooks.length === 0) {
      return res.json({
        id: `event-${Date.now()}`,
        event,
        delivered: 0,
        failed: 0,
      });
    }

    const eventId = `event-${Date.now()}`;
    const payload = {
      id: eventId,
      event,
      data,
      timestamp: timestamp || new Date(),
    };

    const deliveryPromises = relevantWebhooks.map(async (webhook) => {
      try {
        await axios.post(webhook.url, payload, {
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": generateSignature(
              JSON.stringify(payload),
              webhook.secret,
            ),
            ...webhook.headers,
          },
        });

        webhook.deliverySummary.successful++;
        return { success: true };
      } catch (error) {
        webhook.deliverySummary.failed++;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        webhook.deliverySummary.total++;
        webhook.lastTriggeredAt = new Date();
      }
    });

    await Promise.allSettled(deliveryPromises);

    const webhookEvent: WebhookEvent = {
      id: eventId,
      type: event,
      payload: data,
      timestamp: new Date(),
      status: "sent",
      retries: 0,
    };

    events.push(webhookEvent);

    res.json({
      id: eventId,
      event,
      delivered: relevantWebhooks.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Trigger event error:", error);
    res.status(500).json({
      error: "Failed to trigger event",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/:webhookId/deliveries", (req, res) => {
  try {
    const { webhookId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;

    const webhook = webhooks.get(webhookId);
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    let filtered = events;
    if (status) {
      filtered = filtered.filter((e) => e.status === status);
    }

    const total = filtered.length;
    const paged = filtered.slice(
      Number(offset),
      Number(offset) + Number(limit),
    );

    res.json({
      events: paged,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("Get deliveries error:", error);
    res.status(500).json({
      error: "Failed to get deliveries",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/retry/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    event.retries++;
    event.status = "pending";

    res.json({
      success: true,
      statusCode: 202,
      eventId,
      retries: event.retries,
    });
  } catch (error) {
    console.error("Retry delivery error:", error);
    res.status(500).json({
      error: "Failed to retry delivery",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/events", (req, res) => {
  try {
    const { limit = 50, filter } = req.query;

    let filtered = events;

    if (filter && typeof filter === "object") {
      const filterObj = filter as any;
      if (filterObj.event) {
        filtered = filtered.filter((e) => e.type === filterObj.event);
      }
      if (filterObj.status) {
        filtered = filtered.filter((e) => e.status === filterObj.status);
      }
    }

    const result = filtered.slice(-Number(limit));

    res.json({
      events: result,
      total: events.length,
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      error: "Failed to get events",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/verify-signature", (req, res) => {
  try {
    const { signature, payload, secret } = req.body;

    const expectedSignature = generateSignature(payload, secret);
    const valid = signature === expectedSignature;

    res.json({ valid });
  } catch (error) {
    console.error("Verify signature error:", error);
    res.status(500).json({
      error: "Failed to verify signature",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export default router;
