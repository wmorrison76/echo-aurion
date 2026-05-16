import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { CodeSuggestion } from "@/services/CodeSuggestionsService";
import { Badge } from "@/components/ui/badge";

interface CodeSuggestionsPanelProps {
  suggestions: CodeSuggestion[];
  isLoading?: boolean;
  onApplySuggestion?: (suggestion: CodeSuggestion) => Promise<void>;
  onDownloadRoadmap?: () => void;
}

export const CodeSuggestionsPanel: React.FC<CodeSuggestionsPanelProps> = ({
  suggestions,
  isLoading = false,
  onApplySuggestion,
  onDownloadRoadmap,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<string | null>(null);

  const categorized = suggestions.reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<string, CodeSuggestion[]>
  );

  const bySeverity = suggestions.reduce(
    (acc, s) => {
      if (!acc[s.severity]) acc[s.severity] = [];
      acc[s.severity].push(s);
      return acc;
    },
    {} as Record<string, CodeSuggestion[]>
  );

  const handleApply = async (suggestion: CodeSuggestion) => {
    if (!onApplySuggestion) return;

    setApplying(suggestion.id);
    try {
      await onApplySuggestion(suggestion);
      setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]));
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
    } finally {
      setApplying(null);
    }
  };

  const getSeverityColor = (severity: CodeSuggestion["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-900/20 border-red-700";
      case "major":
        return "text-orange-400 bg-orange-900/20 border-orange-700";
      case "minor":
        return "text-blue-400 bg-blue-900/20 border-blue-700";
    }
  };

  const getImpactColor = (impact: "high" | "medium" | "low") => {
    switch (impact) {
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-slate-400";
    }
  };

  const getEffortColor = (effort: "low" | "medium" | "high") => {
    switch (effort) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-red-400";
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Analyzing Code Quality</h3>
        <p className="text-slate-400 text-center max-w-md">Generating improvement suggestions...</p>
      </Card>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Code Improvement Suggestions
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={onDownloadRoadmap}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download Roadmap
          </Button>
        </div>
        <p className="text-sm text-slate-400">
          {suggestions.length} suggestions • {appliedSuggestions.size} applied
        </p>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="all" className="w-full h-full flex flex-col">
          <TabsList className="w-full justify-start border-b border-slate-700 bg-slate-900 rounded-none">
            <TabsTrigger value="all">All ({suggestions.length})</TabsTrigger>
            <TabsTrigger value="critical">
              Critical ({bySeverity["critical"]?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="quickWins">Quick Wins</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {suggestions.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-slate-400">
                    <CheckCircle className="w-12 h-12 mr-3 text-green-400" />
                    <div>
                      <p className="font-semibold">No suggestions</p>
                      <p className="text-sm">Code is already in good shape!</p>
                    </div>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      isExpanded={expandedId === suggestion.id}
                      isApplied={appliedSuggestions.has(suggestion.id)}
                      isApplying={applying === suggestion.id}
                      onToggle={() =>
                        setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
                      }
                      onApply={() => handleApply(suggestion)}
                      getSeverityColor={getSeverityColor}
                      getImpactColor={getImpactColor}
                      getEffortColor={getEffortColor}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="critical" className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {bySeverity["critical"]?.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-slate-400">
                    <CheckCircle className="w-12 h-12 mr-3 text-green-400" />
                    <div>
                      <p className="font-semibold">No critical issues</p>
                      <p className="text-sm">Great security posture!</p>
                    </div>
                  </div>
                ) : (
                  (bySeverity["critical"] || []).map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      isExpanded={expandedId === suggestion.id}
                      isApplied={appliedSuggestions.has(suggestion.id)}
                      isApplying={applying === suggestion.id}
                      onToggle={() =>
                        setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
                      }
                      onApply={() => handleApply(suggestion)}
                      getSeverityColor={getSeverityColor}
                      getImpactColor={getImpactColor}
                      getEffortColor={getEffortColor}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="category" className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {Object.entries(categorized).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-white mb-3 capitalize">
                      {category} ({items.length})
                    </h3>
                    <div className="space-y-2 ml-2">
                      {items.map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          isExpanded={expandedId === suggestion.id}
                          isApplied={appliedSuggestions.has(suggestion.id)}
                          isApplying={applying === suggestion.id}
                          onToggle={() =>
                            setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
                          }
                          onApply={() => handleApply(suggestion)}
                          getSeverityColor={getSeverityColor}
                          getImpactColor={getImpactColor}
                          getEffortColor={getEffortColor}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="quickWins" className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {suggestions
                  .filter((s) => s.impact === "high" && s.effort === "low")
                  .map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      isExpanded={expandedId === suggestion.id}
                      isApplied={appliedSuggestions.has(suggestion.id)}
                      isApplying={applying === suggestion.id}
                      onToggle={() =>
                        setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
                      }
                      onApply={() => handleApply(suggestion)}
                      getSeverityColor={getSeverityColor}
                      getImpactColor={getImpactColor}
                      getEffortColor={getEffortColor}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: CodeSuggestion;
  isExpanded: boolean;
  isApplied: boolean;
  isApplying: boolean;
  onToggle: () => void;
  onApply: () => void;
  getSeverityColor: (s: string) => string;
  getImpactColor: (i: string) => string;
  getEffortColor: (e: string) => string;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  isExpanded,
  isApplied,
  isApplying,
  onToggle,
  onApply,
  getSeverityColor,
  getImpactColor,
  getEffortColor,
}) => {
  return (
    <Card className={`p-4 border transition-all ${getSeverityColor(suggestion.severity)}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white">{suggestion.title}</h4>
            {isApplied && <CheckCircle className="w-4 h-4 text-green-400" />}
          </div>
          <p className="text-sm text-slate-400 mb-2">{suggestion.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs capitalize ${getImpactColor(suggestion.impact)}`}>
              Impact: {suggestion.impact}
            </Badge>
            <Badge variant="outline" className={`text-xs capitalize ${getEffortColor(suggestion.effort)}`}>
              Effort: {suggestion.effort}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {suggestion.filePath.split("/").pop()}
            </Badge>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1">EXPLANATION</p>
            <p className="text-sm text-slate-300">{suggestion.explanation}</p>
          </div>

          {suggestion.currentCode && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1">CURRENT CODE</p>
              <pre className="text-xs bg-slate-900/50 p-2 rounded overflow-x-auto text-slate-300">
                {suggestion.currentCode}
              </pre>
            </div>
          )}

          {suggestion.suggestedCode && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1">SUGGESTED CODE</p>
              <pre className="text-xs bg-slate-900/50 p-2 rounded overflow-x-auto text-green-300">
                {suggestion.suggestedCode}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 gap-1 text-xs"
                onClick={() => navigator.clipboard.writeText(suggestion.suggestedCode || "")}
              >
                <Copy className="w-3 h-3" />
                Copy Code
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {!isApplied && (
              <Button
                size="sm"
                onClick={onApply}
                disabled={isApplying}
                className="gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Apply Suggestion
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
