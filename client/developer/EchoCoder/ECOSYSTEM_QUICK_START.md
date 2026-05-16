# LUCCCA Ecosystem - Quick Start Guide

**Get your ecosystem running in 5 minutes**

---

## 🚀 One-Line Initialization

```typescript
import { bootstrapEcosystem } from "@/ecosystem";

const result = await bootstrapEcosystem({ verbose: true });
console.log(`Loaded ${result.modules.total} modules`);
```

That's it! Your ecosystem is ready to go.

---

## 📁 File Structure

After setup, you'll have:

```
client/ecosystem/
├── index.ts                    # Main exports
├── bootstrap.ts                # Quick initialization
├── builder-io-importer.ts      # Load Builder.io projects
├── zora-integration.ts         # Security & monitoring
├── echo-ai-cognition.ts        # Module intelligence
└── manifest.ts                 # Module registry
```

---

## 🔧 Setup Steps

### Step 1: Copy Your Builder.io Ecosystem

Place your exported ecosystem in:

```
public/ecosystem/builder-io/
├── manifest.json
├── modules/
└── config/
```

### Step 2: Initialize on App Startup

Add to your `main.tsx` or `App.tsx`:

```typescript
import { bootstrapEcosystem } from "@/ecosystem";

useEffect(() => {
  bootstrapEcosystem({
    builderIO: { enabled: true },
    zora: { enabled: true },
    echoAI: { enabled: true },
    verbose: true,
  });
}, []);
```

### Step 3: Use EchoAI to Query Modules

```typescript
import { getEchoAICognition } from "@/ecosystem";

const echo = getEchoAICognition();
const result = await echo.query({
  intent: "manage_recipes",
});

console.log(`Found: ${result.matchedModules.join(", ")}`);
```

---

## 💡 Common Tasks

### Load All Modules

```typescript
import { getAllModules } from "@/ecosystem";

const modules = getAllModules();
console.log(`Total modules: ${modules.length}`);

modules.forEach((m) => {
  console.log(`${m.icon} ${m.name} (${m.route})`);
});
```

### Find a Specific Module

```typescript
import { findModuleById, findModuleByRoute } from "@/ecosystem";

const crm = findModuleById("crm");
const scheduleModule = findModuleByRoute("/schedule");

console.log(`CRM: ${crm?.name}`);
console.log(`Schedule: ${scheduleModule?.name}`);
```

### Search Modules

```typescript
import { searchModules } from "@/ecosystem";

const results = searchModules("recipe");
console.log(`Found ${results.length} modules matching "recipe"`);
```

### Monitor System Health

```typescript
import { getZoraMonitor } from "@/ecosystem";

const zora = getZoraMonitor();
const metrics = zora.getHealthMetrics();
const lastMetric = metrics[metrics.length - 1];

console.log(`CPU: ${lastMetric.cpuUsage}%`);
console.log(`Memory: ${lastMetric.memoryUsage}MB`);
```

### Handle Security Alerts

```typescript
import { getZoraMonitor } from "@/ecosystem";

const zora = getZoraMonitor();
const critical = zora.getSecurityEvents("critical");

if (critical.length > 0) {
  console.error("Critical security issues:", critical);
  // Handle alert
}
```

### Get EchoAI Statistics

```typescript
import { getEchoAICognition } from "@/ecosystem";

const echo = getEchoAICognition();
const stats = echo.getStatistics();

console.log(`Modules: ${stats.totalModules}`);
console.log(`Intents: ${stats.totalIntents}`);
console.log(`Ready: ${stats.isInitialized}`);
```

---

## 📊 Ecosystem Status Dashboard

