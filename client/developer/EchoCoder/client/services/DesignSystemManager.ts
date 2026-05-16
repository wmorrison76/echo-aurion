import { nanoid } from "nanoid";

export interface DesignToken {
  id: string;
  name: string;
  category:
    | "color"
    | "typography"
    | "spacing"
    | "sizing"
    | "border-radius"
    | "shadow"
    | "opacity";
  value: any;
  description?: string;
  group?: string;
  version: number;
  created: Date;
  modified: Date;
  createdBy?: string;
}

export interface ComponentLibraryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  mainComponentId: string;
  variants: ComponentVariant[];
  documentation?: string;
  usage: number;
  created: Date;
  modified: Date;
  published: boolean;
  version: number;
}

export interface ComponentVariant {
  id: string;
  name: string;
  properties: Record<string, any>;
  preview?: string;
}

export interface DesignSystemVersion {
  id: string;
  version: string;
  releaseNotes: string;
  tokens: DesignToken[];
  components: ComponentLibraryItem[];
  createdAt: Date;
  createdBy: string;
}

export interface ComponentInstance {
  id: string;
  mainComponentId: string;
  overrides: Record<string, any>;
  elementId: string;
}

class DesignSystemManager {
  private tokens: Map<string, DesignToken> = new Map();
  private components: Map<string, ComponentLibraryItem> = new Map();
  private versions: DesignSystemVersion[] = [];
  private componentInstances: Map<string, ComponentInstance> = new Map();
  private listeners: Map<string, Function[]> = new Map();
  private currentVersion = "1.0.0";

  constructor() {
    this.loadFromStorage();
  }

  // ===== TOKEN MANAGEMENT =====

  addToken(
    token: Omit<DesignToken, "id" | "created" | "modified" | "version">,
  ): DesignToken {
    const newToken: DesignToken = {
      ...token,
      id: nanoid(),
      created: new Date(),
      modified: new Date(),
      version: 1,
    };

    this.tokens.set(newToken.id, newToken);
    this.saveToStorage();
    this.emit("token-added", newToken);
    return newToken;
  }

  updateToken(id: string, updates: Partial<DesignToken>): void {
    const token = this.tokens.get(id);
    if (token) {
      const updated = {
        ...token,
        ...updates,
        modified: new Date(),
        version: token.version + 1,
      };
      this.tokens.set(id, updated);
      this.saveToStorage();
      this.emit("token-updated", updated);
    }
  }

  deleteToken(id: string): void {
    this.tokens.delete(id);
    this.saveToStorage();
    this.emit("token-deleted", id);
  }

  getTokens(category?: string): DesignToken[] {
    const tokens = Array.from(this.tokens.values());
    if (category) {
      return tokens.filter((t) => t.category === category);
    }
    return tokens;
  }

  getTokensByGroup(group: string): DesignToken[] {
    return Array.from(this.tokens.values()).filter((t) => t.group === group);
  }

  getColorTokens(): DesignToken[] {
    return this.getTokens("color");
  }

  getTypographyTokens(): DesignToken[] {
    return this.getTokens("typography");
  }

  getSpacingTokens(): DesignToken[] {
    return this.getTokens("spacing");
  }

  exportTokensAsCSS(): string {
    let css = ":root {\n";
    this.tokens.forEach((token) => {
      if (token.category === "color") {
        css += `  --color-${token.name.toLowerCase().replace(/\s+/g, "-")}: ${token.value};\n`;
      } else if (token.category === "spacing") {
        css += `  --spacing-${token.name.toLowerCase().replace(/\s+/g, "-")}: ${token.value}px;\n`;
      } else if (token.category === "sizing") {
        css += `  --size-${token.name.toLowerCase().replace(/\s+/g, "-")}: ${token.value}px;\n`;
      }
    });
    css += "}\n";
    return css;
  }

  exportTokensAsJSON(): string {
    const groups = new Map<string, DesignToken[]>();
    this.tokens.forEach((token) => {
      const group = token.group || "ungrouped";
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(token);
    });

    const result: Record<string, any> = {};
    groups.forEach((tokens, group) => {
      result[group] = {};
      tokens.forEach((token) => {
        result[group][token.name] = {
          value: token.value,
          description: token.description,
          type: token.category,
        };
      });
    });

    return JSON.stringify(result, null, 2);
  }

