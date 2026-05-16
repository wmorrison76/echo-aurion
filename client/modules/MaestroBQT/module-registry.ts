/**
 * Module Registry
 * Handles module auto-discovery, loading, and lifecycle management
 */

import type {
  LuccaModuleManifest,
  ModuleRegistryEntry,
  EventBus,
} from "./types";
import maestroEventBus, { EVENT_TYPES, publishEvent } from "./event-bus";

export class ModuleRegistry {
  private modules: Map<string, ModuleRegistryEntry> = new Map();
  private manifestCache: Map<string, LuccaModuleManifest> = new Map();

  /**
   * Discover and load all modules with luccca-module.json manifests
   */
  async discoverModules(): Promise<void> {
    console.debug("[ModuleRegistry] Starting module discovery...");

    // This would be implemented with dynamic imports in a real scenario
    // For now, we'll register known modules
    const knownModules = [
      "Maestro",
      "Culinary",
      "Pastry",
      "Schedule",
      "PurchasingReceiving",
      "Whiteboard",
      "BanquetMenuBuilder",
    ];

    for (const moduleName of knownModules) {
      try {
        // Try to load manifest
        const manifest = await this.loadManifest(moduleName);
        if (manifest) {
          this.registerModule(moduleName, manifest);
        }
      } catch (error) {
        console.warn(
          `[ModuleRegistry] Failed to load manifest for ${moduleName}:`,
          error,
        );
      }
    }

    console.debug(
      `[ModuleRegistry] Discovery complete. Loaded ${this.modules.size} modules`,
    );
  }

  /**
   * Load manifest for a specific module
   */
  private async loadManifest(
    moduleName: string,
  ): Promise<LuccaModuleManifest | null> {
    // Check cache first
    if (this.manifestCache.has(moduleName)) {
      return this.manifestCache.get(moduleName)!;
    }

    try {
      // In a real implementation, this would fetch the actual manifest file
      // For now, return a default manifest structure
      const manifest: LuccaModuleManifest = {
        name: moduleName,
        version: "1.0.0",
        routes: [],
        events: [],
        ui: [],
        dependencies: [],
      };

      this.manifestCache.set(moduleName, manifest);
      return manifest;
    } catch (error) {
      console.error(
        `[ModuleRegistry] Error loading manifest for ${moduleName}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Register a module
   */
  registerModule(name: string, manifest: LuccaModuleManifest): void {
    const entry: ModuleRegistryEntry = {
      name,
      version: manifest.version,
      manifest,
      loaded: false,
    };

    this.modules.set(name, entry);
    console.debug(`[ModuleRegistry] Registered module: ${name}`);
  }

  /**
   * Initialize a module
   */
  async initModule(name: string, eventBus: EventBus): Promise<void> {
    const entry = this.modules.get(name);
    if (!entry) {
      throw new Error(`Module ${name} not found in registry`);
    }

    try {
      console.log(`[ModuleRegistry] Initializing module: ${name}`);

      // Call module's lifecycle method
      if (entry.manifest.lifecycle?.initModule) {
        await entry.manifest.lifecycle.initModule();
      }

      // Subscribe to events
      if (entry.manifest.lifecycle?.subscribeToEvents) {
        entry.manifest.lifecycle.subscribeToEvents(eventBus);
      }

      entry.loaded = true;

      publishEvent(
        EVENT_TYPES.MODULE_LOADED,
        { module: name },
        "ModuleRegistry",
      );
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      publishEvent(
        EVENT_TYPES.MODULE_ERROR,
        { module: name, error: entry.error },
        "ModuleRegistry",
      );
      throw error;
    }
  }

  /**
   * Cleanup a module
   */
  async cleanupModule(name: string): Promise<void> {
    const entry = this.modules.get(name);
    if (!entry) {
      return;
    }

    try {
      console.log(`[ModuleRegistry] Cleaning up module: ${name}`);

      if (entry.manifest.lifecycle?.cleanupModule) {
        await entry.manifest.lifecycle.cleanupModule();
      }

      entry.loaded = false;
    } catch (error) {
      console.error(
        `[ModuleRegistry] Error cleaning up module ${name}:`,
        error,
      );
    }
  }

  /**
   * Get all registered modules
   */
  getModules(): ModuleRegistryEntry[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get a specific module
   */
  getModule(name: string): ModuleRegistryEntry | undefined {
    return this.modules.get(name);
  }

  /**
   * Get modules by event type they handle
   */
  getModulesByEvent(eventType: string): ModuleRegistryEntry[] {
    return Array.from(this.modules.values()).filter((entry) =>
      entry.manifest.events?.includes(eventType),
    );
  }

  /**
   * Get module dependencies
   */
  getModuleDependencies(name: string): string[] {
    const module = this.modules.get(name);
    return module?.manifest.dependencies || [];
  }

  /**
   * Check if module is loaded
   */
  isModuleLoaded(name: string): boolean {
    return this.modules.get(name)?.loaded ?? false;
  }

  /**
   * Get registry status
   */
  getStatus(): {
    total: number;
    loaded: number;
    failed: number;
    modules: Record<string, string>;
  } {
    const modules: Record<string, string> = {};
    let loaded = 0;
    let failed = 0;

    this.modules.forEach((entry, name) => {
      modules[name] = entry.error
        ? "error"
        : entry.loaded
          ? "loaded"
          : "registered";
      if (entry.error) failed++;
      if (entry.loaded) loaded++;
    });

    return {
      total: this.modules.size,
      loaded,
      failed,
      modules,
    };
  }
}

// Global registry singleton
export const moduleRegistry = new ModuleRegistry();

export default moduleRegistry;
