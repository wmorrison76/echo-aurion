/**
 * Ecosystem Control Panel - Phase 6: AI Integration
 * Decision support, recommendations, and intelligent insights
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/button';
import {
  Lightbulb,
  Zap,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Recommendation {
  id: string;
  type: 'staffing' | 'access' | 'performance' | 'compliance' | 'optimization';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  action?: string;
  reasoning: string;
  timestamp: Date;
}

interface AIInsight {
  id: string;
  category: string;
  title: string;
  content: string;
  data: Record<string, any>;
  generatedAt: Date;
}

interface EcosystemAIIntegrationProps {
  recommendations?: Recommendation[];
  insights?: AIInsight[];
  onGetRecommendations?: (type?: string) => Promise<Recommendation[]>;
  onGetInsights?: () => Promise<AIInsight[]>;
  onApplyRecommendation?: (recommendationId: string) => Promise<void>;
  onDismissRecommendation?: (recommendationId: string) => Promise<void>;
  onFeedback?: (recommendationId: string, helpful: boolean) => Promise<void>;
}

const RECOMMENDATION_ICONS: Record<string, React.ReactNode> = {
  staffing: <Users className="h-5 w-5" />,
  access: <Zap className="h-5 w-5" />,
  performance: <TrendingUp className="h-5 w-5" />,
  compliance: <AlertTriangle className="h-5 w-5" />,
  optimization: <Lightbulb className="h-5 w-5" />,
};

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

export const EcosystemAIIntegration: React.FC<EcosystemAIIntegrationProps> = ({
  recommendations = [],
  insights = [],
  onGetRecommendations,
  onGetInsights,
  onApplyRecommendation,
  onDismissRecommendation,
  onFeedback,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch recommendations
  const handleGetRecommendations = useCallback(async (type?: string) => {
    if (!onGetRecommendations) return;

    setIsLoading(true);
    try {
      await onGetRecommendations(type);
      toast({
        title: 'Recommendations loaded',
        description: 'AI has generated new recommendations',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate recommendations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onGetRecommendations, toast]);

  // Fetch insights
  const handleGetInsights = useCallback(async () => {
    if (!onGetInsights) return;

    setIsLoading(true);
    try {
      await onGetInsights();
      toast({
        title: 'Insights generated',
        description: 'AI analysis complete',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate insights',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onGetInsights, toast]);

  // Apply recommendation
  const handleApply = useCallback(
    async (recommendationId: string) => {
      if (!onApplyRecommendation) return;

      try {
        await onApplyRecommendation(recommendationId);
        toast({
          title: 'Recommendation applied',
          description: 'The system has been updated',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to apply',
          variant: 'destructive',
        });
      }
    },
    [onApplyRecommendation, toast]
  );

  // Dismiss recommendation
  const handleDismiss = useCallback(
    async (recommendationId: string) => {
      if (!onDismissRecommendation) return;

      try {
        await onDismissRecommendation(recommendationId);
        setDismissedIds(prev => new Set([...prev, recommendationId]));
        toast({
          title: 'Dismissed',
          description: 'Recommendation removed from view',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to dismiss',
          variant: 'destructive',
        });
      }
    },
    [onDismissRecommendation, toast]
  );

  // Send feedback
  const handleFeedback = useCallback(
    async (recommendationId: string, helpful: boolean) => {
      if (!onFeedback) return;

      try {
        await onFeedback(recommendationId, helpful);
        toast({
          title: 'Feedback received',
          description: 'Thank you for your feedback',
        });
      } catch (error) {
        console.error('Feedback error:', error);
      }
    },
    [onFeedback, toast]
  );

  const activeRecommendations = recommendations.filter(r => !dismissedIds.has(r.id));
  const highImpactCount = activeRecommendations.filter(r => r.impact === 'high').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Active Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRecommendations.length}</div>
            <div className="text-xs text-red-600 mt-1 font-medium">
              {highImpactCount} high-impact
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeRecommendations.length > 0
                ? Math.round(
                  activeRecommendations.reduce((sum, r) => sum + r.confidence, 0) /
                  activeRecommendations.length
                )
                : 0}
              %
            </div>
            <div className="text-xs text-gray-600 mt-1">AI confidence score</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Potential Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12%</div>
            <div className="text-xs text-gray-600 mt-1">If all applied</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {/* Generate Button */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleGetRecommendations()}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Lightbulb className="h-4 w-4" />
              Generate Recommendations
            </Button>
          </div>

          {/* Recommendations List */}
          {activeRecommendations.length > 0 ? (
            <div className="space-y-3">
              {activeRecommendations.map(rec => (
                <Card
                  key={rec.id}
                  className={cn(
                    'border-l-4',
                    rec.impact === 'high' && 'border-l-red-500',
                    rec.impact === 'medium' && 'border-l-yellow-500',
                    rec.impact === 'low' && 'border-l-blue-500'
                  )}
                >
                  <CardContent className="pt-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1 text-gray-600">
                          {RECOMMENDATION_ICONS[rec.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {rec.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {rec.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={cn('text-xs', IMPACT_COLORS[rec.impact])}>
                          {rec.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rec.confidence}% confident
                        </Badge>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="p-2 bg-gray-50 rounded text-xs text-gray-700 mb-3">
                      <p className="font-medium mb-1">Why:</p>
                      <p>{rec.reasoning}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {rec.action && (
                        <Button
                          size="sm"
                          onClick={() => handleApply(rec.id)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Apply
                        </Button>
                      )}

                      <div className="flex items-center gap-1 ml-auto border rounded-lg p-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-600"
                          onClick={() => handleFeedback(rec.id, true)}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-600"
                          onClick={() => handleFeedback(rec.id, false)}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-600 h-7"
                        onClick={() => handleDismiss(rec.id)}
                      >
                        Dismiss
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Generated {rec.timestamp.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">
                No active recommendations. Generate new ones to get started.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          {/* Generate Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleGetInsights}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Zap className="h-4 w-4" />
              Generate Insights
            </Button>
          </div>

          {/* Insights List */}
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map(insight => (
                <Card key={insight.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {insight.title}
                    </CardTitle>
                    <CardDescription>{insight.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700">{insight.content}</p>

                    {/* Data Points */}
                    {Object.entries(insight.data).length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(insight.data).map(([key, value]) => (
                          <div
                            key={key}
                            className="p-2 bg-gray-50 rounded text-xs"
                          >
                            <p className="text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p className="font-medium text-gray-900">
                              {typeof value === 'number'
                                ? value.toLocaleString()
                                : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      {insight.generatedAt.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">
                No insights generated yet. Click above to generate AI insights.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EcosystemAIIntegration;
