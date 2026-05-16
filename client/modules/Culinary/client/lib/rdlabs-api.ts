/**
 * R&D Labs API Client
 * Handles all communication with the backend API
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface Experiment {
  id: string;
  title: string;
  hypothesis: string;
  specialization: "culinary" | "pastry" | "cross-disciplinary";
  status: "ideation" | "testing" | "ready" | "archived" | "deployed";
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  owner_id?: string;
  created_by_name?: string;
  created_by_email?: string;
}

export interface ExperimentStep {
  id: string;
  experiment_id: string;
  step_number: number;
  title: string;
  description?: string;
  variables?: string[];
  observations?: string;
  results?: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface ExperimentVariable {
  id: string;
  experiment_id: string;
  name: string;
  type: "temperature" | "time" | "ingredient" | "ratio" | "technique" | "other";
  baseline_value?: string;
  test_value?: string;
  unit?: string;
  is_independent: boolean;
  created_at: string;
}

export interface ExperimentAccess {
  id: string;
  experiment_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  invited_at: string;
  accepted_at?: string;
}

export interface RecipeLink {
  id: string;
  experiment_id: string;
  recipe_id: string;
  implementation_notes?: string;
  status: "linked" | "testing" | "deployed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  experiment_id: string;
  metric_type: "margin" | "guest_sentiment" | "supplier_volatility" | "operational" | "custom";
  value: number;
  unit: string;
  trend: "improving" | "stable" | "declining";
  created_at: string;
}

class RDLabsAPI {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token for subsequent requests
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${path}`, options);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: "HTTP_ERROR",
            message: `HTTP ${response.status}`,
          },
        };
      }

      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
          details: { error },
        },
      };
    }
  }

  // ============ EXPERIMENTS ============

  async listExperiments(params?: {
    status?: string;
    specialization?: string;
    tags?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ experiments: Experiment[]; total: number }>> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return this.request("GET", `/rdlabs/experiments${queryString}`);
  }

  async getExperiment(id: string): Promise<ApiResponse<Experiment>> {
    return this.request("GET", `/rdlabs/experiments/${id}`);
  }

  async createExperiment(data: {
    title: string;
    hypothesis: string;
    specialization: "culinary" | "pastry" | "cross-disciplinary";
    description?: string;
    tags?: string[];
  }): Promise<ApiResponse<Experiment>> {
    return this.request("POST", "/rdlabs/experiments", data);
  }

  async updateExperiment(
    id: string,
    updates: Partial<Experiment>
  ): Promise<ApiResponse<Experiment>> {
    return this.request("PATCH", `/rdlabs/experiments/${id}`, updates);
  }

  async deleteExperiment(id: string): Promise<ApiResponse<{ archived_at: string }>> {
    return this.request("DELETE", `/rdlabs/experiments/${id}`);
  }

  // ============ EXPERIMENT STEPS ============

  async addStep(
    experimentId: string,
    data: {
      title: string;
      description?: string;
      variables?: string[];
    }
  ): Promise<ApiResponse<ExperimentStep>> {
    return this.request("POST", `/rdlabs/experiments/${experimentId}/steps`, data);
  }

  async updateStep(
    experimentId: string,
    stepId: string,
    updates: Partial<ExperimentStep>
  ): Promise<ApiResponse<ExperimentStep>> {
    return this.request(
      "PATCH",
      `/rdlabs/experiments/${experimentId}/steps/${stepId}`,
      updates
    );
  }

  async deleteStep(
    experimentId: string,
    stepId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request("DELETE", `/rdlabs/experiments/${experimentId}/steps/${stepId}`);
  }

  // ============ VARIABLES ============

  async addVariable(
    experimentId: string,
    data: {
      name: string;
      type: string;
      baseline_value?: string;
      test_value?: string;
      unit?: string;
      is_independent?: boolean;
    }
  ): Promise<ApiResponse<ExperimentVariable>> {
    return this.request("POST", `/rdlabs/experiments/${experimentId}/variables`, data);
  }

  async updateVariable(
    experimentId: string,
    varId: string,
    updates: Partial<ExperimentVariable>
  ): Promise<ApiResponse<ExperimentVariable>> {
    return this.request(
      "PATCH",
      `/rdlabs/experiments/${experimentId}/variables/${varId}`,
      updates
    );
  }

  // ============ COLLABORATION ============

  async grantAccess(
    experimentId: string,
    data: {
      email: string;
      role: "owner" | "editor" | "viewer";
    }
  ): Promise<ApiResponse<ExperimentAccess>> {
    return this.request("POST", `/rdlabs/experiments/${experimentId}/access`, data);
  }

  async updateAccess(
    experimentId: string,
    accessId: string,
    updates: Partial<ExperimentAccess>
  ): Promise<ApiResponse<ExperimentAccess>> {
    return this.request(
      "PATCH",
      `/rdlabs/experiments/${experimentId}/access/${accessId}`,
      updates
    );
  }

  async revokeAccess(
    experimentId: string,
    accessId: string
  ): Promise<ApiResponse<{ revoked: boolean }>> {
    return this.request("DELETE", `/rdlabs/experiments/${experimentId}/access/${accessId}`);
  }

  // ============ RECIPE LINKING ============

  async linkRecipe(
    experimentId: string,
    data: {
      recipe_id: string;
      implementation_notes?: string;
    }
  ): Promise<ApiResponse<RecipeLink>> {
    return this.request("POST", `/rdlabs/experiments/${experimentId}/links`, data);
  }

  async getLinkedRecipes(
    experimentId: string
  ): Promise<ApiResponse<{ experiment_id: string; links: RecipeLink[] }>> {
    return this.request("GET", `/rdlabs/experiments/${experimentId}/links`);
  }

  async unlinkRecipe(
    experimentId: string,
    linkId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request("DELETE", `/rdlabs/experiments/${experimentId}/links/${linkId}`);
  }

  // ============ INSIGHTS ============

  async getExperimentInsights(experimentId: string): Promise<ApiResponse<any>> {
    return this.request("GET", `/rdlabs/experiments/${experimentId}/insights`);
  }

  async getDashboardInsights(): Promise<ApiResponse<any>> {
    return this.request("GET", `/rdlabs/insights/dashboard`);
  }

  // ============ HEALTH ============

  async healthCheck(): Promise<ApiResponse<{ status: string; service: string }>> {
    return this.request("GET", "/rdlabs/health");
  }
}

// Export singleton instance
export const rdLabsAPI = new RDLabsAPI();
