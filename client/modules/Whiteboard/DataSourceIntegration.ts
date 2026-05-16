/** * Data Source Integration Manager * Handles live data embedding from APIs, SQL, GraphQL, and Spreadsheets */ import { DataSourceEmbed } from "./types";
import { v4 as uuidv4 } from "uuid";
type DataSourceType = "rest-api" | "sql" | "graphql" | "spreadsheet";
type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "table";
interface DataSourceConfig {
  sourceType: DataSourceType;
  endpoint?: string;
  query?: string;
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: Record<string, any>;
  refreshInterval?: number;
}
interface DataSourceResponse {
  data: Record<string, any>;
  meta: { timestamp: number; rowCount?: number; columnCount?: number };
}
class DataSourceIntegrationManager {
  static async fetchData(
    config: DataSourceConfig,
  ): Promise<DataSourceResponse | null> {
    try {
      switch (config.sourceType) {
        case "rest-api":
          return await this.fetchFromRestAPI(config);
        case "sql":
          return await this.fetchFromSQL(config);
        case "graphql":
          return await this.fetchFromGraphQL(config);
        case "spreadsheet":
          return await this.fetchFromSpreadsheet(config);
        default:
          throw new Error(`Unsupported source type: ${config.sourceType}`);
      }
    } catch (error) {
      console.error("[DataSourceIntegration] Fetch failed:", error);
      return null;
    }
  }
  private static async fetchFromRestAPI(
    config: DataSourceConfig,
  ): Promise<DataSourceResponse | null> {
    if (!config.endpoint) {
      throw new Error("REST API endpoint is required");
    }
    const response = await fetch(config.endpoint, {
      method: config.method || "GET",
      headers: { "Content-Type": "application/json", ...config.headers },
      body: config.method === "POST" ? JSON.stringify(config.body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const responseData = await response.json();
    return {
      data: this.normalizeData(responseData),
      meta: {
        timestamp: Date.now(),
        rowCount: Array.isArray(responseData) ? responseData.length : 1,
      },
    };
  }
  private static async fetchFromSQL(
    config: DataSourceConfig,
  ): Promise<DataSourceResponse | null> {
    if (!config.query) {
      throw new Error("SQL query is required");
    }
    const response = await fetch("/api/datasource/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...config.headers },
      body: JSON.stringify({ query: config.query }),
    });
    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }
    const rows = await response.json();
    return {
      data: { rows },
      meta: {
        timestamp: Date.now(),
        rowCount: rows.length,
        columnCount: rows.length > 0 ? Object.keys(rows[0]).length : 0,
      },
    };
  }
  private static async fetchFromGraphQL(
    config: DataSourceConfig,
  ): Promise<DataSourceResponse | null> {
    if (!config.query || !config.endpoint) {
      throw new Error("GraphQL endpoint and query are required");
    }
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...config.headers },
      body: JSON.stringify({ query: config.query }),
    });
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }
    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }
    return { data: result.data || {}, meta: { timestamp: Date.now() } };
  }
  private static async fetchFromSpreadsheet(
    config: DataSourceConfig,
  ): Promise<DataSourceResponse | null> {
    if (!config.endpoint) {
      throw new Error("Spreadsheet URL is required");
    }
    const response = await fetch(config.endpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet: ${response.statusText}`);
    }
    const csvText = await response.text();
    const rows = this.parseCSV(csvText);
    return {
      data: { rows },
      meta: {
        timestamp: Date.now(),
        rowCount: rows.length,
        columnCount: rows.length > 0 ? Object.keys(rows[0]).length : 0,
      },
    };
  }
  private static parseCSV(csvText: string): Array<Record<string, string>> {
    const lines = csvText.trim().split("\n");
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }
    return rows;
  }
  private static normalizeData(data: any): Record<string, any> {
    if (typeof data === "object" && data !== null) {
      return data;
    }
    return { value: data };
  }
  static createDataSourceEmbed(
    sourceName: string,
    config: DataSourceConfig,
    chartType: ChartType = "table",
    x: number = 0,
    y: number = 0,
    width: number = 600,
    height: number = 400,
    userId?: string,
  ): DataSourceEmbed {
    return {
      id: uuidv4(),
      sourceType: config.sourceType,
      sourceName,
      endpoint: config.endpoint,
      query: config.query,
      headers: config.headers,
      refreshInterval: config.refreshInterval,
      chartType,
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
  static async syncDataSourceEmbed(
    embed: DataSourceEmbed,
  ): Promise<Partial<DataSourceEmbed>> {
    try {
      const config: DataSourceConfig = {
        sourceType: embed.sourceType,
        endpoint: embed.endpoint,
        query: embed.query,
        headers: embed.headers,
        refreshInterval: embed.refreshInterval,
      };
      const response = await this.fetchData(config);
      if (!response) {
        return { errorMessage: "Failed to fetch data" };
      }
      return { cachedData: response.data, lastSyncedAt: Date.now() };
    } catch (error) {
      console.error("[DataSourceIntegration] Sync failed:", error);
      return {
        errorMessage: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
  static validateDataSourceConfig(config: DataSourceConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    if (!config.sourceType) {
      errors.push("Source type is required");
    }
    switch (config.sourceType) {
      case "rest-api":
        if (!config.endpoint) {
          errors.push("REST API endpoint is required");
        }
        break;
      case "sql":
        if (!config.query) {
          errors.push("SQL query is required");
        }
        break;
      case "graphql":
        if (!config.endpoint) {
          errors.push("GraphQL endpoint is required");
        }
        if (!config.query) {
          errors.push("GraphQL query is required");
        }
        break;
      case "spreadsheet":
        if (!config.endpoint) {
          errors.push("Spreadsheet URL is required");
        }
        break;
    }
    return { valid: errors.length === 0, errors };
  }
}
export default DataSourceIntegrationManager;
