/**
 * System Knowledge Scanner
 * Tracks Echo's awareness of system components
 * Real percentage based on loaded modules, routes, services
 */

export interface SystemComponent {
  type: "module" | "route" | "service" | "hook" | "utility";
  name: string;
  status: "loaded" | "available" | "pending" | "failed";
  loadedAt?: number;
}

export interface SystemKnowledge {
  totalComponents: number;
  loadedComponents: number;
  awarenessPercentage: number;
  modules: SystemComponent[];
  routes: SystemComponent[];
  services: SystemComponent[];
  lastUpdated: number;
  loadingProgress: {
    phase: string;
    itemsLoaded: number;
    totalItems: number;
  };
}

const SYSTEM_MODULES = [
  "Culinary",
  "Pastry",
  "Schedule",
  "Inventory",
  "CRM",
  "ChefNet",
  "Support",
  "Whiteboard",
  "Video",
  "Canvas",
  "StickyNotes",
  "Maestro",
  "Mixology",
  "EchoCoder",
  "Aurum",
  "Layout",
  "Settings",
];

const SYSTEM_ROUTES = [
  "/api/tier1/batch",
  "/api/tier1/seo",
  "/api/tier1/relations",
  "/api/tier1/analytics",
  "/api/tier1/assets",
  "/api/tier2/workspaces",
  "/api/tier2/roles",
  "/api/tier2/flags",
  "/api/tier2/webhooks",
  "/api/tier2/graphql",
  "/api/tier3/logging",
  "/api/tier3/compliance",
  "/api/tier3/ip-whitelist",
  "/api/tier3/sso",
  "/api/tier3/2fa",
  "/api/tier4/ab-testing",
  "/api/tier4/targeting",
  "/api/tier4/images",
  "/api/tier4/predictive",
  "/api/automation",
  "/api/echocoder",
  "/api/ai3/seed",
];

const SYSTEM_SERVICES = [
  "RealAIConversationService",
  "CodeGenerationEngine",
  "FileGenerationService",
  "AutoWorkflowOrchestrator",
  "FileInteractionAnalyzer",
  "SeedAnalyticsService",
  "SystemKnowledgeScanner",
  "WeatherService",
  "EchoAIKnowledgeService",
  "CacheService",
  "StreamingService",
];

class SystemKnowledgeScanner {
  private knowledge: SystemKnowledge = {
    totalComponents: 0,
    loadedComponents: 0,
    awarenessPercentage: 0,
    modules: [],
    routes: [],
    services: [],
    lastUpdated: Date.now(),
    loadingProgress: {
      phase: "initializing",
      itemsLoaded: 0,
      totalItems: 0,
    },
  };

  private loadedModules = new Set<string>();
  private loadedRoutes = new Set<string>();
  private loadedServices = new Set<string>();

  constructor() {
    this.initializeSystemComponents();
  }

  private initializeSystemComponents() {
    // Initialize all modules
    this.knowledge.modules = SYSTEM_MODULES.map((name) => ({
      type: "module" as const,
      name,
      status: "available" as const,
    }));

    // Initialize all routes
    this.knowledge.routes = SYSTEM_ROUTES.map((name) => ({
      type: "route" as const,
      name,
      status: "available" as const,
    }));

    // Initialize all services
    this.knowledge.services = SYSTEM_SERVICES.map((name) => ({
      type: "service" as const,
      name,
      status: "available" as const,
    }));

    this.knowledge.totalComponents =
      this.knowledge.modules.length +
      this.knowledge.routes.length +
      this.knowledge.services.length;

    this.knowledge.loadingProgress.totalItems = this.knowledge.totalComponents;
  }

  /**
   * Mark a module as loaded
   */
  public loadModule(moduleName: string) {
    if (this.loadedModules.has(moduleName)) return;
    this.loadedModules.add(moduleName);

    const module = this.knowledge.modules.find((m) => m.name === moduleName);
    if (module) {
      module.status = "loaded";
      module.loadedAt = Date.now();
    }

    this.updateAwareness();
  }

  /**
   * Mark a route as loaded
   */
  public loadRoute(routePath: string) {
    if (this.loadedRoutes.has(routePath)) return;
    this.loadedRoutes.add(routePath);

    const route = this.knowledge.routes.find((r) => r.name === routePath);
    if (route) {
      route.status = "loaded";
      route.loadedAt = Date.now();
    }

    this.updateAwareness();
  }

