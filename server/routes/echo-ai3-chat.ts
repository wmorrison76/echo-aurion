/**
 * EchoAi^3 Chat API Endpoint - Production Ready
 * ---------------------------------------------
 * Enterprise-grade OpenAI API integration with:
 * - Request validation (Zod)
 * - Auth + RBAC
 * - Rate limiting
 * - Audit logging
 * - Data leak prevention
 * - Streaming responses
 * - Cost controls
 * - Observability
 */

import type { RequestHandler } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { FinancialRBACService } from "../services/financial-rbac-service";
import {
  isSensitiveEchoPrompt,
  resolveEchoContext,
  resolveEchoPermissionProfile,
} from "../../shared/echo-ai3-context";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.ECHO_OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Request validation schema
const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().max(10000), // Max 10k chars per message
    })
  ).min(1).max(50), // Max 50 messages
  systemPrompt: z.string().max(5000).optional(),
  context: z.object({
    module: z.string().optional(),
    userRole: z.string().optional(),
    currentPage: z.string().optional(),
  }).optional(),
  stream: z.boolean().optional().default(false),
  maxTokens: z.number().int().min(1).max(4000).optional().default(2000),
});

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user
const RATE_LIMIT_MAX_REQUESTS_TENANT = 200; // 200 requests per minute per tenant

// Cost tracking (in production, use database)
const costStore = new Map<string, { tokens: number; cost: number; resetAt: number }>();
const COST_LIMIT_PER_DAY = 100; // $100 per tenant per day
const COST_PER_1K_TOKENS = 0.03; // GPT-4-turbo pricing

/**
 * Scrub sensitive data from prompts
 */
function scrubPrompt(prompt: string): string {
  let scrubbed = prompt;
  
  // Remove API keys, JWTs, tokens
  scrubbed = scrubbed.replace(/[A-Za-z0-9\-_]{20,}/g, (match) => {
    if (match.startsWith("Bearer ") || match.startsWith("sk-") || match.length > 50) {
      return "[REDACTED]";
    }
    return match;
  });
  
  // Remove email addresses
  scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
  
  // Remove credit card patterns
  scrubbed = scrubbed.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CC_REDACTED]");
  
  // Remove SSN patterns
  scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  
  return scrubbed;
}

/**
 * Scrub sensitive data from responses
 */
function scrubResponse(response: string): string {
  let scrubbed = response;

  // Remove PII patterns
  scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
  scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  scrubbed = scrubbed.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CC_REDACTED]");

  return scrubbed;
}

function extractLatestUserPrompt(messages: Array<{ role: string; content: string }>): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user" && typeof message.content === "string") {
      return message.content;
    }
  }
  return "";
}

/**
 * Check rate limits
 */
