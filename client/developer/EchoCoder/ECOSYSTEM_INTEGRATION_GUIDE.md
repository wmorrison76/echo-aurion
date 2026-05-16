# LUCCCA Ecosystem Integration Guide

**Complete guide for loading Builder.io ecosystems, connecting to Zora monitoring, and enabling EchoAI module understanding**

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Builder.io Ecosystem Import](#builderio-ecosystem-import)
4. [Zora Monitoring & Protection](#zora-monitoring--protection)
5. [EchoAI Module Cognition](#echoai-module-cognition)
6. [Integration Setup](#integration-setup)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The LUCCCA ecosystem integration system unifies three core systems:

### 1. **Builder.io Importer**

- Loads exported ecosystem projects from Builder.io
- Auto-registers modules into the LUCCCA system
- Supports namespace prefixing and versioning
- localStorage-based caching for offline access

### 2. **Zora Protection System**

- Real-time system monitoring and health checks
- Security event detection and alerting
- Integrity verification for ecosystem files
- Malware detection and rate limiting capabilities

### 3. **EchoAI Cognition Engine**

- Semantic understanding of all system modules
- Intent recognition for user queries
- Intelligent module matching and orchestration
- Full-text search with AI-powered ranking

---

## System Architecture

```
LUCCCA Ecosystem
├── Core Modules (16 built-in)
│   ├── Culinary, Pastry, Schedule, Inventory
│   ├── CRM, ChefNet, Support, Whiteboard
│   ├── Video, Canvas, StickyNotes, Maestro
│   ├── Mixology, EchoCoder, Aurum, Layout
│
├── Builder.io Imported Modules
│   └── Dynamic modules loaded from exported ecosystem
│
├── EchoCoder Generated Modules
│   └── AI-generated modules from user descriptions
│
└── Zora Protection Layer
    ├── Health Monitoring
    ├── Security Events
    └── Integrity Checks
```

---

## Builder.io Ecosystem Import

### Step 1: Export from Builder.io

1. Open your Builder.io project
2. Go to **Settings** → **Export Project**
3. Download the exported ecosystem (contains all modules and configurations)

### Step 2: Prepare Ecosystem Folder Structure

The exported ecosystem should have this structure:

```
builder-io-ecosystem/
├── manifest.json          # Ecosystem metadata
├── modules/               # Module definitions
│   ├── module-1/
│   │   ├── index.tsx
│   │   ├── styles.css
│   │   └── metadata.json
│   └── module-2/
├── config/
│   ├── theme.json        # Theme configuration
│   └── i18n.json         # Internationalization
└── README.md             # Documentation
```

### Step 3: Load Ecosystem in LUCCCA

#### Client-Side Loading

```typescript
import { getBuilderIOImporter } from "@/ecosystem/builder-io-importer";

// Initialize importer
const importer = getBuilderIOImporter();

// Load ecosystem from file path
await importer.loadEcosystem("/path/to/builder-io-ecosystem");

// Register modules with module discovery system
const registered = importer.registerModules();
console.log(`Registered ${registered.length} modules`);

// Get ecosystem info
const info = importer.getEcosystemInfo();
console.log(`Loaded ecosystem: ${info.name} v${info.version}`);
```

#### Server-Side API

```bash
# POST /api/ecosystem/import
curl -X POST http://localhost:8080/api/ecosystem/import \
  -H "Content-Type: application/json" \
  -d '{
    "ecosystemPath": "/path/to/builder-ecosystem",
    "namespace": "builder",
    "autoRegister": true
  }'
```

### Step 4: Verify Import

```typescript
// Check registered modules
const modules = importer.getRegisteredModules();
console.log(`Total imported modules: ${modules.length}`);

modules.forEach((m) => {
  console.log(`  ✓ ${m.name} (${m.id})`);
});
```

---

## Zora Monitoring & Protection

### Initialize Zora

```typescript
import { getZoraMonitor } from "@/ecosystem/zora-integration";

// Create and initialize monitor
const zora = getZoraMonitor({
  enabled: true,
  monitoring: {
    interval: 30000, // Check every 30 seconds
    collectMetrics: true,
    trackErrors: true,
  },
  protection: {
    malwareDetection: true,
    integrityCheck: true,
    rateLimiting: true,
  },
});

// Start monitoring
await zora.initialize();
zora.startMonitoring();
```

### Monitor Health Metrics

```typescript
// Get current health metrics
const metrics = zora.getHealthMetrics();
metrics.forEach((m) => {
  console.log(`Health Check [${new Date(m.timestamp).toLocaleTimeString()}]`);
  console.log(`  CPU: ${m.cpuUsage.toFixed(2)}%`);
  console.log(`  Memory: ${m.memoryUsage.toFixed(2)}MB`);
  console.log(`  Active Modules: ${m.activeModules}/${m.moduleCount}`);
  console.log(`  Response Time: ${m.responseTime.toFixed(2)}ms`);
});
```

### Handle Security Events

```typescript
// Record custom security event
zora.recordSecurityEvent({
  severity: "high",
  type: "unauthorized_access",
  description: "Attempted access to restricted module",
  module: "admin-panel",
});

// Get security events
const events = zora.getSecurityEvents();
console.log(`Total security events: ${events.length}`);

// Filter by severity
const critical = zora.getSecurityEvents("critical");
if (critical.length > 0) {
  console.log("🚨 CRITICAL ALERTS:");
  critical.forEach((e) => console.log(`  - ${e.description}`));
}
```

### Generate System Report

```typescript
// Get comprehensive system report
const report = zora.generateReport();
console.log(`Uptime: ${(report.uptime / 1000 / 60).toFixed(2)} minutes`);
console.log(`Health Checks: ${report.healthMetrics.length}`);
console.log(`Security Events: ${report.securityEvents.length}`);
console.log(`Protection Status:`, report.protectionStatus);
```

### Stop Monitoring

```typescript
// Graceful shutdown
zora.stopMonitoring();
zora.shutdown();
```

---

## EchoAI Module Cognition

### Initialize Cognition Engine

```typescript
import { getEchoAICognition } from "@/ecosystem/echo-ai-cognition";

// Get cognition engine instance
const echo = getEchoAICognition();

// Initialize (indexes all modules)
await echo.initialize();

// Check statistics
const stats = echo.getStatistics();
console.log(`EchoAI Status:`);
console.log(`  Modules Indexed: ${stats.totalModules}`);
console.log(`  Intents Mapped: ${stats.totalIntents}`);
console.log(`  Semantic Tokens: ${stats.totalTokens}`);
console.log(`  Ready: ${stats.isInitialized ? "✓" : "✗"}`);
```

### Query Module Intelligence

```typescript
// Simple query
const result = await echo.query({
  intent: "manage_customers",
  context: { type: "sales" },
});

console.log(`Query: "manage_customers"`);
console.log(`Matched Modules: ${result.matchedModules.join(", ")}`);
console.log(`Suggested Action: ${result.suggestedAction}`);
console.log(`Confidence: ${result.confidence}%`);
console.log(`Reasoning: ${result.reasoning}`);
```

### Advanced Queries

```typescript
// Query with specific target modules
const result = await echo.query({
  intent: "schedule_production",
  targetModules: ["schedule", "maestro", "inventory"],
  parameters: {
    duration: "2 hours",
    priority: "high",
  },
});

// Get top matches
const topModules = result.matchedModules.slice(0, 3);
topModules.forEach((moduleId) => {
  const knowledge = echo.getModuleKnowledge(moduleId);
  console.log(`\nModule: ${knowledge?.signature.name}`);
  console.log(
    `  Capabilities: ${knowledge?.signature.capabilities.join(", ")}`,
  );
  console.log(`  Supported Intents: ${knowledge?.intents.join(", ")}`);
});
```

### View Module Knowledge

```typescript
// Get all indexed modules
const modules = echo.getIndexedModules();
console.log(`Total Indexed Modules: ${modules.length}\n`);

modules.forEach((m) => {
  console.log(`📦 ${m.signature.name}`);
  console.log(`   ID: ${m.moduleId}`);
  console.log(`   Capabilities: ${m.signature.capabilities.join(", ")}`);
  console.log(`   Intents: ${m.intents.slice(0, 3).join(", ")}...`);
  console.log(`   Related: ${m.relatedModules.join(", ") || "none"}\n`);
});
```

---

## Integration Setup

### Complete Initialization Flow

```typescript
import { getBuilderIOImporter } from "@/ecosystem/builder-io-importer";
import { getZoraMonitor } from "@/ecosystem/zora-integration";
import { getEchoAICognition } from "@/ecosystem/echo-ai-cognition";

export async function initializeEcosystem() {
  console.log("🚀 Initializing LUCCCA Ecosystem...\n");

  try {
    // 1. Load Builder.io ecosystem
    console.log("1️⃣ Loading Builder.io ecosystem...");
    const importer = getBuilderIOImporter();

    // Try to load from predefined path
    try {
      await importer.loadEcosystem("/ecosystem/builder-io");
      const ecosystem = importer.registerModules();
      console.log(`   ✓ Imported ${ecosystem.length} modules\n`);
    } catch (error) {
      console.log("   ℹ️ Builder.io ecosystem not found (optional)\n");
    }

    // 2. Initialize Zora protection
    console.log("2️⃣ Initializing Zora monitoring...");
    const zora = getZoraMonitor({
      enabled: true,
      monitoring: { interval: 30000 },
      protection: { malwareDetection: true, integrityCheck: true },
    });
    await zora.initialize();
    zora.startMonitoring();
    console.log("   ✓ Zora monitoring active\n");

    // 3. Initialize EchoAI cognition
    console.log("3️⃣ Initializing EchoAI cognition...");
    const echo = getEchoAICognition();
    await echo.initialize();
    const stats = echo.getStatistics();
    console.log(`   ✓ Indexed ${stats.totalModules} modules\n`);

    // 4. Get complete status
    console.log("📊 Ecosystem Status:");
    const modules = importer.getModuleStatistics();
    console.log(`   Core Modules: ${modules.core}`);
    console.log(`   Imported Modules: ${modules.builderIO}`);
    console.log(`   Generated Modules: ${modules.generated}`);
    console.log(`   Total: ${modules.total}`);

    console.log("\n✅ Ecosystem fully initialized!");
    return { importer, zora, echo };
  } catch (error) {
    console.error("❌ Ecosystem initialization failed:", error);
    throw error;
  }
}

// Usage in app startup
initializeEcosystem();
```

---

## API Reference

### Builder.io Importer API

#### `LoadEcosystem(path: string): Promise<BuilderIOEcosystem>`

Load ecosystem from file path

#### `RegisterModules(): BuilderIOModule[]`

Register all modules with discovery system

#### `GetModules(): BuilderIOModule[]`

Get all loaded modules

#### `GetModule(id: string): BuilderIOModule | undefined`

Get specific module by ID

#### `GetEcosystemInfo(): {version, name, moduleCount}`

Get ecosystem metadata

### Zora Monitor API

#### `Initialize(): Promise<void>`

Initialize monitoring system

#### `StartMonitoring(): void`

Begin continuous health monitoring

#### `StopMonitoring(): void`

Stop monitoring

#### `PerformIntegrityCheck(): Promise<boolean>`

Run full integrity check

#### `RecordSecurityEvent(event): void`

Log security event

#### `GetHealthMetrics(): SystemHealthMetrics[]`

Get all health metrics

#### `GetSecurityEvents(severity?: string): SecurityEvent[]`

Get security events (optionally filtered)

#### `GenerateReport(): Report`

Generate comprehensive system report

### EchoAI Cognition API

#### `Initialize(): Promise<void>`

Index all modules for cognition

#### `Query(query: CognitionQuery): Promise<CognitionResult>`

Process user intent query

#### `IndexModule(module): Promise<void>`

Index new module

#### `GetIndexedModules(): ModuleKnowledge[]`

Get all indexed modules

#### `GetModuleKnowledge(id: string): ModuleKnowledge | undefined`

Get specific module knowledge

#### `GetStatistics(): Stats`

Get cognition statistics

---

## Troubleshooting

### Builder.io Import Issues

**Problem: "Failed to load ecosystem manifest"**

- Verify `manifest.json` exists in ecosystem folder
- Check file path is correct and accessible
- Ensure manifest.json is valid JSON

**Problem: "Module registration failed"**

- Check module has required fields: `id`, `name`, `route`, `componentPath`
- Verify modules don't have duplicate IDs
- Check localStorage quota isn't exceeded

### Zora Monitoring Issues

**Problem: "Health metrics not collecting"**

- Check monitoring interval is not too short (minimum 5000ms recommended)
- Verify `collectMetrics` is enabled
- Check browser console for errors

**Problem: "Integrity check always fails"**

- May indicate files have been modified
- Run `verifyFileHashes()` manually to diagnose
- Check ecosystem source is trusted

### EchoAI Cognition Issues

**Problem: "Modules not recognized in queries"**

- Run `echo.initialize()` after loading modules
- Check module names and descriptions are set
- Verify modules have `capabilities` or `description` defined

**Problem: "Low confidence scores"**

- More semantic tokens improve matching
- Add descriptions to module metadata
- Use multiple intent keywords in queries

### General Ecosystem Issues

**Problem: "localStorage quota exceeded"**

- Clear old ecosystem data: `importer.clearEcosystem()`
- Export and archive old metrics
- Check browser storage limits

**Problem: "Modules not appearing in sidebar"**

- Verify modules are registered: `importer.getRegisteredModules()`
- Check App.tsx has routes for new modules
- Clear browser cache and reload

---

## Performance Optimization

### Lazy Load Ecosystem

```typescript
// Don't load on app startup, load on-demand
let ecosystem = null;

async function getEcosystem() {
  if (!ecosystem) {
    const { getBuilderIOImporter } = await import(
      "@/ecosystem/builder-io-importer"
    );
    ecosystem = getBuilderIOImporter();
    await ecosystem.loadEcosystem("/ecosystem/builder-io");
  }
  return ecosystem;
}
```

### Batch Operations

```typescript
// Index multiple modules at once
const modules = importer.getModules();
const echo = getEchoAICognition();

await Promise.all(modules.map((m) => echo.indexModule(m)));
```

### Monitor Cleanup

```typescript
// Keep only recent metrics
const metrics = zora.getHealthMetrics();
if (metrics.length > 100) {
  // Archive or clear old metrics
  localStorage.removeItem("zora.monitoring");
  zora.startMonitoring(); // Restart fresh
}
```

---

## Summary

**Key Files:**

- `client/ecosystem/builder-io-importer.ts` - Builder.io integration
- `client/ecosystem/zora-integration.ts` - Security & monitoring
- `client/ecosystem/echo-ai-cognition.ts` - Module intelligence
- `client/ecosystem/manifest.ts` - Unified module registry
- `server/routes/ecosystem.ts` - API endpoints

**Quick Start:**

1. Export ecosystem from Builder.io
2. Place in project `public/ecosystem/builder-io/` folder
3. Call `initializeEcosystem()` on app startup
4. Use EchoAI cognition to query module capabilities
5. Monitor system with Zora

**Status Indicators:**

- ✓ System fully loaded and operational
- ℹ️ Optional component (graceful degradation)
- ✗ Critical error (blocks functionality)

---

**Version:** 1.0.0  
**Last Updated:** 2025  
**Maintained By:** LUCCCA Team