  /**
   * Mark a service as loaded
   */
  public loadService(serviceName: string) {
    if (this.loadedServices.has(serviceName)) return;
    this.loadedServices.add(serviceName);

    const service = this.knowledge.services.find((s) => s.name === serviceName);
    if (service) {
      service.status = "loaded";
      service.loadedAt = Date.now();
    }

    this.updateAwareness();
  }

  /**
   * Get current awareness percentage
   */
  private updateAwareness() {
    this.knowledge.loadedComponents =
      this.loadedModules.size +
      this.loadedRoutes.size +
      this.loadedServices.size;

    this.knowledge.awarenessPercentage = Math.round(
      (this.knowledge.loadedComponents / this.knowledge.totalComponents) * 100,
    );

    this.knowledge.lastUpdated = Date.now();

    this.knowledge.loadingProgress = {
      phase: this.getPhase(),
      itemsLoaded: this.knowledge.loadedComponents,
      totalItems: this.knowledge.totalComponents,
    };
  }

  private getPhase(): string {
    const percentage = this.knowledge.awarenessPercentage;
    if (percentage < 25) return "discovering";
    if (percentage < 50) return "learning";
    if (percentage < 75) return "understanding";
    if (percentage < 90) return "integrating";
    if (percentage < 100) return "synchronizing";
    return "fully aware";
  }

  /**
   * Simulate component loading over time
   */
  public simulateLoading(durationMs: number = 3000) {
    const totalItems = this.knowledge.totalComponents;
    const itemsPerMs = totalItems / durationMs;
    let loaded = 0;

    const loadInterval = setInterval(() => {
      loaded++;
      const itemsToLoad = Math.floor(loaded * itemsPerMs);

      // Load modules first
      for (
        let i = 0;
        i < Math.min(itemsToLoad, this.knowledge.modules.length);
        i++
      ) {
        this.loadModule(this.knowledge.modules[i].name);
      }

      // Then routes
      const routeStartIndex = Math.min(
        itemsToLoad - this.knowledge.modules.length,
        this.knowledge.routes.length,
      );
      for (
        let i = 0;
        i < routeStartIndex && i < this.knowledge.routes.length;
        i++
      ) {
        this.loadRoute(this.knowledge.routes[i].name);
      }

      // Then services
      const serviceStartIndex = Math.min(
        itemsToLoad -
          this.knowledge.modules.length -
          this.knowledge.routes.length,
        this.knowledge.services.length,
      );
      for (
        let i = 0;
        i < serviceStartIndex && i < this.knowledge.services.length;
        i++
      ) {
        this.loadService(this.knowledge.services[i].name);
      }

      if (loaded * itemsPerMs >= totalItems) {
        clearInterval(loadInterval);
        // Final update to ensure 100%
        for (const module of this.knowledge.modules) {
          this.loadModule(module.name);
        }
        for (const route of this.knowledge.routes) {
          this.loadRoute(route.name);
        }
        for (const service of this.knowledge.services) {
          this.loadService(service.name);
        }
      }
    }, 50);
  }

  /**
   * Get current knowledge state
   */
  public getKnowledge(): SystemKnowledge {
    return { ...this.knowledge };
  }

  /**
   * Get awareness percentage
   */
  public getAwareness(): number {
    return this.knowledge.awarenessPercentage;
  }

  /**
   * Get detailed component list
   */
  public getComponents() {
    return {
      modules: this.knowledge.modules,
      routes: this.knowledge.routes,
      services: this.knowledge.services,
    };
  }

  /**
   * Reset knowledge for testing
   */
  public reset() {
    this.loadedModules.clear();
    this.loadedRoutes.clear();
    this.loadedServices.clear();
    this.knowledge.loadedComponents = 0;
    this.knowledge.awarenessPercentage = 0;
  }
}

// Singleton instance
let scanner: SystemKnowledgeScanner | null = null;

export function getSystemKnowledgeScanner(): SystemKnowledgeScanner {
  if (!scanner) {
    scanner = new SystemKnowledgeScanner();
  }
  return scanner;
}

export default SystemKnowledgeScanner;
