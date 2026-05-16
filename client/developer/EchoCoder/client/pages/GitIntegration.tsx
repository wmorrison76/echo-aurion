import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import {
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitCommit,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { getGitService } from "@/services/gitService";
import { getAnalyticsService } from "@/services/analyticsService";

export default function GitIntegration() {
  const gitService = getGitService();
  const analytics = getAnalyticsService();
  const [prs, setPRs] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pulls");
  const [merging, setMerging] = useState<number | null>(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  const [repo, setRepo] = useState({
    owner: "wmorrison76",
    repo: "EchoCoderAi",
  });

  useEffect(() => {
    loadGitData();
  }, []);

  const loadGitData = async () => {
    setLoading(true);
    try {
      const [prData, commitData, branchData] = await Promise.all([
        gitService.listPullRequests(repo.owner, repo.repo),
        gitService.getCommitHistory(repo.owner, repo.repo),
        gitService.getBranches?.(repo.owner, repo.repo) ?? Promise.resolve([]),
      ]);

      setPRs(prData || []);
      setCommits(commitData || []);
      setBranches(branchData || []);

      analytics.trackModuleEvent({
        module_name: "GitIntegration",
        action: "open",
        status: "success",
      });
    } catch (err) {
      console.error("Failed to load git data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMergePR = async (prNumber: number) => {
    setMerging(prNumber);
    try {
      const success = await gitService.mergePullRequest(repo.owner, repo.repo, prNumber, {
        merge_method: "squash",
        delete_branch: true,
      });

      if (success) {
        analytics.trackModuleEvent({
          module_name: "GitIntegration",
          action: "deploy",
          status: "success",
          metadata: { pr_number: prNumber },
        });
        loadGitData();
      }
    } finally {
      setMerging(null);
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer className="py-6 sm:py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading git data...</p>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <GitBranch className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>Git Integration</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              {repo.owner}/{repo.repo}
            </p>
          </div>
          <Button
            onClick={loadGitData}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="text-xs sm:text-sm w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full gap-1 ${
            isMobile ? "grid-cols-2" : "grid-cols-3"
          }`}>
            <TabsTrigger value="pulls" className="text-xs sm:text-sm">
              Pull Requests ({prs.length})
            </TabsTrigger>
            <TabsTrigger value="commits" className="text-xs sm:text-sm">
              Commits ({commits.length})
            </TabsTrigger>
            <TabsTrigger value="branches" className="text-xs sm:text-sm">
              Branches ({branches.length})
            </TabsTrigger>
          </TabsList>

          {/* Pull Requests */}
          <TabsContent value="pulls" className="space-y-4 mt-4 sm:mt-6">
            <ResponsiveGrid cols={{ xs: 1, sm: 1, md: 1, lg: 1 }} gap="md">
              {prs.length === 0 ? (
                <Card className="p-6 sm:p-8 text-center">
                  <GitPullRequest className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No open pull requests</p>
                </Card>
              ) : (
                prs.map((pr) => (
                  <Card key={pr.number} className="hover:border-primary/50 transition">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg line-clamp-1">
                            {pr.title}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            #{pr.number} • {pr.state}
                          </CardDescription>
                        </div>
                        <Badge variant="default" className="text-xs">
                          #{pr.number}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {pr.body}
                      </div>
                      <Button
                        onClick={() => handleMergePR(pr.number)}
                        disabled={merging === pr.number}
                        className="w-full text-xs sm:text-sm"
                        size={isMobile ? "sm" : "default"}
                      >
                        {merging === pr.number ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Merging...
                          </>
                        ) : (
                          <>
                            <GitPullRequest className="h-4 w-4 mr-2" />
                            Merge PR
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </ResponsiveGrid>
          </TabsContent>

          {/* Commits */}
          <TabsContent value="commits" className="space-y-3 mt-4 sm:mt-6">
            {commits.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <GitCommit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No commits found</p>
              </Card>
            ) : (
              commits.slice(0, 10).map((commit, idx) => (
                <Card key={idx} className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <GitCommit className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">
                        {commit.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {commit.author} • {new Date(commit.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {commit.sha?.slice(0, 7)}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Branches */}
          <TabsContent value="branches" className="space-y-3 mt-4 sm:mt-6">
            {branches.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No branches found</p>
              </Card>
            ) : (
              branches.slice(0, 10).map((branch, idx) => (
                <Card key={idx} className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium line-clamp-1">
                      {branch.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {branch.protected ? "Protected" : "Unprotected"}
                    </p>
                  </div>
                  {branch.name === "main" && (
                    <Badge className="text-xs">Default</Badge>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveContainer>
  );
}
