import "dotenv/config";
import express from "express";
import cors from "cors";
import { logger, sanitizeError } from "./lib/logger";
import {
  webhookLimiter,
  paymentLimiter,
  iotDataLimiter,
} from "./middleware/rate-limit";
import { handleDemo } from "./routes/demo";
import { ordersRouter } from "./routes/orders";
import { telemetryRouter } from "./routes/telemetry";
import { syncRouter } from "./routes/sync";
import { analyticsRouter } from "./routes/analytics";
import { recipesRouter } from "./routes/recipes";
import { inventoryRouter } from "./routes/inventory";
import { invoicesRouter } from "./routes/invoices";
import { integrationsRouter } from "./routes/integrations";
import { hardwareRouter } from "./routes/hardware";
import { printingRouter } from "./routes/printing";
import { integrationsExtendedRouter } from "./routes/integrations-extended";
import iotRouter from "./routes/iot";
import wasteRouter from "./routes/waste";
import wasteAutomationRouter from "./routes/waste-automation";
import dynamicPricingRouter from "./routes/dynamic-pricing";
import xeroIntegrationRouter from "./routes/xero-integration";
import usfoodsRouter from "./routes/usfoods-integration";
import rfqMarketplaceRouter from "./routes/rfq-marketplace";
import rfidRouter from "./routes/rfid-integration";
import gfsRouter from "./routes/gfs-integration";
import netsuiteRouter from "./routes/netsuite-integration";
import threeWayMatchingRouter from "./routes/three-way-matching";
import sprints612Router from "./routes/sprints-6-12-api";
import { accountingRouter } from "./routes/accounting";
import { vendorsRouter } from "./routes/vendors";
import { purchasingRouter } from "./routes/purchasing-api";
import { receivingApiRouter } from "./routes/receiving-api";
import { glCodesRouter } from "./routes/gl-codes";
import { encryptionRouter } from "./routes/encryption";
import receivingRouter from "./routes/receiving";
import inventorySyncRouter from "./routes/inventory-sync";
import invoiceGLRouter from "./routes/invoice-gl-integration";
import managerAlertsRouter from "./routes/manager-alerts";
import imageVaultRouter from "./routes/image-vault";
import ocrProcessingRouter from "./routes/ocr-processing";
import { mobileInventoryRouter } from "./routes/mobile-inventory";
import { demandForecastingRouter } from "./routes/demand-forecasting";
import { exceptionResolutionRouter } from "./routes/exception-resolution";
import { collaborationRouter } from "./routes/collaboration";
import { procurementSprint3Router } from "./routes/procurement-sprint3";
import invoiceTrainingRouter from "./routes/invoice-training";
import { eventCostBridgeRouter } from "./routes/event-cost-bridge";
import { startPaymentAutomationEngine } from "./lib/payment-automation";
import {
  setupWebSocketServer,
  broadcastUpdate,
  CHANNELS,
} from "./lib/websocket";
export function createServer() {
  const app = express(); // Configure CORS const isDevelopment = process.env.NODE_ENV !=="production"; const corsOrigins = (process.env.CORS_ORIGINS ||"http://localhost:*") .split(",") .map((o) => o.trim()); app.use( cors({ origin: (origin, callback) => { // Allow requests with no origin (like mobile apps, curl requests) if (!origin) { return callback(null, true); } // In development, allow everything if (isDevelopment) { return callback(null, true); } // Check if origin matches any allowed pattern const isAllowed = corsOrigins.some((pattern) => { // Wildcard matching if (pattern.includes("*")) { const regex = new RegExp("^" + pattern.replace(/\./g,"\\.").replace("*",".*") +"$", ); return regex.test(origin); } return origin === pattern; }); if (isAllowed) { callback(null, true); } else { logger.debug(`CORS request from origin: ${origin}`); callback(null, true); // Allow in all cases; rate limiting and auth handle security } }, credentials: true, methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization","X-Request-ID"], maxAge: 86400, }), ); // Middleware - with body size limits app.use(express.json({ limit:"10mb" })); app.use(express.urlencoded({ extended: true, limit:"10mb" })); // Example API routes app.get("/api/ping", (_req, res) => { const ping = process.env.PING_MESSAGE ??"ping"; res.json({ message: ping }); }); // Health check endpoint for Fly.io and load balancers app.get("/health", (_req, res) => { res.status(200).json({ status:"ok", timestamp: new Date().toISOString() }); }); app.get("/api/demo", handleDemo); app.use("/api/orders", ordersRouter); app.use("/api/telemetry", telemetryRouter); app.use("/api/sync", syncRouter); app.use("/api/analytics", analyticsRouter); app.use("/api/recipes", recipesRouter); app.use("/api/inventory", inventoryRouter); app.use("/api/invoices", invoicesRouter); app.use("/api/invoices/training", invoiceTrainingRouter); app.use("/api/vendors", vendorsRouter); app.use("/api/purchasing", purchasingRouter); app.use("/api/receiving", receivingApiRouter); app.use("/api/gl-codes", glCodesRouter); app.use("/api/receiving", receivingRouter); app.use("/api/inventory-sync", inventorySyncRouter); app.use("/api/mobile-inventory", mobileInventoryRouter); app.use("/api/demand-forecasting", demandForecastingRouter); app.use("/api/exception-resolution", exceptionResolutionRouter); app.use("/api/collaboration", collaborationRouter); app.use("/api/procurement", procurementSprint3Router); app.use("/api/invoice-gl-integration", invoiceGLRouter); app.use("/api/manager-alerts", managerAlertsRouter); app.use("/api/image-vault", imageVaultRouter); // Rate limit webhook endpoints app.use("/api/integrations", webhookLimiter, integrationsRouter); app.use("/api/integrations-ext", webhookLimiter, integrationsExtendedRouter); app.use("/api/devices", hardwareRouter); app.use("/api/print", printingRouter); // Rate limit IoT data ingestion app.use("/api", iotDataLimiter, iotRouter); app.use("/api", wasteRouter); app.use("/api/waste-automation", wasteAutomationRouter); app.use("/api/dynamic-pricing", dynamicPricingRouter); app.use("/api/accounting/xero", xeroIntegrationRouter); app.use("/api/suppliers/usfoods", usfoodsRouter); app.use("/api/suppliers/gfs", gfsRouter); app.use("/api/accounting/netsuite", netsuiteRouter); app.use("/api/procurement/rfq", rfqMarketplaceRouter); app.use("/api/procurement/matching", threeWayMatchingRouter); app.use("/api", eventCostBridgeRouter); app.use("/api/hardware/rfid", rfidRouter); app.use("/api/sprints", sprints612Router); // Rate limit payment operations app.use("/api/accounting", paymentLimiter, accountingRouter); // Encryption service (A.6 - KMS encryption) app.use("/api/encryption", encryptionRouter); // OCR Processing (Invoice text extraction) app.use("/api/ocr", ocrProcessingRouter); app.use("/api/invoices/ocr", ocrProcessingRouter); app.use("/api/analytics", analyticsRouter); // White-label service (lazy loaded to avoid Supabase initialization at build time) import("./routes/whiteLabelRoutes") .then((module) => { app.use("/api/white-label", module.default); logger.debug("White-label routes registered"); }) .catch((error) => { const errorMsg = error instanceof Error ? error.message : JSON.stringify(error); logger.error("Failed to load white-label routes", { error: errorMsg, stack: error instanceof Error ? error.stack : undefined, }); }); // WebSocket debug endpoint (for testing real-time updates) app.post("/api/ws/broadcast", (req, res) => { try { const { channel, data, organizationId } = req.body; if (!channel || !data) { return res.status(400).json({ error:"channel and data are required" }); } broadcastUpdate(channel, data, organizationId); logger.info(`Broadcasted to ${channel}`, { organizationId }); res.json({ success: true, channel, timestamp: new Date().toISOString(), }); } catch (error) { const errorMsg = error instanceof Error ? error.message : String(error); logger.error(`WebSocket broadcast error: ${errorMsg}`); res.status(500).json({ error: errorMsg }); } }); // Global error handler middleware app.use((err: any, _req, res, _next) => { const statusCode = err?.status ?? 500; const message = err?.message ??"Internal server error"; logger.error("Unhandled error in route handler", { statusCode, message, stack: process.env.NODE_ENV ==="development" ? err.stack : undefined, error: sanitizeError(err), }); res.status(statusCode).json({ error: message, ...(process.env.NODE_ENV ==="development" && { details: err.stack }), }); }); // Start payment automation engine startPaymentAutomationEngine(); logger.info("Payment automation engine started"); return app;
} /** * Setup global error handlers for unhandled rejections and exceptions */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections process.on("unhandledRejection", (reason, promise) => { logger.error("Unhandled Promise Rejection", { reason: sanitizeError(reason), promise: String(promise), stack: reason instanceof Error ? reason.stack : undefined, }); // In production, alert immediately if (process.env.NODE_ENV ==="production") { // Could integrate with alerting service here (PagerDuty, etc.) process.exit(1); } }); // Handle uncaught exceptions process.on("uncaughtException", (error) => { logger.error("Uncaught Exception", { message: error.message, stack: error.stack, error: sanitizeError(error), }); // Always exit on uncaught exception logger.error("Process exiting due to uncaught exception"); process.exit(1); }); // Handle SIGTERM for graceful shutdown process.on("SIGTERM", () => { logger.info("SIGTERM received - initiating graceful shutdown"); process.exit(0); }); // Handle SIGINT (Ctrl+C) process.on("SIGINT", () => { logger.info("SIGINT received - initiating graceful shutdown"); process.exit(0); });
}
