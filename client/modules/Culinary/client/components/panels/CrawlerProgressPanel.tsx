import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertCircle, Play, X, Zap, Brain, BookOpen, Plus, Trash2 } from 'lucide-react';
import { Progress } from '../ui/progress';
import { TrainingReportPanel } from './TrainingReportPanel';
import { useCrawler } from '@/context/CrawlerContext';

function generateTrainingReport(
  sessionId: string,
  recipesProcessed: number,
  knowledge: any
): any {
  const timestamp = Date.now();
  const startTime = timestamp;
  const duration = 300000;

  return {
    sessionId,
    timestamp,
    title: `Echo AI Training Report - ${new Date(startTime).toLocaleDateString()}`,
    overview: {
      duration: formatDuration(duration),
      recipesProcessed,
      recipesAnalyzed: Math.floor(recipesProcessed * 0.95),
      successRate: 95,
    },
    knowledgeAcquired: {
      section: "Knowledge Acquired",
      ingredientsTaught: knowledge.ingredientsTaught,
      techniquesLearned: knowledge.techniquesLearned,
      flavorProfilesAnalyzed: knowledge.flavorProfilesAnalyzed,
    },
  };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

interface CrawlerProgressPanelProps {
  onComplete?: (stats: any) => void;
  className?: string;
}

export function CrawlerProgressPanel({
  onComplete,
  className = '',
}: CrawlerProgressPanelProps) {
  const { sessions, startCrawler, stopCrawler, resetCrawler, clearMessages } = useCrawler();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [trainingReport, setTrainingReport] = useState<any>(null);
  const [defaultMode, setDefaultMode] = useState<'legacy' | 'global'>('global');
  const [defaultExtractFlavor, setDefaultExtractFlavor] = useState(true);
  const [defaultAutoLearn, setDefaultAutoLearn] = useState(true);

  const selectedSession = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) : sessions[0];

  useEffect(() => {
    if (selectedSession && !selectedSession.isRunning && selectedSession.knowledge.ingredientsTaught > 0) {
      const report = generateTrainingReport(
        selectedSession.sessionId,
        selectedSession.recipesProcessed,
        selectedSession.knowledge
      );
      setTrainingReport(report);
      if (onComplete) {
        onComplete(selectedSession.knowledge);
      }
    }
  }, [selectedSession, onComplete]);

  const handleStartCrawler = useCallback(async () => {
    try {
      const newSessionId = await startCrawler({
        mode: defaultMode,
        extractFlavorData: defaultExtractFlavor,
        autoLearn: defaultAutoLearn,
      });
      setSelectedSessionId(newSessionId);
    } catch (error) {
      console.error('Failed to start crawler:', error);
    }
  }, [startCrawler, defaultMode, defaultExtractFlavor, defaultAutoLearn]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Control Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                🌍 Phase 4: Global Recipe Crawler
              </CardTitle>
              <CardDescription>
                Run multiple trainings simultaneously from 30+ global recipe platforms
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleStartCrawler}
              disabled={sessions.some(s => s.isRunning)}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Training
            </Button>
          </div>
        </CardHeader>

        {/* Mode Selection & Options */}
        {sessions.length === 0 || !sessions.some(s => s.isRunning) ? (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium flex-shrink-0">Mode:</label>
                <select
                  value={defaultMode}
                  onChange={(e) => setDefaultMode(e.target.value as 'legacy' | 'global')}
                  className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600"
                >
                  <option value="legacy">Phase 1 (Legacy)</option>
                  <option value="global">Phase 4 (Global - Multi-source)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaultExtractFlavor}
                  onChange={(e) => setDefaultExtractFlavor(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Extract Flavor Matrix Data</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaultAutoLearn}
                  onChange={(e) => setDefaultAutoLearn(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Enable Auto-Learning Engine</span>
              </label>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Active Trainings ({sessions.filter(s => s.isRunning).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Session Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`px-3 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedSessionId === session.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {session.crawlerMode === 'global' ? '🌍' : '📚'} {session.progress}%
                </button>
              ))}
            </div>

            {/* Selected Session Details */}
            {selectedSession && (
              <div className="space-y-4">
                {/* Controls */}
                <div className="flex gap-2">
                  {selectedSession.isRunning ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => stopCrawler(selectedSession.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  ) : null}
                  {!selectedSession.isRunning && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetCrawler(selectedSession.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                  {selectedSession.messages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearMessages(selectedSession.id)}
                    >
                      Clear Messages
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      Recipes Processed: {selectedSession.recipesProcessed}/{selectedSession.totalRecipes}
                    </span>
                    <span className="text-gray-600">
                      {selectedSession.progress}%
                    </span>
                  </div>
                  <Progress value={selectedSession.progress} className="h-2" />
                </div>

                {/* Current Recipe */}
                {selectedSession.currentRecipe && (
                  <div className="space-y-2 bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Currently Analyzing:
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {selectedSession.currentRecipe}
                    </div>
                    {selectedSession.currentUrl && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {selectedSession.currentUrl}
                      </div>
                    )}
                  </div>
                )}

                {/* Status Messages */}
                {selectedSession.messages.length > 0 && (
                  <div className="space-y-1 max-h-24 overflow-y-auto bg-muted p-3 rounded border border-border/40">
                    {selectedSession.messages.map((msg, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {msg}
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {selectedSession.error && (
                  <div className="flex gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-600 dark:text-red-400">{selectedSession.error}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Knowledge Updates Section */}
      {selectedSession && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5" />
              AI Knowledge Learned from Recipes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Knowledge Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  Ingredients Taught
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {selectedSession.knowledge.ingredientsTaught}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                  Techniques Learned
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {selectedSession.knowledge.techniquesLearned}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                  Flavor Profiles
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {selectedSession.knowledge.flavorProfilesAnalyzed}
                </div>
              </div>
            </div>

            {/* Sources Used */}
            {selectedSession.sourcesUsed.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Sources Used ({selectedSession.sourcesUsed.length})</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSession.sourcesUsed.map((source, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
