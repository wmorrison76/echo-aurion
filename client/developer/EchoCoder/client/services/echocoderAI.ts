/**
 * EchoCoder AI Service
 * Generates React modules using OpenAI based on natural language requests
 * Includes Builder.io CMS integration for content management
 */

import { registerGeneratedModule } from "@/lib/moduleDiscovery";
import type { ChangeType, ChangeRequest } from "./echocoderChangeControl";

interface ModuleRequest {
  description: string;
  moduleName: string;
  useBuilderCMS?: boolean;
  cmsModelId?: string;
  changeControl?: {
    tenantId: string;
    changeType: ChangeType;
    title?: string;
    description?: string;
  };
}

interface CMSModuleRequest extends ModuleRequest {
  useBuilderCMS: true;
  cmsModelId: string;
}

interface GeneratedModule {
  componentCode: string;
  pageCode: string;
  moduleName: string;
  route: string;
  usesBuilderCMS?: boolean;
  changeRequest?: ChangeRequest;
}

interface CMSGeneratedModule extends GeneratedModule {
  usesBuilderCMS: true;
  typeDefinitions: string;
  fetchFunction: string;
}

export async function generateModuleWithAI(
  request: ModuleRequest,
): Promise<GeneratedModule> {
  try {
    const response = await fetch("/api/echocoder/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Register only after an approved apply to avoid leaking staged modules
    if (data.moduleName && data.changeRequest?.status === "applied") {
      registerGeneratedModule(data.moduleName, request.description);
    }

    return data;
  } catch (error) {
    console.error("Error generating module:", error);
    throw error;
  }
}

export async function fixModuleWithAI(
  moduleName: string,
  errorDescription: string,
  changeControl?: ModuleRequest["changeControl"],
): Promise<GeneratedModule> {
  try {
    const response = await fetch("/api/echocoder/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moduleName,
        errorDescription,
        changeControl,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fixing module:", error);
    throw error;
  }
}

export async function analyzeModuleHealth(
  moduleName: string,
): Promise<{ healthy: boolean; issues: string[] }> {
  try {
    const response = await fetch(`/api/echocoder/analyze/${moduleName}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error analyzing module:", error);
    throw error;
  }
}

/**
 * Generate a module that uses Builder.io CMS content
 */
export async function generateCMSModuleWithAI(
  request: CMSModuleRequest,
): Promise<CMSGeneratedModule> {
  try {
    const response = await fetch("/api/echocoder/generate-cms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Register the module in local storage
    if (data.moduleName) {
      registerGeneratedModule(
        data.moduleName,
        `${request.description} (Uses Builder.io CMS)`,
      );
    }

    return data;
  } catch (error) {
    console.error("Error generating CMS module:", error);
    throw error;
  }
}

/**
 * Get available Builder.io content models for CMS-backed components
 */
export async function getBuilderIOModels(apiKey: string) {
  try {
    const response = await fetch("/api/builder-cms/models", {
      method: "GET",
      headers: {
        "X-Builder-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Builder.io models:", error);
    throw error;
  }
}

/**
 * Get content from a specific Builder.io model
 */
export async function getBuilderIOContent(
  apiKey: string,
  modelId: string,
  limit: number = 50,
) {
  try {
    const response = await fetch(
      `/api/builder-cms/content/${modelId}?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "X-Builder-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Builder.io content:", error);
    throw error;
  }
}

/**
 * Validate Builder.io API key connection
 */
export async function validateBuilderIOKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("/api/builder-cms/validate", {
      method: "GET",
      headers: {
        "X-Builder-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
