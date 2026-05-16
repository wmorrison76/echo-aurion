/**
 * GitHub Integration Service
 * PR management, branch protection, CI/CD status, auto-merge
 */

export interface GitHubPR {
  number: number;
  title: string;
  description: string;
  author: string;
  status: "open" | "merged" | "closed";
  created_at: string;
  updated_at: string;
  merged_at?: string;
  files_changed: number;
  additions: number;
  deletions: number;
  check_runs?: GitHubCheck[];
}

export interface GitHubCheck {
  id: string;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "neutral" | "cancelled" | null;
  url: string;
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
  protection_rules?: string[];
  latest_commit: string;
  latest_commit_date: string;
}

export interface AutoMergeConfig {
  enabled: boolean;
  trigger: "all_checks_pass" | "manual";
  delete_branch_on_merge: boolean;
  squash_commits: boolean;
}

class GitService {
  private token: string;
  private baseUrl = "https://api.github.com";

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || "";
  }

  /**
   * List pull requests for a repository
   */
  async listPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<GitHubPR[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls?state=${state}`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        },
      );

      if (!response.ok)
        throw new Error(`GitHub API error: ${response.statusText}`);

      const prs = await response.json();

      // Fetch check runs for each PR
      const enriched = await Promise.all(
        prs.map(async (pr: any) => {
          const checks = await this.getCheckRuns(owner, repo, pr.head.sha);
          return {
            number: pr.number,
            title: pr.title,
            description: pr.body || "",
            author: pr.user.login,
            status: pr.merged_at ? "merged" : pr.state,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            merged_at: pr.merged_at,
            files_changed: pr.changed_files,
            additions: pr.additions,
            deletions: pr.deletions,
            check_runs: checks,
          };
        }),
      );

      return enriched;
    } catch (err) {
      console.error("Failed to list PRs:", err);
      return [];
    }
  }

  /**
   * Get check runs for a commit
   */
  async getCheckRuns(
    owner: string,
    repo: string,
    commit_sha: string,
  ): Promise<GitHubCheck[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/commits/${commit_sha}/check-runs`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        },
      );

      if (!response.ok)
        throw new Error(`GitHub API error: ${response.statusText}`);

      const data = await response.json();
      return (data.check_runs || []).map((check: any) => ({
        id: check.id,
        name: check.name,
        status: check.status,
        conclusion: check.conclusion,
        url: check.html_url,
      }));
    } catch (err) {
      console.error("Failed to get check runs:", err);
      return [];
    }
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    pr_number: number,
    options?: {
      merge_method?: "squash" | "rebase" | "merge";
      delete_branch?: boolean;
    },
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}/merge`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            merge_method: options?.merge_method || "merge",
            delete_branch_after_merge: options?.delete_branch || false,
          }),
        },
      );

      return response.ok;
    } catch (err) {
      console.error("Failed to merge PR:", err);
      return false;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(
    owner: string,
    repo: string,
    branch_name: string,
    from_branch: string = "main",
  ): Promise<boolean> {
    try {
      // Get the SHA of the from_branch
      const refResponse = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${from_branch}`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      );

      if (!refResponse.ok) throw new Error("Failed to get branch ref");

      const refData = await refResponse.json();
      const sha = refData.object.sha;

      // Create new branch
      const createResponse = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/git/refs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ref: `refs/heads/${branch_name}`,
            sha,
          }),
        },
      );

      return createResponse.ok;
    } catch (err) {
      console.error("Failed to create branch:", err);
      return false;
    }
  }

  /**
   * Get branch protection status
   */
  async getBranchProtection(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<GitHubBranch> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/branches/${branch}`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      );

      if (!response.ok)
        throw new Error(`GitHub API error: ${response.statusText}`);

      const data = await response.json();

      return {
        name: data.name,
        protected: data.protected,
        protection_rules: data.protection_rules?.map((r: any) => r.type) || [],
        latest_commit: data.commit.sha,
        latest_commit_date: data.commit.commit.author.date,
      };
    } catch (err) {
      console.error("Failed to get branch protection:", err);
      return {
        name: branch,
        protected: false,
        latest_commit: "",
        latest_commit_date: "",
      };
    }
  }

  /**
   * Auto-merge PR when checks pass
   */
  async enableAutoMerge(
    owner: string,
    repo: string,
    pr_number: number,
    merge_method: "squash" | "rebase" | "merge" = "squash",
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}/merge`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            merge_method,
            auto_merge: true,
          }),
        },
      );

      return response.ok;
    } catch (err) {
      console.error("Failed to enable auto-merge:", err);
      return false;
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(owner: string, repo: string, limit: number = 50) {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/commits?per_page=${limit}`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      );

      if (!response.ok)
        throw new Error(`GitHub API error: ${response.statusText}`);

      const commits = await response.json();

      return commits.map((c: any) => ({
        hash: c.sha.substring(0, 7),
        message: c.commit.message.split("\n")[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      }));
    } catch (err) {
      console.error("Failed to get commit history:", err);
      return [];
    }
  }

  /**
   * Trigger a workflow run
   */
  async triggerWorkflow(
    owner: string,
    repo: string,
    workflow_id: string,
    ref: string = "main",
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref }),
        },
      );

      return response.status === 204;
    } catch (err) {
      console.error("Failed to trigger workflow:", err);
      return false;
    }
  }

  /**
   * Get workflow runs
   */
  async getWorkflowRuns(
    owner: string,
    repo: string,
    workflow_id: string,
    limit: number = 20,
  ) {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflow_id}/runs?per_page=${limit}`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      );

      if (!response.ok)
        throw new Error(`GitHub API error: ${response.statusText}`);

      const data = await response.json();

      return (data.workflow_runs || []).map((run: any) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        created_at: run.created_at,
        completed_at: run.completed_at,
        branch: run.head_branch,
        url: run.html_url,
      }));
    } catch (err) {
      console.error("Failed to get workflow runs:", err);
      return [];
    }
  }
}

// Singleton instance
let instance: GitService | null = null;

export function getGitService(token?: string): GitService {
  if (!instance) {
    instance = new GitService(token);
  }
  return instance;
}

export default GitService;
