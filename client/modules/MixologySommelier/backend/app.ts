import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import winesRouter from "./api/wines.controller.js";
import inventoryRouter from "./api/inventory.controller.js";
import purchaseRouter from "./api/purchase.controller.js";
import pairingRouter from "./api/pairing.controller.js";
import authRouter from "./api/auth.controller.js";
import onboardingRouter from "./api/onboarding.controller.js";
import recipesRouter from "./api/recipes.controller.js";
import liquorInventoryRouter from "./api/liquor-inventory.controller.js";
import transfersRouter from "./api/transfers.controller.js";
import compedDrinksRouter from "./api/comped-drinks.controller.js";
import varianceAuditRouter from "./api/variance-audit.controller.js";
import miniBarRouter from "./api/mini-bar.controller.js";
import banquetRouter from "./api/banquet.controller.js";
import posRouter from "./api/pos.controller.js";
import pricingRouter from "./api/pricing.controller.js";
import analyticsRouter from "./api/analytics.controller.js";
import reportingRouter from "./api/reporting.controller.js";
import WebSocketService from "./services/websocket.service.js";
dotenv.config();
const app = express();
const httpServer = createServer(app); // Initialize WebSocket service
WebSocketService.initialize(httpServer);
app.use(cors());
app.use(express.json());
app.get("/", (_, res) => res.send("LUCCCA Sommelier Suite Backend Active")); // Core APIs
app.use("/api/wines", winesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/purchases", purchaseRouter);
app.use("/api/pairing", pairingRouter);
app.use("/api/auth", authRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/recipes", recipesRouter); // Bar Liquor Inventory APIs
app.use("/api/liquor-inventory", liquorInventoryRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/comped-drinks", compedDrinksRouter);
app.use("/api/variance-audit", varianceAuditRouter);
app.use("/api/mini-bar", miniBarRouter);
app.use("/api/banquet", banquetRouter); // POS Integration APIs
app.use("/api/pos", posRouter);
app.use("/api/pricing", pricingRouter); // Advanced Analytics & Real-time APIs
app.use("/api/analytics", analyticsRouter); // Reporting & Export APIs
app.use("/api/reporting", reportingRouter);
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () =>
  console.log(`LUCCCA backend listening on port ${PORT}`),
);