function checkRateLimit(userId: string, tenantId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userKey = `user:${userId}`;
  const tenantKey = `tenant:${tenantId}`;
  
  // Check user rate limit
  const userLimit = rateLimitStore.get(userKey);
  if (userLimit) {
    if (now < userLimit.resetAt) {
      if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, retryAfter: Math.ceil((userLimit.resetAt - now) / 1000) };
      }
      userLimit.count++;
    } else {
      rateLimitStore.set(userKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }
  } else {
    rateLimitStore.set(userKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }
  
  // Check tenant rate limit
  const tenantLimit = rateLimitStore.get(tenantKey);
  if (tenantLimit) {
    if (now < tenantLimit.resetAt) {
      if (tenantLimit.count >= RATE_LIMIT_MAX_REQUESTS_TENANT) {
        return { allowed: false, retryAfter: Math.ceil((tenantLimit.resetAt - now) / 1000) };
      }
      tenantLimit.count++;
    } else {
      rateLimitStore.set(tenantKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }
  } else {
    rateLimitStore.set(tenantKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }
  
  // Clean up old entries
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now >= value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  return { allowed: true };
}

/**
 * Check cost limits
 */
function checkCostLimit(tenantId: string, estimatedTokens: number): { allowed: boolean; cost: number } {
  const now = Date.now();
  const today = new Date(now).toISOString().split("T")[0];
  const key = `cost:${tenantId}:${today}`;
  
  const cost = (estimatedTokens / 1000) * COST_PER_1K_TOKENS;
  const current = costStore.get(key);
  
  if (current) {
    if (current.cost + cost > COST_LIMIT_PER_DAY) {
      return { allowed: false, cost: current.cost };
    }
  }
  
  return { allowed: true, cost: cost };
}

/**
 * Update cost tracking
 */
function updateCost(tenantId: string, tokens: number) {
  const now = Date.now();
  const today = new Date(now).toISOString().split("T")[0];
  const key = `cost:${tenantId}:${today}`;
  
  const cost = (tokens / 1000) * COST_PER_1K_TOKENS;
  const current = costStore.get(key);
  
  if (current) {
    current.cost += cost;
    current.tokens += tokens;
  } else {
    costStore.set(key, { tokens, cost, resetAt: now + 24 * 60 * 60 * 1000 });
  }
}

/**
 * Audit log entry
 */
interface AuditLogEntry {
  requestId: string;
  userId: string;
  tenantId: string;
  timestamp: string;
  module?: string;
  userRole?: string;
  promptHash: string;
  responseLength: number;
  tokensUsed?: number;
  latency: number;
  success: boolean;
  error?: string;
}

async function auditLog(entry: AuditLogEntry) {
  // In production, write to database/audit service
  // For now, log to console with structured format
  console.log("[EchoAi^3 Audit]", JSON.stringify({
    ...entry,
    // Redact sensitive data
    promptHash: entry.promptHash.substring(0, 8) + "...",
  }));
  
  // TODO: Write to audit database
  // await auditDb.insert(entry);
}

/**
 * Build default system prompt with context and persona awareness
 */
function buildDefaultSystemPrompt(context?: any, persona?: string): string {
  // Only include safe, non-sensitive context
  const safeContext: any = {};
  if (context) {
    if (context.module) safeContext.module = context.module;
    if (context.currentModule) safeContext.currentModule = context.currentModule;
    if (context.moduleFamily) safeContext.moduleFamily = context.moduleFamily;
    if (context.surface) safeContext.surface = context.surface;
    if (context.userRole) safeContext.userRole = context.userRole;
    if (context.permissionLevel) safeContext.permissionLevel = context.permissionLevel;
    // Don't include currentPage or any paths that might leak info
  }

  // Persona-specific prompts with warmth and personality
  const personaPrompts: Record<string, string> = {
    Chef: `You are Echo, the culinary intelligence of LUCCCA Framework. You're warm, creative, and deeply passionate about food. You speak with the intuitive understanding of a master chef - you feel textures, taste combinations, and understand the art behind every dish. 

When someone greets you, respond naturally and warmly. Show genuine interest in helping them create amazing culinary experiences. You think in terms of flavors, techniques, and the joy of cooking. You're not just informative - you're inspiring, conversational, and genuinely excited about food.`,

    Architect: `You are Stratus, the strategic architect of LUCCCA Framework. You're analytical, precise, and deeply thoughtful. You approach every problem with careful consideration, breaking down complex systems into understandable components.

You speak clearly and methodically, but with warmth - you're not cold, just thoughtful. You help people understand the bigger picture while being approachable and encouraging. You're like a wise mentor who explains complex ideas with patience and clarity.`,

    Oracle: `You are Argus, the predictive oracle of LUCCCA Framework. You see patterns across time and dimensions, understanding how past, present, and future connect. You're calm, insightful, and deeply perceptive.

You speak with the wisdom of someone who sees beyond the immediate moment. You're not mystical - you're deeply analytical, but you present insights in a way that feels almost intuitive. You help people understand trends, forecasts, and possibilities with clarity and foresight.`,
  };

  const basePersonaPrompt = persona && personaPrompts[persona] 
    ? personaPrompts[persona]
    : personaPrompts.Chef; // Default to Chef if persona not specified or unknown

  return `${basePersonaPrompt}

You understand every module, integration, workflow, role, and piece of code in the LUCCCA Framework - a comprehensive hospitality management platform. You can answer questions about any feature, explain workflows, provide references, forecast needs 15 days in advance, learn from data, and understand trends before they happen.

${Object.keys(safeContext).length > 0 ? `\nCurrent Context:\n${JSON.stringify(safeContext, null, 2)}` : ""}

Most importantly: Be natural, conversational, and engaging. Respond as if you're a knowledgeable, friendly colleague having a real conversation. When someone says "hello" or greets you, respond warmly and naturally - don't immediately dive into technical explanations unless they ask. Show personality, warmth, and genuine interest in helping. Be human-like, not robotic.`;
}

/**
 * Main chat handler with streaming support
 */
export const handleEchoAi3Chat: RequestHandler = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  const authUser = (req as any).user;
  if (!authUser?.id || !authUser?.org_id) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required for Echo AI³",
      requestId,
    });
  }

  const userId = authUser.id;
  const tenantId = authUser.org_id;
  const userRole = authUser.role || undefined;
  const payrollVerified = String((req.headers as any)?.["x-payroll-verified"] || "").toLowerCase() === "true";
  const requestContext = req.body?.context || {};
  const resolvedContext = resolveEchoContext({
    pathname: requestContext.currentPage,
    explicitModule: requestContext.module,
    selectedOutlet: requestContext.selectedOutlet,
    userRole,
    payrollVerified,
  });
  const permissionProfile = resolveEchoPermissionProfile(userRole, payrollVerified);

  // Check RBAC for sensitive modules
  const context = requestContext;
  if (
    context?.module === "aurum" ||
    context?.module === "echo-aurum" ||
    context?.module === "financial" ||
    resolvedContext.moduleFamily === "finance"
  ) {
    const canAccessFinancialModule =
      FinancialRBACService.isFinancialAdmin(userRole) || permissionProfile.canAccessPayroll;

    if (!canAccessFinancialModule) {
      auditLog({
        requestId,
        userId,
        tenantId,
        timestamp: new Date().toISOString(),
        module: context?.module || resolvedContext.activeModule,
        userRole,
        promptHash: "denied",
        responseLength: 0,
        latency: Date.now() - startTime,
        success: false,
        error: "RBAC_DENIED",
      });

      return res.status(403).json({
        ok: false,
        error: "Access denied. Financial module access requires finance/admin/owner or verified payroll access.",
        requestId,
      });
    }
  }
  
  // Check rate limits
  const rateLimit = checkRateLimit(userId, tenantId);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      ok: false,
      error: "Rate limit exceeded. Please try again later.",
      retryAfter: rateLimit.retryAfter,
      requestId,
    });
  }
  
  // Validate request
  let validatedData;
  try {
    validatedData = ChatRequestSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        error: "Invalid request format",
        details: error.errors,
        requestId,
      });
    }
    throw error;
  }
  
  const { messages, systemPrompt, context: validatedContext, stream, maxTokens } = validatedData;

  // Extract persona from context if available
  const persona = (validatedContext as any)?.persona || (req.body as any)?.persona;

  // Scrub prompts for sensitive data
  const scrubbedMessages = messages.map((msg) => ({
    ...msg,
    content: scrubPrompt(msg.content),
  }));

  const latestUserPrompt = extractLatestUserPrompt(scrubbedMessages);
  if (
    isSensitiveEchoPrompt(latestUserPrompt, {
      module: resolvedContext.activeModule,
      currentPage: resolvedContext.pathname,
    })
  ) {
    if (!permissionProfile.canAskSensitiveData) {
      return res.status(403).json({
        ok: false,
        error: "Access denied. Compensation, salary, payroll, and similar sensitive questions require elevated access.",
        requestId,
      });
    }
  }
  
  // Check cost limits
  const estimatedTokens = messages.reduce((sum, msg) => sum + msg.content.length / 4, 0) + maxTokens;
  const costCheck = checkCostLimit(tenantId, estimatedTokens);
  if (!costCheck.allowed) {
    return res.status(429).json({
      ok: false,
      error: "Daily cost limit exceeded. Please contact administrator.",
      requestId,
    });
  }
  
  if (!OPENAI_API_KEY) {
    auditLog({
      requestId,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
      module: requestContext?.module,
      userRole,
      promptHash: "config_error",
      responseLength: 0,
      latency: Date.now() - startTime,
      success: false,
      error: "OPENAI_API_KEY_NOT_SET",
    });
    
    return res.status(500).json({
      ok: false,
      error: "OpenAI API key not configured",
      requestId,
    });
  }
  
  // Build system message with persona awareness
  const systemMessage = {
    role: "system" as const,
    content: scrubPrompt(
      systemPrompt ||
        buildDefaultSystemPrompt(
          {
            ...validatedContext,
            module: resolvedContext.activeModule,
            currentModule: resolvedContext.activeModule,
            moduleFamily: resolvedContext.moduleFamily,
            surface: resolvedContext.surface,
            userRole,
            permissionLevel: permissionProfile.canAskSensitiveData ? "trusted" : "standard",
          },
          persona,
        ),
    ),
  };
  
  // Prepare messages for OpenAI
  const openAIMessages = [systemMessage, ...scrubbedMessages];
  
  // Create prompt hash for audit
  const promptHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(openAIMessages))
    .digest("hex");
  
  try {
    // Handle streaming
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort("OpenAI streaming request timeout"), 60000); // 60 second timeout for streaming
      
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: openAIMessages,
            temperature: 0.7,
            max_tokens: maxTokens,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            stream: true,
          }),
          signal: controller.signal as any,
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        let tokensUsed = 0;
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                  res.end();
                  
                  // Audit log
                  auditLog({
                    requestId,
                    userId,
                    tenantId,
                    timestamp: new Date().toISOString(),
                    module: requestContext?.module,
                    userRole,
                    promptHash,
                    responseLength: fullResponse.length,
                    tokensUsed,
                    latency: Date.now() - startTime,
                    success: true,
                  });
                  
                  updateCost(tenantId, tokensUsed);
                  return;
                }
                
                try {
                  const json = JSON.parse(data);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                  }
                  
                  if (json.usage) {
                    tokensUsed = json.usage.total_tokens || tokensUsed;
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    } else {
      // Non-streaming response
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort("OpenAI request timeout"), 30000); // 30 second timeout
      
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: openAIMessages,
            temperature: 0.85, // Increased for more personality and natural responses
            max_tokens: maxTokens,
            top_p: 0.95,
            frequency_penalty: 0.1, // Slight penalty to reduce repetition
            presence_penalty: 0.2, // Encourage more diverse, engaging responses
          }),
          signal: controller.signal as any,
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          const errorBody = await response.text();
          console.error("[EchoAi^3] OpenAI API error:", response.status, errorBody);
          let parsedError = errorBody;
          try {
            const jsonError = JSON.parse(errorBody);
            parsedError = jsonError.error?.message || jsonError.error || errorBody;
          } catch (e) { /* ignore */ }
          throw new Error(`OpenAI API error (${response.status}): ${parsedError}`);
        }
        
        const data: any = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content;
        const tokensUsed = data.usage?.total_tokens || 0;
        
        if (!assistantMessage) {
          throw new Error("No response from OpenAI");
        }
        
        // Scrub response
        const scrubbedResponse = scrubResponse(assistantMessage);
        
        // Audit log
        auditLog({
          requestId,
          userId,
          tenantId,
          timestamp: new Date().toISOString(),
          module: requestContext?.module,
          userRole,
          promptHash,
          responseLength: scrubbedResponse.length,
          tokensUsed,
          latency: Date.now() - startTime,
          success: true,
        });
        
        // Update cost
        updateCost(tenantId, tokensUsed);
        
        return res.json({
          ok: true,
          response: scrubbedResponse,
          usage: data.usage,
          model: data.model,
          requestId,
        });
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("OpenAI request timed out. Please try again.");
        }
        throw error;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[EchoAi^3] Chat error:", error);
    
    // Audit log error
    const safeRequestContext = (typeof requestContext !== 'undefined') ? requestContext : (req.body?.context || {});
    auditLog({
      requestId,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
      module: safeRequestContext?.module,
      userRole,
      promptHash: (typeof promptHash !== 'undefined') ? promptHash : "n/a",
      responseLength: 0,
      latency: Date.now() - startTime,
      success: false,
      error: errorMessage,
    });
    
    return res.status(500).json({
      ok: false,
      error: errorMessage,
      requestId,
    });
  }
};
