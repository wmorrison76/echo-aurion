import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Rocket,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  ChefHat,
  Flame,
  BarChart3,
  Cpu,
} from "lucide-react";
import { useMultiDomainTraining } from "../hooks/use-multi-domain-training";
import { MULTI_DOMAIN_TRAINING_PROFILES } from "../lib/multi-domain-training-config";

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  "culinary-science": <Flame className="w-5 h-5" />,
  "pastry-science": <ChefHat className="w-5 h-5" />,
  "beverage-flavor": <BookOpen className="w-5 h-5" />,
  mixology: <Zap className="w-5 h-5" />,
  sommelier: <BarChart3 className="w-5 h-5" />,
  "hospitality-ops": <Cpu className="w-5 h-5" />,
  "banquet-ops": <Rocket className="w-5 h-5" />,
  finance: <BarChart3 className="w-5 h-5" />,
  inventory: <BookOpen className="w-5 h-5" />,
  labor: <ChefHat className="w-5 h-5" />,
  crm: <Zap className="w-5 h-5" />,
  forecast: <Flame className="w-5 h-5" />,
  "unified-brain": <Cpu className="w-5 h-5" />,
};

interface AutomatedMultiDomainTrainingProps {
  compact?: boolean;
}

export function AutomatedMultiDomainTraining({
  compact = false,
}: AutomatedMultiDomainTrainingProps) {
  const {
    session,
    isRunning,
    isInitializing,
    error,
    initializeSession,
    startSequentialTraining,
    getProgressPercentage,
    getTotalKnowledgeLearned,
    getCompletedDomains,
    getTotalDomains,
  } = useMultiDomainTraining();

  // Calculate previously stored knowledge vs current session
  const totalKnowledge = getTotalKnowledgeLearned();
  const currentSessionKnowledge = session?.totalKnowledgeLearned || 0;
  const previouslyStoredKnowledge = totalKnowledge - currentSessionKnowledge;

  const sortedProfiles = useMemo(() => {
    return MULTI_DOMAIN_TRAINING_PROFILES.sort((a, b) => {
      const stateA = session?.domainStates[a.id];
      const stateB = session?.domainStates[b.id];

      // Sort by status: in_progress, completed, pending, failed
      const statusOrder = {
        in_progress: 0,
        completed: 1,
        pending: 2,
        failed: 3,
      };

      const orderA = statusOrder[stateA?.status || "pending"];
      const orderB = statusOrder[stateB?.status || "pending"];

      return orderA - orderB;
    });
  }, [session]);

  const handleStartTraining = async () => {
    if (!session) {
      await initializeSession();
    } else {
      await startSequentialTraining();
    }
  };

  const getStatusColor = (
    status: "pending" | "in_progress" | "completed" | "failed",
  ) => {
    switch (status) {
      case "in_progress":
        return "border-blue-300 bg-blue-50";
      case "completed":
        return "border-green-300 bg-green-50";
      case "failed":
        return "border-red-300 bg-red-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getStatusIcon = (
    status: "pending" | "in_progress" | "completed" | "failed",
  ) => {
    switch (status) {
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (compact && !session) {
    return (
      <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-indigo-900">
              Multi-Domain Autonomous Training
            </h3>
            <p className="text-sm text-indigo-700 mt-1">
              Train all 13 engines automatically
            </p>
          </div>
          <Button
            onClick={handleStartTraining}
            disabled={isInitializing || isRunning}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Rocket className="w-4 h-4" />
            {isInitializing ? "Initializing..." : "Start Training"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Multi-Domain Training Suite
        </h2>
        <p className="text-gray-600">
          Autonomous learning across all 13 specialized engines
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Session Overview */}
      {session && (
        <Card className="p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-3xl font-bold text-indigo-900">
                {getProgressPercentage()}%
              </p>
              <Progress value={getProgressPercentage()} className="mt-2 h-2" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Domains Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {getCompletedDomains()}/{getTotalDomains()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Knowledge</p>
              <p className="text-3xl font-bold text-blue-600">
                {totalKnowledge}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {previouslyStoredKnowledge > 0 && (
                  <>{previouslyStoredKnowledge} stored + </>
                )}
                {currentSessionKnowledge} this session
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {isRunning ? (
                  <>
                    <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="font-semibold text-blue-600">
                      Training...
                    </span>
                  </>
                ) : session.status === "completed" ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-600">
                      Complete
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-gray-600">Ready</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          {!isRunning && session.status !== "completed" && (
            <div className="mt-6 flex gap-2">
              <Button
                onClick={handleStartTraining}
                disabled={isInitializing || isRunning}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Rocket className="w-4 h-4" />
                {isInitializing ? "Initializing..." : "Start Training"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Initialize Button */}
      {!session && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                Ready to Start Training?
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Initialize a new multi-domain training session to begin
              </p>
            </div>
            <Button
              onClick={initializeSession}
              disabled={isInitializing}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="w-4 h-4" />
              {isInitializing ? "Initializing..." : "Initialize"}
            </Button>
          </div>
        </Card>
      )}

      {/* Domain Cards */}
      {session && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg text-gray-900">
            Training Progress by Domain
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedProfiles.map((profile) => {
              const state = session.domainStates[profile.id];
              if (!state) return null;

              const progress =
                (state.exchangesCompleted / state.totalExchanges) * 100;

              return (
                <Card
                  key={profile.id}
                  className={`p-4 border-2 transition-all ${getStatusColor(state.status)}`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {DOMAIN_ICONS[profile.id] || (
                          <Zap className="w-5 h-5" />
                        )}
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900">
                            {profile.name}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {profile.engine}
                          </p>
                        </div>
                      </div>
                      {getStatusIcon(state.status)}
                    </div>

                    {/* Progress */}
                    {state.status !== "pending" && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">
                              Exchanges: {state.exchangesCompleted}/
                              {state.totalExchanges}
                            </span>
                            <span className="text-gray-600">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>

                        {/* Knowledge Count */}
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <BookOpen className="w-3 h-3" />
                          <span>
                            {state.knowledgeItemsLearned} items learned
                          </span>
                        </div>
                      </>
                    )}

                    {/* Status Badge */}
                    <div className="flex justify-between items-center pt-2">
                      <Badge
                        className={`${
                          state.status === "in_progress"
                            ? "bg-blue-600"
                            : state.status === "completed"
                              ? "bg-green-600"
                              : state.status === "failed"
                                ? "bg-red-600"
                                : "bg-gray-400"
                        }`}
                      >
                        {state.status === "in_progress"
                          ? "Training..."
                          : state.status.charAt(0).toUpperCase() +
                            state.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {state.startedAt
                          ? new Date(state.startedAt).toLocaleTimeString()
                          : "-"}
                      </span>
                    </div>

                    {/* Error Message */}
                    {state.error && (
                      <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                        {state.error}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Training Details */}
      {session && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Training Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Domains</p>
              <p className="font-semibold text-gray-900">{getTotalDomains()}</p>
            </div>
            <div>
              <p className="text-gray-600">Session ID</p>
              <p className="font-mono text-xs text-gray-600 break-all">
                {session.id.substring(0, 16)}...
              </p>
            </div>
            <div>
              <p className="text-gray-600">Started</p>
              <p className="text-gray-900">
                {session.startedAt
                  ? new Date(session.startedAt).toLocaleTimeString()
                  : "Not started"}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
