/**
 * Builder.io CMS Integration for EchoCoder
 * Enables code generation that uses Builder.io managed content
 */

import type { BuilderContent } from "@builder.io/sdk";

export interface BuilderIOConfig {
  apiKey: string;
  spaceId?: string;
  organization?: string;
}

export interface ContentModel {
  id: string;
  name: string;
  displayName: string;
  fields: ModelField[];
  description?: string;
}

export interface ModelField {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface GeneratedCMSComponent {
  componentCode: string;
  hooks: string[];
  dataModel: ContentModel;
  fetchFunction: string;
  typeDefinitions: string;
}

class BuilderIOCMSIntegration {
  private config: BuilderIOConfig;
  private contentCache: Map<string, ContentModel> = new Map();

  constructor(config: BuilderIOConfig) {
    this.config = config;
  }

  /**
   * Fetch content models from Builder.io
   */
  async getContentModels(): Promise<ContentModel[]> {
    try {
      const response = await fetch(`/api/builder-cms/models`, {
        headers: {
          "X-Builder-API-Key": this.config.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const models = await response.json();
      models.forEach((model: ContentModel) => {
        this.contentCache.set(model.id, model);
      });

      return models;
    } catch (error) {
      console.error("Error fetching Builder.io models:", error);
      throw error;
    }
  }

  /**
   * Fetch content entries from a specific model
   */
  async getContent(
    modelId: string,
    limit: number = 50,
  ): Promise<BuilderContent[]> {
    try {
      const response = await fetch(
        `/api/builder-cms/content/${modelId}?limit=${limit}`,
        {
          headers: {
            "X-Builder-API-Key": this.config.apiKey,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching Builder.io content:", error);
      throw error;
    }
  }

  /**
   * Generate TypeScript type definitions from a content model
   */
  generateTypeDefinitions(model: ContentModel): string {
    const fields = model.fields
      .map((field) => {
        const typeMap: Record<string, string> = {
          string: "string",
          number: "number",
          boolean: "boolean",
          date: "Date",
          object: "Record<string, unknown>",
          array: "unknown[]",
          reference: "string",
          richText: "string",
          image: "{ url: string; altText?: string }",
          video: "{ url: string; poster?: string }",
          file: "{ url: string; name?: string }",
        };

        const fieldType = typeMap[field.type] || "unknown";
        const required = field.required ? "" : "?";

        return `  ${field.name}${required}: ${fieldType}; // ${field.description || ""}`;
      })
      .join("\n");

    return `export interface ${this.capitalizeName(model.name)} {
  id: string;
  createdAt: Date;
  updatedAt: Date;
${fields}
}

export interface ${this.capitalizeName(model.name)}List {
  results: ${this.capitalizeName(model.name)}[];
  total: number;
  limit: number;
  offset: number;
}`;
  }

  /**
   * Generate a fetch function for the content model
   */
  generateFetchFunction(model: ContentModel): string {
    const typeName = this.capitalizeName(model.name);

    return `async function fetch${typeName}(limit: number = 50) {
  try {
    const response = await fetch(\`/api/builder-cms/content/${model.id}?limit=\${limit}\`);
    if (!response.ok) throw new Error('Failed to fetch ${model.name}');
    return await response.json() as ${typeName}List;
  } catch (error) {
    console.error('Error fetching ${model.name}:', error);
    throw error;
  }
}`;
  }

  /**
   * Generate a React hook for accessing content
   */
  generateUseContentHook(model: ContentModel): string {
    const typeName = this.capitalizeName(model.name);
    const hookName = `use${typeName}`;

    return `function ${hookName}(limit: number = 50) {
  const [content, setContent] = useState<${typeName}List | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch${typeName}(limit)
      .then(data => {
        setContent(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
        setContent(null);
      })
      .finally(() => setLoading(false));
  }, [limit]);

  return { content, loading, error };
}`;
  }

  /**
   * Generate a complete CMS-backed component
   */
  async generateCMSComponent(
    modelId: string,
    componentDescription: string,
    componentName: string,
  ): Promise<GeneratedCMSComponent> {
    const model = this.contentCache.get(modelId);

    if (!model) {
      throw new Error(`Content model ${modelId} not found`);
    }

    const typeDefinitions = this.generateTypeDefinitions(model);
    const fetchFunction = this.generateFetchFunction(model);
    const useHook = this.generateUseContentHook(model);
    const typeName = this.capitalizeName(model.name);
    const hookName = `use${typeName}`;

    const componentCode = `'use client';

import { useState, useEffect } from 'react';
import type { ${typeName}, ${typeName}List } from './types';

// Type Definitions
${typeDefinitions}

// Fetch Function
${fetchFunction}

// Custom Hook
${useHook}

// Component
interface ${componentName}Props {
  limit?: number;
}

export default function ${componentName}({ limit = 50 }: ${componentName}Props) {
  const { content, loading, error } = ${hookName}(limit);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  if (!content || !content.results.length) {
    return <div className="p-4 text-gray-500">No content found</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">${model.displayName}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.results.map((item) => (
          <div key={item.id} className="p-4 border rounded-lg hover:shadow-lg transition">
            <h3 className="font-semibold mb-2">{item.name || item.title || 'Untitled'}</h3>
            <p className="text-sm text-gray-600">{item.description || ''}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500">Showing {content.results.length} of {content.total} items</p>
    </div>
  );
}`;

    return {
      componentCode,
      hooks: [hookName],
      dataModel: model,
      fetchFunction,
      typeDefinitions,
    };
  }

  /**
   * Generate a page that uses CMS content
   */
  async generateCMSPage(
    modelId: string,
    pageName: string,
    layout: "grid" | "list" | "card" = "grid",
  ): Promise<string> {
    const model = this.contentCache.get(modelId);

    if (!model) {
      throw new Error(`Content model ${modelId} not found`);
    }

    const componentName = `${this.capitalizeName(model.name)}Page`;
    const typeName = this.capitalizeName(model.name);
    const hookName = `use${typeName}`;

    return `'use client';

import { useState, useEffect } from 'react';
import type { ${typeName} } from '@/types/builder-cms';
import { ${hookName} } from '@/hooks/builder-cms';

export default function ${componentName}() {
  const { content, loading, error } = ${hookName}();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">${model.displayName}</h1>
        <p className="text-muted-foreground mb-8">${model.description || ""}</p>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-destructive">Error: {error.message}</p>
          </div>
        )}

        {content && content.results.length > 0 && (
          <div className="${
            layout === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : layout === "list"
                ? "space-y-4"
                : "grid grid-cols-1 md:grid-cols-2 gap-6"
          }">
            {content.results.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-2">{item.name || 'Untitled'}</h3>
                <p className="text-sm text-muted-foreground mb-4">{item.description || ''}</p>
                <div className="text-xs text-muted-foreground">
                  Updated: {new Date(item.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {content && content.results.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No content available</p>
          </div>
        )}
      </div>
    </div>
  );
}`;
  }

  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch("/api/builder-cms/validate", {
        headers: {
          "X-Builder-API-Key": this.config.apiKey,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private capitalizeName(name: string): string {
    return name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }
}

// Singleton instance
let instance: BuilderIOCMSIntegration | null = null;

export function initBuilderIOCMS(
  config: BuilderIOConfig,
): BuilderIOCMSIntegration {
  instance = new BuilderIOCMSIntegration(config);
  return instance;
}

export function getBuilderIOCMS(): BuilderIOCMSIntegration {
  if (!instance) {
    throw new Error(
      "Builder.io CMS not initialized. Call initBuilderIOCMS first.",
    );
  }
  return instance;
}

export default BuilderIOCMSIntegration;
