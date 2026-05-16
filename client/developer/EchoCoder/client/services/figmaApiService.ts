// Figma API Service - Handles OAuth flow and API interactions with Figma

interface FigmaOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

interface FigmaFile {
  key: string;
  name: string;
  lastModified: string;
  lastModifiedBy: {
    id: string;
    handle: string;
  };
  thumbnailUrl: string;
  version: string;
  documentVersion: string;
  isShared: boolean;
  ownerID: string;
  createdAt: string;
}

interface FigmaTeam {
  id: string;
  name: string;
}

interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks: Array<{ uri: string; title: string }>;
  remote: boolean;
  mainFileKey: string;
  mainFileId: string;
  nodeId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    handle: string;
    imgUrl: string;
  };
}

interface FigmaAsset {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "COMPONENT" | "COMPONENT_SET" | "STYLE";
  thumbnailUrl?: string;
  fileKey: string;
  lastModified: string;
}

interface FigmaFileDetail {
  document: {
    id: string;
    name: string;
    type: string;
    children: any[];
  };
  components: Record<string, FigmaComponent>;
  componentSets: Record<string, any>;
  styles: Record<string, any>;
  version: string;
  schemaVersion: number;
  isComponentsLibrary: boolean;
}

interface FigmaOAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: number;
  userId: string;
  teamId?: string;
}

const FIGMA_API_BASE = "https://api.figma.com/v1";
const FIGMA_OAUTH_URL = "https://www.figma.com/oauth";
const STORAGE_KEY = "figma.oauth.token";

class FigmaApiService {
  private oauthConfig: FigmaOAuthConfig | null = null;
  private token: FigmaOAuthToken | null = null;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize OAuth configuration
   */
  setOAuthConfig(config: FigmaOAuthConfig) {
    this.oauthConfig = config;
  }

  /**
   * Get OAuth authorization URL for user login
   */
  getAuthorizationUrl(state: string = ""): string {
    if (!this.oauthConfig) {
      throw new Error("OAuth config not set. Call setOAuthConfig first.");
    }

    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scopes.join(","),
      state: state || Math.random().toString(36).substring(7),
      response_type: "code",
    });

    return `${FIGMA_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    clientSecret: string,
  ): Promise<FigmaOAuthToken> {
    if (!this.oauthConfig) {
      throw new Error("OAuth config not set.");
    }

    const response = await fetch(`${FIGMA_OAUTH_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.oauthConfig.clientId,
        client_secret: clientSecret,
        redirect_uri: this.oauthConfig.redirectUri,
        code,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt: Date.now() + data.expires_in * 1000,
      userId: data.user_id,
      teamId: data.team_id,
    };

    this.saveToken();
    this.scheduleTokenRefresh();
    return this.token;
  }

  /**
   * Restore token from localStorage
   */
  restoreToken(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    try {
      this.token = JSON.parse(stored);
      if (this.token && this.token.expiresAt > Date.now()) {
        this.scheduleTokenRefresh();
        return true;
      } else {
        this.clearToken();
        return false;
      }
    } catch (e) {
      this.clearToken();
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && this.token.expiresAt > Date.now();
  }

  /**
   * Get current token
   */
  getToken(): FigmaOAuthToken | null {
    return this.token;
  }

  /**
   * Logout and clear token
   */
  logout() {
    this.clearToken();
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }
  }

  /**
   * Get user info
   */
  async getMe(): Promise<any> {
    return this.makeRequest("/me");
  }

  /**
   * Get list of user's teams
   */
  async getTeams(): Promise<FigmaTeam[]> {
    const data = await this.makeRequest("/teams");
    return data.teams || [];
  }

  /**
   * Get files in a team
   */
  async getTeamFiles(teamId: string): Promise<FigmaFile[]> {
    const data = await this.makeRequest(`/teams/${teamId}/files`);
    return data.files || [];
  }

  /**
   * Get specific file details
   */
  async getFileDetail(fileKey: string): Promise<FigmaFileDetail> {
    return this.makeRequest(`/files/${fileKey}`);
  }

  /**
   * Get file components
   */
  async getFileComponents(
    fileKey: string,
  ): Promise<Record<string, FigmaComponent>> {
    const data = await this.makeRequest(`/files/${fileKey}/components`);
    return data.components || {};
  }

  /**
   * Get file component sets
   */
  async getFileComponentSets(fileKey: string): Promise<any> {
    const data = await this.makeRequest(`/files/${fileKey}/component_sets`);
    return data.componentSets || {};
  }

  /**
   * Get team components (published components)
   */
  async getTeamComponents(
    teamId: string,
    pageSize: number = 50,
  ): Promise<FigmaComponent[]> {
    let allComponents: FigmaComponent[] = [];
    let cursor = "";
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({ per_page: pageSize.toString() });
      if (cursor) params.append("after", cursor);

      const data = await this.makeRequest(
        `/teams/${teamId}/components?${params}`,
      );
      allComponents = allComponents.concat(data.components || []);

      hasMore = !!data.pagination?.cursor;
      cursor = data.pagination?.cursor || "";
    }

    return allComponents;
  }

  /**
   * Get file exports (as PNG, SVG, PDF, etc)
   */
  async getFileExports(
    fileKey: string,
    nodeIds: string[],
    format: "PNG" | "SVG" | "PDF" = "PNG",
    scale: number = 1,
  ): Promise<Record<string, string>> {
    const params = new URLSearchParams({
      ids: nodeIds.join(","),
      format,
      scale: scale.toString(),
    });

    const data = await this.makeRequest(`/files/${fileKey}/export?${params}`);
    return data.images || {};
  }

  /**
   * Export as JSON for processing
   */
  async exportFileAsJSON(fileKey: string): Promise<any> {
    const detail = await this.getFileDetail(fileKey);
    return detail;
  }

  /**
   * List all files accessible to user
   */
  async getAllFiles(): Promise<FigmaFile[]> {
    const teams = await this.getTeams();
    let allFiles: FigmaFile[] = [];

    for (const team of teams) {
      const teamFiles = await this.getTeamFiles(team.id);
      allFiles = allFiles.concat(teamFiles);
    }

    return allFiles;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    if (!this.token) {
      throw new Error("Not authenticated. Please authenticate first.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Figma API request timeout"), 60000);

    try {
      const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token.accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          throw new Error("Authentication failed. Please login again.");
        }
        const error = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          `Figma API error: ${error.message || error.err || response.statusText}`,
        );
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Save token to localStorage
   */
  private saveToken() {
    if (this.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.token));
    }
  }

  /**
   * Clear stored token
   */
  private clearToken() {
    this.token = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh() {
    if (!this.token) return;

    // Refresh 5 minutes before expiration
    const timeUntilExpiry = this.token.expiresAt - Date.now() - 5 * 60 * 1000;
    if (timeUntilExpiry > 0) {
      if (this.tokenRefreshTimeout) clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = setTimeout(() => {
        // Token refresh logic would go here if using refresh tokens
      }, timeUntilExpiry);
    }
  }
}

export const figmaApiService = new FigmaApiService();
export type {
  FigmaOAuthToken,
  FigmaFile,
  FigmaTeam,
  FigmaComponent,
  FigmaAsset,
  FigmaFileDetail,
};
