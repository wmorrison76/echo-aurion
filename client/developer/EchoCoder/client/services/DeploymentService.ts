export interface DeploymentConfig {
  platform: "netlify" | "aws" | "azure" | "gcp" | "vercel";
  status: string;
  deploymentUrl?: string;
  estimatedTime?: string;
  estimatedCost?: string;
}

class DeploymentService {
  private baseUrl = "/api/deployment";

  async deployToNetlify(
    code: string,
    moduleName: string,
    buildCommand?: string
  ): Promise<DeploymentConfig> {
    const res = await fetch(`${this.baseUrl}/netlify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, moduleName, buildCommand, projectName: moduleName }),
    });
    if (!res.ok) throw new Error("Netlify deployment failed");
    return res.json();
  }

  async deployToAWS(
    code: string,
    moduleName: string,
    instanceType?: string,
    region?: string
  ): Promise<DeploymentConfig> {
    const res = await fetch(`${this.baseUrl}/aws`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, moduleName, instanceType, region }),
    });
    if (!res.ok) throw new Error("AWS deployment failed");
    return res.json();
  }

  async deployToAzure(
    code: string,
    moduleName: string,
    sku?: string,
    resourceGroup?: string
  ): Promise<DeploymentConfig> {
    const res = await fetch(`${this.baseUrl}/azure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, moduleName, sku, resourceGroup }),
    });
    if (!res.ok) throw new Error("Azure deployment failed");
    return res.json();
  }

  async deployToGCP(
    code: string,
    moduleName: string,
    region?: string,
    runtime?: string
  ): Promise<DeploymentConfig> {
    const res = await fetch(`${this.baseUrl}/gcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, moduleName, region, runtime }),
    });
    if (!res.ok) throw new Error("GCP deployment failed");
    return res.json();
  }

  async deployToVercel(
    code: string,
    moduleName: string,
    buildCommand?: string
  ): Promise<DeploymentConfig> {
    const res = await fetch(`${this.baseUrl}/vercel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, moduleName, buildCommand }),
    });
    if (!res.ok) throw new Error("Vercel deployment failed");
    return res.json();
  }

  async checkHealth(deploymentUrl: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/health-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deploymentUrl }),
    });
    if (!res.ok) throw new Error("Health check failed");
    return res.json();
  }

  async rollback(
    platform: string,
    deploymentId: string,
    previousVersionId: string
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, deploymentId, previousVersionId }),
    });
    if (!res.ok) throw new Error("Rollback failed");
    return res.json();
  }

  async getHistory(platform: string): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/history/${platform}`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  }
}

export const deploymentService = new DeploymentService();
