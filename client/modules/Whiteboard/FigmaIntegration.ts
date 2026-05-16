/** * Figma Integration Manager * Handles Figma file embedding, iframe rendering, and sync */ import { FigmaEmbed } from "./types";
import { v4 as uuidv4 } from "uuid";
interface FigmaAuthConfig {
  personalAccessToken?: string;
  oauthToken?: string;
}
interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string;
}
interface FigmaNode {
  id: string;
  name: string;
  type: string;
}
class FigmaIntegrationManager {
  private static apiBase = "https://api.figma.com/v1";
  private static authConfig: FigmaAuthConfig = {};
  static setAuthToken(token: string): void {
    this.authConfig.personalAccessToken = token;
  }
  static getAuthHeaders(): Record<string, string> {
    if (!this.authConfig.personalAccessToken) {
      console.warn(
        "[FigmaIntegration] No auth token configured. Some features may be limited.",
      );
    }
    return { "X-Figma-Token": this.authConfig.personalAccessToken || "" };
  }
  static async listFiles(): Promise<FigmaFile[]> {
    try {
      const response = await fetch(`${this.apiBase}/me/files`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(
          `Figma API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error("[FigmaIntegration] Failed to list files:", error);
      return [];
    }
  }
  static async getFileData(fileKey: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBase}/files/${fileKey}`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(
          `Figma API error: ${response.status} ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("[FigmaIntegration] Failed to get file data:", error);
      return null;
    }
  }
  static async getFileImages(
    fileKey: string,
    nodeIds: string[],
  ): Promise<Record<string, string>> {
    try {
      const params = new URLSearchParams();
      nodeIds.forEach((id) => params.append("ids", id));
      params.append("format", "png");
      const response = await fetch(
        `${this.apiBase}/images/${fileKey}?${params}`,
        { headers: this.getAuthHeaders() },
      );
      if (!response.ok) {
        throw new Error(
          `Figma API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      return data.images || {};
    } catch (error) {
      console.error("[FigmaIntegration] Failed to get images:", error);
      return {};
    }
  }
  static generateEmbedUrl(fileKey: string, nodeId?: string): string {
    let url = `https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/${fileKey}`;
    if (nodeId) {
      url += `&node-id=${nodeId}`;
    }
    return url;
  }
  static createFigmaEmbed(
    fileId: string,
    fileName: string,
    x: number,
    y: number,
    width: number = 600,
    height: number = 400,
    nodeId?: string,
    projectName?: string,
    userId?: string,
  ): FigmaEmbed {
    return {
      id: uuidv4(),
      fileId,
      fileName,
      projectId: projectName?.split("")[0],
      projectName,
      nodeId,
      nodeName: nodeId ? `Node ${nodeId.substring(0, 5)}` : undefined,
      iframeUrl: this.generateEmbedUrl(fileId, nodeId),
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      timestamp: Date.now(),
      userId,
      isLocked: false,
    };
  }
  static async syncFigmaEmbed(embed: FigmaEmbed): Promise<Partial<FigmaEmbed>> {
    try {
      const fileData = await this.getFileData(embed.fileId);
      if (!fileData) {
        return { errorMessage: "Failed to fetch Figma file data" };
      }
      const updates: Partial<FigmaEmbed> = {
        lastSyncedAt: Date.now(),
        fileName: fileData.name || embed.fileName,
      };
      if (embed.nodeId) {
        const nodeData = this.findNodeById(fileData.document, embed.nodeId);
        if (nodeData) {
          updates.nodeName = nodeData.name;
        }
      }
      return updates;
    } catch (error) {
      console.error("[FigmaIntegration] Sync failed:", error);
      return {
        errorMessage: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
  private static findNodeById(node: any, targetId: string): any {
    if (node.id === targetId) {
      return node;
    }
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const result = this.findNodeById(child, targetId);
        if (result) return result;
      }
    }
    return null;
  }
  static validateEmbedUrl(url: string): boolean {
    return url.includes("figma.com/embed") || url.includes("figma.com/file");
  }
}
export default FigmaIntegrationManager;