  // ===== COMPONENT LIBRARY MANAGEMENT =====

  addComponent(
    component: Omit<
      ComponentLibraryItem,
      "id" | "created" | "modified" | "usage" | "version"
    >,
  ): ComponentLibraryItem {
    const newComponent: ComponentLibraryItem = {
      ...component,
      id: nanoid(),
      created: new Date(),
      modified: new Date(),
      usage: 0,
      version: 1,
    };

    this.components.set(newComponent.id, newComponent);
    this.saveToStorage();
    this.emit("component-added", newComponent);
    return newComponent;
  }

  updateComponent(id: string, updates: Partial<ComponentLibraryItem>): void {
    const component = this.components.get(id);
    if (component) {
      const updated = {
        ...component,
        ...updates,
        modified: new Date(),
        version: component.version + 1,
      };
      this.components.set(id, updated);
      this.saveToStorage();
      this.emit("component-updated", updated);
    }
  }

  deleteComponent(id: string): void {
    this.components.delete(id);
    this.saveToStorage();
    this.emit("component-deleted", id);
  }

  getComponents(): ComponentLibraryItem[] {
    return Array.from(this.components.values());
  }

  getComponentsByCategory(category: string): ComponentLibraryItem[] {
    return Array.from(this.components.values()).filter(
      (c) => c.category === category,
    );
  }

  publishComponent(id: string): void {
    this.updateComponent(id, { published: true });
    this.emit("component-published", id);
  }

  unpublishComponent(id: string): void {
    this.updateComponent(id, { published: false });
    this.emit("component-unpublished", id);
  }

  addComponentVariant(componentId: string, variant: ComponentVariant): void {
    const component = this.components.get(componentId);
    if (component) {
      component.variants.push({
        ...variant,
        id: nanoid(),
      });
      this.updateComponent(componentId, component);
      this.emit("variant-added", variant);
    }
  }

  // ===== COMPONENT INSTANCES =====

  createInstance(
    mainComponentId: string,
    elementId: string,
  ): ComponentInstance {
    const instance: ComponentInstance = {
      id: nanoid(),
      mainComponentId,
      overrides: {},
      elementId,
    };

    this.componentInstances.set(instance.id, instance);
    this.saveToStorage();
    this.emit("instance-created", instance);
    return instance;
  }

  updateInstanceOverride(
    instanceId: string,
    property: string,
    value: any,
  ): void {
    const instance = this.componentInstances.get(instanceId);
    if (instance) {
      instance.overrides[property] = value;
      this.saveToStorage();
      this.emit("instance-updated", instance);
    }
  }

  getInstancesOfComponent(mainComponentId: string): ComponentInstance[] {
    return Array.from(this.componentInstances.values()).filter(
      (i) => i.mainComponentId === mainComponentId,
    );
  }

  // ===== VERSIONING =====

  createVersion(releaseNotes: string, createdBy: string): DesignSystemVersion {
    const version: DesignSystemVersion = {
      id: nanoid(),
      version: this.currentVersion,
      releaseNotes,
      tokens: Array.from(this.tokens.values()),
      components: Array.from(this.components.values()),
      createdAt: new Date(),
      createdBy,
    };

    this.versions.push(version);
    this.incrementVersion();
    this.saveToStorage();
    this.emit("version-created", version);
    return version;
  }

