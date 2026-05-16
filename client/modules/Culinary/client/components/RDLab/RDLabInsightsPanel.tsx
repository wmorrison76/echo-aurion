import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  Zap,
  Brain,
  Target,
  Lightbulb,
  Beaker,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { LabExperiment } from "@/stores/rdLabStore";
import { extractRDLabInsights } from "@/lib/rdlab-insights";
import {
  getTextureDefinition,
  getTexturePairings,
} from "@/lib/rdlab-texture-reference";

interface RDLabInsightsPanelProps {
  experiments: LabExperiment[];
  focusExperimentId?: string;
}

export function RDLabInsightsPanel({
  experiments,
  focusExperimentId,
}: RDLabInsightsPanelProps) {
  const insights = useMemo(() => extractRDLabInsights(experiments), [experiments]);
  const focusExperiment = experiments.find((e) => e.id === focusExperimentId);

  return (
    <div className="space-y-4 text-sm">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {experiments.filter((e) => e.status === "ready").length}
            </div>
            <div className="text-xs text-green-600 dark:text-green-300">
              Ready Experiments
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-amber-50 dark:from-blue-950/20 dark:to-neutral-950/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {experiments.length}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-300">
              Total Experiments
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Insights Tabs */}
      <Tabs defaultValue="success" className="w-full">
        <TabsList className="grid w-full grid-cols-4 text-xs">
          <TabsTrigger value="success">Success</TabsTrigger>
          <TabsTrigger value="texture">Texture</TabsTrigger>
          <TabsTrigger value="mg">MG Tech</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Success Patterns Tab */}
        <TabsContent value="success" className="space-y-3 mt-3">
          {insights.successPatterns.length > 0 ? (
            <>
              {insights.successPatterns.slice(0, 4).map((pattern) => (
                <Card key={pattern.pattern} className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {pattern.pattern}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {pattern.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {pattern.frequency}x
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {(pattern.avgSuccessRate * 100).toFixed(0)}% success
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Complete experiments to unlock success patterns
              </AlertDescription>
            </Alert>
          )}

          {/* Failure Patterns */}
          {insights.failurePatterns.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Common Challenges
              </h4>
              {insights.failurePatterns.slice(0, 2).map((failure) => (
                <Card
                  key={failure.issue}
                  className="border-amber-200 dark:border-amber-800"
                >
                  <CardContent className="pt-3">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      {failure.issue}
                    </p>
                    {failure.workaround && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        💡 {failure.workaround}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Texture Insights Tab */}
        <TabsContent value="texture" className="space-y-3 mt-3">
          {insights.textureInsights.length > 0 ? (
            insights.textureInsights.slice(0, 3).map((texture) => (
              <Card key={texture.texture}>
                <CardContent className="pt-3">
                  <div className="font-medium mb-2">{texture.texture}</div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {getTextureDefinition(texture.texture)}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">
                        Pairs Well With:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {getTexturePairings(texture.texture)
                          .slice(0, 3)
                          .map((pairing) => (
                            <Badge
                              key={pairing}
                              variant="secondary"
                              className="text-xs"
                            >
                              {pairing}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Success Rate
                      </span>
                      <span className="font-medium">
                        {(texture.successRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert>
              <AlertDescription>
                Add texture objectives to experiments
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Molecular Gastronomy Tab */}
        <TabsContent value="mg" className="space-y-3 mt-3">
          {insights.molecularGastronomy.length > 0 ? (
            insights.molecularGastronomy.slice(0, 4).map((technique) => (
              <Card key={technique.technique}>
                <CardContent className="pt-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{technique.technique}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {technique.usage}x
                      </p>
                    </div>
                    <Badge variant="outline">
                      {(technique.successRate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  {technique.relatedTextures.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Textures:</p>
                      <div className="flex flex-wrap gap-1">
                        {technique.relatedTextures.map((texture) => (
                          <Badge key={texture} variant="secondary" className="text-xs">
                            {texture}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert>
              <AlertDescription>
                No molecular gastronomy techniques detected
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-3 mt-3">
          {insights.trendingTechniques.length > 0 ? (
            <div className="space-y-3">
              {insights.trendingTechniques.map((trend) => (
                <Card key={trend.technique}>
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{trend.technique}</p>
                      <span
                        className={`text-xs font-medium ${
                          trend.trend === "rising"
                            ? "text-green-600 dark:text-green-400"
                            : trend.trend === "stable"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {trend.trend === "rising" && "↑ Rising"}
                        {trend.trend === "stable" && "→ Stable"}
                        {trend.trend === "declining" && "↓ Declining"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Recent usage: {trend.recentExperiments} •{" "}
                      {(trend.successRate * 100).toFixed(0)}% success
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Trending data will appear as you experiment
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Team Recommendations */}
      {insights.teamRecommendations.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4" /> AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.teamRecommendations.map((rec, idx) => (
              <div key={idx} className="text-xs flex gap-2">
                <span className="text-purple-600 dark:text-purple-400">→</span>
                <span className="text-foreground">{rec}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
