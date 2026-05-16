import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';

interface ReportSectionProps {
  title: string;
  data: Record<string, number | string>;
  type?: 'stats' | 'categories' | 'recommendations';
}

interface TrainingReportPanelProps {
  report: {
    sessionId: string;
    timestamp: number;
    title: string;
    overview: {
      duration: string;
      recipesProcessed: number;
      recipesAnalyzed: number;
      successRate: number;
    };
    knowledgeAcquired: {
      section: string;
      ingredientsTaught: number;
      ingredientsByCategory: Record<string, number>;
      techniquesLearned: number;
      techniquesByCategory: Record<string, number>;
      flavorProfilesAnalyzed: number;
      flavorProfileBreakdown: Record<string, number>;
    };
    unknownTermsDiscovered: {
      section: string;
      total: number;
      terms: string[];
      recommendedLearningActions: string[];
    };
    sourcesCrawled: {
      section: string;
      sources: Array<{
        name: string;
        recipesFound: number;
        uniqueIngredients: number;
      }>;
    };
    recommendations: {
      nextSteps: string[];
      areasForImprovement: string[];
      suggestedCrawlTargets: string[];
    };
    markdown: string;
  };
  onClose?: () => void;
}

function ReportSection({ title, data, type = 'stats' }: ReportSectionProps) {
  if (type === 'stats') {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-400">{key}</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'categories') {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="space-y-1">
          {Object.entries(data)
            .filter(([, value]) => value > 0)
            .map(([category, count]) => (
              <div key={category} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">{category}</span>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <ul className="space-y-1">
        {Object.values(data).map((item, i) => (
          <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
            <span>▸</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrainingReportPanel({
  report,
  onClose,
}: TrainingReportPanelProps) {
  const downloadReport = () => {
    const element = document.createElement('a');
    const file = new Blob([report.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `training-report-${report.sessionId}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl mb-2">{report.title}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Session {report.sessionId} • {new Date(report.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadReport}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              {onClose && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Training Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportSection
            title="Session Stats"
            data={report.overview}
            type="stats"
          />
        </CardContent>
      </Card>

      {/* Knowledge Acquired */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Knowledge Acquired
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Ingredients</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {report.knowledgeAcquired.ingredientsTaught}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Techniques</div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {report.knowledgeAcquired.techniquesLearned}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Flavor Profiles</div>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {report.knowledgeAcquired.flavorProfilesAnalyzed}
              </div>
            </div>
          </div>

          <ReportSection
            title="Ingredients by Category"
            data={report.knowledgeAcquired.ingredientsByCategory}
            type="categories"
          />

          <ReportSection
            title="Techniques by Category"
            data={report.knowledgeAcquired.techniquesByCategory}
            type="categories"
          />

          <ReportSection
            title="Flavor Profile Breakdown"
            data={report.knowledgeAcquired.flavorProfileBreakdown}
            type="categories"
          />
        </CardContent>
      </Card>

      {/* Unknown Terms */}
      {report.unknownTermsDiscovered.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Unknown Terms Discovered ({report.unknownTermsDiscovered.total})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Recommended Learning Actions
              </h4>
              <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                {report.unknownTermsDiscovered.recommendedLearningActions.map((action, i) => (
                  <li key={i} className="flex gap-2">
                    <span>▸</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                Top {Math.min(20, report.unknownTermsDiscovered.terms.length)} Terms
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.unknownTermsDiscovered.terms.slice(0, 20).map((term, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources Crawled */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sources Crawled</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.sourcesCrawled.sources.map((source, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{source.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {source.recipesFound} recipes • {source.uniqueIngredients} unique ingredients
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReportSection
            title="Next Steps"
            data={Object.fromEntries(
              report.recommendations.nextSteps.map((s, i) => [
                `Step ${i + 1}`,
                s.substring(0, 50) + (s.length > 50 ? '...' : ''),
              ])
            )}
            type="recommendations"
          />

          <ReportSection
            title="Areas for Improvement"
            data={Object.fromEntries(
              report.recommendations.areasForImprovement.map((a, i) => [
                `${i + 1}`,
                a,
              ])
            )}
            type="recommendations"
          />

          <ReportSection
            title="Suggested Crawl Targets"
            data={Object.fromEntries(
              report.recommendations.suggestedCrawlTargets.map((t, i) => [
                `${i + 1}`,
                t,
              ])
            )}
            type="recommendations"
          />
        </CardContent>
      </Card>
    </div>
  );
}
