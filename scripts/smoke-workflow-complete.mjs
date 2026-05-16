#!/usr/bin/env node
/**
 * Smoke: Order-to-Recipe workflow terminal checks
 * Ensures event wiring + trace emission for terminal completion.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const files = {
  onTheDock: path.join(
    projectRoot,
    "client",
    "modules",
    "PurchasingReceiving",
    "client",
    "pages",
    "OnTheDock.tsx"
  ),
  barcodeReceiver: path.join(
    projectRoot,
    "client",
    "modules",
    "PurchasingReceiving",
    "client",
    "pages",
    "BarcodeReceiver.tsx"
  ),
  integration: path.join(
    projectRoot,
    "client",
    "modules",
    "PurchasingReceiving",
    "integrations",
    "dashboard-integration.tsx"
  ),
  orderMiniPanel: path.join(
    projectRoot,
    "client",
    "components",
    "dashboard",
    "OrderStatusMiniPanel.tsx"
  ),
};

const missingFiles = Object.entries(files).filter(([, filePath]) => !fs.existsSync(filePath));
if (missingFiles.length) {
  console.error("❌ Missing workflow files:");
  missingFiles.forEach(([key, filePath]) => console.error(`- ${key}: ${filePath}`));
  process.exit(1);
}

const onTheDock = fs.readFileSync(files.onTheDock, "utf-8");
const barcodeReceiver = fs.readFileSync(files.barcodeReceiver, "utf-8");
const integration = fs.readFileSync(files.integration, "utf-8");
const orderMiniPanel = fs.readFileSync(files.orderMiniPanel, "utf-8");

const checks = [
  {
    label: "delivery arrival payload contains orderId",
    ok: onTheDock.includes("orderId: delivery.id"),
  },
  {
    label: "delivery arrival payload contains poNumber",
    ok: onTheDock.includes("poNumber: delivery.poNumber"),
  },
  {
    label: "delivery arrival payload contains vendor",
    ok: onTheDock.includes("vendor: delivery.vendor"),
  },
  {
    label: "delivery arrival payload contains outletId",
    ok: onTheDock.includes("outletId: delivery.outlet?.id"),
  },
  {
    label: "trace emitted on arrival",
    ok: onTheDock.includes("emitTrace(") && onTheDock.includes("delivery_arrived"),
  },
  {
    label: "checked_in event defined in integration",
    ok: integration.includes("order:checked_in"),
  },
  {
    label: "checked_in event wired in BarcodeReceiver",
    ok: barcodeReceiver.includes("publishOrderCheckedIn"),
  },
  {
    label: "terminal checked_in handled in dashboard",
    ok: orderMiniPanel.includes("checked_in"),
  },
];

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error("❌ Workflow completion smoke checks failed:");
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log("✅ Workflow completion smoke checks passed.");
