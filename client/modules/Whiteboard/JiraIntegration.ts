/** * Jira Integration Manager * Handles Jira ticket embedding, linking, and real-time sync */ import { JiraEmbed } from "./types";
import { v4 as uuidv4 } from "uuid";
interface JiraAuthConfig {
  instanceUrl: string;
  email?: string;
  apiToken?: string;
  bearerToken?: string;
}
interface JiraIssue {
  key: string;
  id: string;
  fields: {
    summary: string;
    description?: string;
    status: { name: string };
    priority: { name: string };
    assignee?: { displayName: string };
    duedate?: string;
    labels?: string[];
    [key: string]: any;
  };
}
class JiraIntegrationManager {
  private static authConfig: JiraAuthConfig = { instanceUrl: "" };
  static setAuthConfig(config: Partial<JiraAuthConfig>): void {
    this.authConfig = { ...this.authConfig, ...config };
  }
  private static getAuthHeader(): string {
    if (this.authConfig.bearerToken) {
      return `Bearer ${this.authConfig.bearerToken}`;
    }
    if (this.authConfig.apiToken && this.authConfig.email) {
      const credentials = btoa(
        `${this.authConfig.email}:${this.authConfig.apiToken}`,
      );
      return `Basic ${credentials}`;
    }
    return "";
  }
  static async searchIssues(
    jql: string,
    maxResults: number = 10,
  ): Promise<JiraIssue[]> {
    try {
      const response = await fetch(
        `${this.authConfig.instanceUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        throw new Error(
          `Jira API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      return data.issues || [];
    } catch (error) {
      console.error("[JiraIntegration] Search failed:", error);
      return [];
    }
  }
  static async getIssue(issueKey: string): Promise<JiraIssue | null> {
    try {
      const response = await fetch(
        `${this.authConfig.instanceUrl}/rest/api/3/issue/${issueKey}`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        throw new Error(
          `Jira API error: ${response.status} ${response.statusText}`,
        );
      }
      return await response.json();
    } catch (error) {
      console.error("[JiraIntegration] Get issue failed:", error);
      return null;
    }
  }
  static async updateIssueStatus(
    issueKey: string,
    statusId: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.authConfig.instanceUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          method: "POST",
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ transition: { id: statusId } }),
        },
      );
      return response.ok;
    } catch (error) {
      console.error("[JiraIntegration] Update failed:", error);
      return false;
    }
  }
  static async addCommentToIssue(
    issueKey: string,
    comment: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.authConfig.instanceUrl}/rest/api/3/issue/${issueKey}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            body: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: comment }],
                },
              ],
            },
          }),
        },
      );
      return response.ok;
    } catch (error) {
      console.error("[JiraIntegration] Add comment failed:", error);
      return false;
    }
  }
  static createJiraEmbed(
    issue: JiraIssue,
    x: number,
    y: number,
    width: number = 400,
    height: number = 300,
    userId?: string,
  ): JiraEmbed {
    const projectKey = issue.key.split("-")[0];
    return {
      id: uuidv4(),
      issueKey: issue.key,
      issueId: issue.id,
      projectKey,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status.name,
      priority: issue.fields.priority.name,
      assignee: issue.fields.assignee?.displayName,
      dueDate: issue.fields.duedate,
      labels: issue.fields.labels,
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      jiraUrl: `${this.authConfig.instanceUrl}/browse/${issue.key}`,
      timestamp: Date.now(),
      userId,
      isLocked: false,
      customFields: this.extractCustomFields(issue.fields),
    };
  }
  private static extractCustomFields(fields: any): Record<string, any> {
    const customFields: Record<string, any> = {};
    const standardFields = [
      "summary",
      "description",
      "status",
      "priority",
      "assignee",
      "duedate",
      "labels",
    ];
    for (const [key, value] of Object.entries(fields)) {
      if (!standardFields.includes(key) && key.startsWith("customfield_")) {
        customFields[key] = value;
      }
    }
    return customFields;
  }
  static async syncJiraEmbed(embed: JiraEmbed): Promise<Partial<JiraEmbed>> {
    try {
      const issue = await this.getIssue(embed.issueKey);
      if (!issue) {
        return { errorMessage: "Issue not found" };
      }
      const updates: Partial<JiraEmbed> = {
        lastSyncedAt: Date.now(),
        summary: issue.fields.summary,
        description: issue.fields.description,
        status: issue.fields.status.name,
        priority: issue.fields.priority.name,
        assignee: issue.fields.assignee?.displayName,
        dueDate: issue.fields.duedate,
        labels: issue.fields.labels,
        customFields: this.extractCustomFields(issue.fields),
      };
      return updates;
    } catch (error) {
      console.error("[JiraIntegration] Sync failed:", error);
      return {
        errorMessage: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
  static generateIssueUrl(issueKey: string): string {
    return `${this.authConfig.instanceUrl}/browse/${issueKey}`;
  }
  static validateIssueKey(issueKey: string): boolean {
    const pattern = /^[A-Z][A-Z0-9]+-\d+$/;
    return pattern.test(issueKey);
  }
}
export default JiraIntegrationManager;
