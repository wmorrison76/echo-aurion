/**
 * Builder.io Ecosystem Importer
 * Loads and integrates Builder.io exported ecosystem into LUCCCA
 */

export interface BuilderIOModule {
  id: string;
  name: string;
  description: string;
  componentPath: string;
  route: string;
  icon?: string;
  metadata?: Record<string, any>;
}

export interface BuilderIOEcosystem {
  version: string;
  name: string;
  createdAt: string;
  modules: BuilderIOModule[];
  config: {
    theme?: Record<string, any>;
    i18n?: Record<string, any>;
    plugins?: string[];
  };
}

interface ImporterConfig {
  basePath: string;
  namespace?: string;
  autoRegister?: boolean;
}

const STORAGE_KEY = "builder-io.ecosystem";

export class BuilderIOImporter {
  private config: ImporterConfig;
  private ecosystem: BuilderIOEcosystem | null = null;

  constructor(config: Partial<ImporterConfig> = {}) {
    this.config = {
      basePath: config.basePath || "client/ecosystem/builder-io",
      namespace: config.namespace || "builder",
      autoRegister: config.autoRegister !== false,
    };
  }

  /**
   * Load ecosystem from uploaded/extracted folder
   */
  async loadEcosystem(ecosystemPath: string): Promise<BuilderIOEcosystem> {
    try {
      // Load manifest from the exported ecosystem folder
      const response = await fetch(`${ecosystemPath}/manifest.json`);
      if (!response.ok) {
        throw new Error(
          `Failed to load ecosystem manifest: ${response.statusText}`,
        );
      }

      const ecosystem: BuilderIOEcosystem = await response.json();
      this.ecosystem = ecosystem;

      // Cache in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ecosystem));

      return ecosystem;
    } catch (error) {
      console.error("Error loading Builder.io ecosystem:", error);
      throw error;
    }
  }

  /**
   * Load ecosystem from localStorage cache
   */
  loadFromCache(): BuilderIOEcosystem | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        this.ecosystem = JSON.parse(cached);
        return this.ecosystem;
      }
      return null;
    } catch (error) {
      console.error("Error loading ecosystem from cache:", error);
      return null;
    }
  }

  /**
   * Register modules from ecosystem with module discovery system
   */
  registerModules(): BuilderIOModule[] {
    if (!this.ecosystem) {
      console.warn("No ecosystem loaded");
      return [];
    }

    const registered: BuilderIOModule[] = [];

    for (const module of this.ecosystem.modules) {
      try {
        // Validate module
        if (!module.id || !module.name || !module.route) {
          console.warn(`Skipping invalid module: ${module.id}`);
          continue;
        }

        // Register with namespace prefix
        const registeredModule = {
          ...module,
          id: `${this.config.namespace}-${module.id}`,
          metadata: {
            ...module.metadata,
            importedFrom: "builder-io",
            importedAt: new Date().toISOString(),
          },
        };

        // Store in localStorage for discovery system
        this.saveModuleRegistry(registeredModule);
        registered.push(registeredModule);

        console.log(`✓ Registered module: ${registeredModule.name}`);
      } catch (error) {
        console.error(`Failed to register module ${module.id}:`, error);
      }
    }

    return registered;
  }

  /**
   * Get all loaded modules
   */
  getModules(): BuilderIOModule[] {
    return this.ecosystem?.modules || [];
  }

  /**
   * Get module by ID
   */
  getModule(id: string): BuilderIOModule | undefined {
    return this.ecosystem?.modules.find((m) => m.id === id);
  }

  /**
   * Get ecosystem metadata
   */
  getEcosystemInfo(): {
    version: string;
    name: string;
    moduleCount: number;
  } | null {
    if (!this.ecosystem) return null;

    return {
      version: this.ecosystem.version,
      name: this.ecosystem.name,
      moduleCount: this.ecosystem.modules.length,
    };
  }

  /**
   * Save module to registry
   */
  private saveModuleRegistry(module: BuilderIOModule): void {
    const registryKey = `builder-io.modules`;
    const existing = localStorage.getItem(registryKey);
    const modules = existing ? JSON.parse(existing) : [];

    // Remove if exists, then add
    const filtered = modules.filter((m: BuilderIOModule) => m.id !== module.id);
    filtered.push(module);

    localStorage.setItem(registryKey, JSON.stringify(filtered));
  }

  /**
   * Get all registered modules from localStorage
   */
  getRegisteredModules(): BuilderIOModule[] {
    try {
      const registryKey = `builder-io.modules`;
      const data = localStorage.getItem(registryKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting registered modules:", error);
      return [];
    }
  }

  /**
   * Clear ecosystem data
   */
  clearEcosystem(): void {
    this.ecosystem = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("builder-io.modules");
  }

  /**
   * Export current ecosystem state
   */
  exportState(): BuilderIOEcosystem | null {
    return this.ecosystem;
  }

  /**
   * Validate ecosystem structure
   */
  static validateEcosystem(ecosystem: any): boolean {
    if (
      !ecosystem.version ||
      !ecosystem.name ||
      !Array.isArray(ecosystem.modules)
    ) {
      return false;
    }

    return ecosystem.modules.every(
      (m: any) => m.id && m.name && m.route && m.componentPath,
    );
  }
}

// Singleton instance
let importer: BuilderIOImporter | null = null;

export function getBuilderIOImporter(): BuilderIOImporter {
  if (!importer) {
    importer = new BuilderIOImporter();
  }
  return importer;
}