```typescript
import {
  getAllModules,
  getModuleStatistics,
  getEcosystemStatus,
  checkEcosystemHealth
} from '@/ecosystem';

export function EcosystemDashboard() {
  const stats = getModuleStatistics();
  const status = getEcosystemStatus();
  const health = checkEcosystemHealth();

  return (
    <div>
      <h2>Ecosystem Status</h2>
      <p>Core Modules: {stats.core}</p>
      <p>Builder.io: {stats.builderIO}</p>
      <p>Generated: {stats.generated}</p>
      <p>Total: {stats.total}</p>

      <h3>Health</h3>
      <p>Healthy: {health.healthy ? '✓' : '✗'}</p>
      {health.issues.map(issue => (
        <p key={issue}>⚠️ {issue}</p>
      ))}
    </div>
  );
}
```

---

## 🛠️ Troubleshooting

### "Builder.io ecosystem not found"

- Check `public/ecosystem/builder-io/` folder exists
- Verify `manifest.json` is present
- Check file paths are correct

**Solution:** This is optional - your app will work with just core modules

### "Modules not appearing"

```typescript
import { resetEcosystem } from "@/ecosystem";

// Clear cache and reload
resetEcosystem();
location.reload();
```

### "View ecosystem snapshot for debugging"

```typescript
import { exportEcosystemSnapshot } from "@/ecosystem";

const snapshot = exportEcosystemSnapshot();
console.log(JSON.stringify(snapshot, null, 2));
```

### "Check what's actually loaded"

```typescript
import { getEcosystemStatus } from "@/ecosystem";

const status = getEcosystemStatus();
console.log("Current Status:", status);
// {
//   builder: { loaded: true, modules: 5 },
//   zora: { monitoring: true, eventCount: 0 },
//   echoAI: { indexed: true, moduleCount: 21 }
// }
```

---

## 📡 API Endpoints

Once initialized, these endpoints are available:

```bash
# Get all modules
GET /api/ecosystem/modules

# Get complete manifest
GET /api/ecosystem/manifest

# Import new ecosystem
POST /api/ecosystem/import
  { "ecosystemPath": "...", "namespace": "..." }

# Check system health
GET /api/ecosystem/health

# Zora status
GET /api/ecosystem/zora/status

# Record security event
POST /api/ecosystem/zora/alert
  { "severity": "high", "type": "...", "description": "..." }

# Query EchoAI
GET /api/ecosystem/echo-ai/cognition/:query
```

---

## 🎯 Key Concepts

### **Modules**

- **Core (16):** Built-in LUCCCA modules
- **Builder.io:** Imported from your Builder.io project
- **Generated:** Created with EchoCoder AI

### **Zora**

- Real-time system monitoring
- Security event tracking
- Integrity verification

### **EchoAI**

- Understands all modules semantically
- Matches user intents to modules
- Provides module recommendations

---

## 🚨 Important Notes

1. **Builder.io import is optional** - System works with or without it
2. **Zora monitors continuously** - Call `zora.stopMonitoring()` to pause
3. **EchoAI needs initialization** - Call `echo.initialize()` first
4. **localStorage is used** - Clear if quota exceeded

---

## 🔗 Related Documentation

- [Complete Integration Guide](./ECOSYSTEM_INTEGRATION_GUIDE.md)
- [Module Discovery System](./client/lib/moduleDiscovery.ts)
- [EchoCoder Module Generator](./ECHOCODER_IMPLEMENTATION.md)

---

## ✅ Checklist

- [ ] Exported ecosystem from Builder.io
- [ ] Placed it in `public/ecosystem/builder-io/`
- [ ] Called `bootstrapEcosystem()` on app startup
- [ ] Can query modules with EchoAI
- [ ] Zora monitoring is active
- [ ] Health checks running
- [ ] All systems green ✨

---

**Need Help?**

1. Check ECOSYSTEM_INTEGRATION_GUIDE.md for detailed docs
2. Run `checkEcosystemHealth()` to diagnose issues
3. Export snapshot with `exportEcosystemSnapshot()` for debugging
4. Review console logs (set `verbose: true` during bootstrap)

---

**Version:** 1.0.0  
**Status:** Production Ready ✅