  getVersionHistory(): DesignSystemVersion[] {
    return this.versions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  revertToVersion(versionId: string): boolean {
    const version = this.versions.find((v) => v.id === versionId);
    if (!version) return false;

    this.tokens.clear();
    this.components.clear();

    version.tokens.forEach((token) => {
      this.tokens.set(token.id, token);
    });

    version.components.forEach((component) => {
      this.components.set(component.id, component);
    });

    this.saveToStorage();
    this.emit("reverted-to-version", version);
    return true;
  }

  private incrementVersion(): void {
    const parts = this.currentVersion.split(".");
    const patch = parseInt(parts[2]) + 1;
    this.currentVersion = `${parts[0]}.${parts[1]}.${patch}`;
  }

  // ===== STATISTICS & ANALYSIS =====

  getStatistics() {
    return {
      totalTokens: this.tokens.size,
      colorTokens: this.getColorTokens().length,
      typographyTokens: this.getTypographyTokens().length,
      spacingTokens: this.getSpacingTokens().length,
      totalComponents: this.components.size,
      publishedComponents: Array.from(this.components.values()).filter(
        (c) => c.published,
      ).length,
      totalInstances: this.componentInstances.size,
      versions: this.versions.length,
      lastModified: this.getLastModified(),
    };
  }

  getLastModified(): Date | null {
    let latest: Date | null = null;

    this.tokens.forEach((token) => {
      if (!latest || token.modified > latest) {
        latest = token.modified;
      }
    });

    this.components.forEach((component) => {
      if (!latest || component.modified > latest) {
        latest = component.modified;
      }
    });

    return latest;
  }

  getMostUsedComponents(): ComponentLibraryItem[] {
    return Array.from(this.components.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);
  }

  // ===== IMPORT/EXPORT =====

  exportAsJSON(): string {
    return JSON.stringify(
      {
        version: this.currentVersion,
        tokens: Array.from(this.tokens.values()),
        components: Array.from(this.components.values()),
        versions: this.versions,
        exported: new Date(),
      },
      null,
      2,
    );
  }

  importFromJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.currentVersion = data.version || "1.0.0";
      this.tokens.clear();
      this.components.clear();
      this.versions = [];

      (data.tokens || []).forEach((token: DesignToken) => {
        this.tokens.set(token.id, {
          ...token,
          created: new Date(token.created),
          modified: new Date(token.modified),
        });
      });

      (data.components || []).forEach((component: ComponentLibraryItem) => {
        this.components.set(component.id, {
          ...component,
          created: new Date(component.created),
          modified: new Date(component.modified),
        });
      });

      (data.versions || []).forEach((version: any) => {
        this.versions.push({
          ...version,
          createdAt: new Date(version.createdAt),
          tokens: version.tokens.map((t: any) => ({
            ...t,
            created: new Date(t.created),
            modified: new Date(t.modified),
          })),
          components: version.components.map((c: any) => ({
            ...c,
            created: new Date(c.created),
            modified: new Date(c.modified),
          })),
        });
      });

      this.saveToStorage();
      this.emit("imported", data);
      return true;
    } catch (error) {
      console.error("Import failed:", error);
      return false;
    }
  }

  // ===== STORAGE =====

  private saveToStorage(): void {
    localStorage.setItem(
      "design-system-tokens",
      JSON.stringify(Array.from(this.tokens.values())),
    );
    localStorage.setItem(
      "design-system-components",
      JSON.stringify(Array.from(this.components.values())),
    );
    localStorage.setItem(
      "design-system-versions",
      JSON.stringify(this.versions),
    );
    localStorage.setItem("design-system-version", this.currentVersion);
  }

  private loadFromStorage(): void {
    try {
      const tokens = localStorage.getItem("design-system-tokens");
      if (tokens) {
        JSON.parse(tokens).forEach((token: DesignToken) => {
          this.tokens.set(token.id, {
            ...token,
            created: new Date(token.created),
            modified: new Date(token.modified),
          });
        });
      }

      const components = localStorage.getItem("design-system-components");
      if (components) {
        JSON.parse(components).forEach((component: ComponentLibraryItem) => {
          this.components.set(component.id, {
            ...component,
            created: new Date(component.created),
            modified: new Date(component.modified),
          });
        });
      }

      const versions = localStorage.getItem("design-system-versions");
      if (versions) {
        this.versions = JSON.parse(versions).map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt),
          tokens: v.tokens.map((t: any) => ({
            ...t,
            created: new Date(t.created),
            modified: new Date(t.modified),
          })),
          components: v.components.map((c: any) => ({
            ...c,
            created: new Date(c.created),
            modified: new Date(c.modified),
          })),
        }));
      }

      const version = localStorage.getItem("design-system-version");
      if (version) {
        this.currentVersion = version;
      }
    } catch (error) {
      console.error("Failed to load design system:", error);
    }
  }

  // ===== EVENTS =====

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

export const designSystemManager = new DesignSystemManager();
