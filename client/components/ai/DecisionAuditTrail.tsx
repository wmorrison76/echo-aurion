import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, BarChart3, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { toast } from '../ui/use-toast';

interface AIDecision {
  id: string;
  date: string;
  type: 'staffing' | 'demand-forecast' | 'overtime-prediction' | 'schedule-optimization';
  prediction: string;
  actual: string;
  accuracy: number;
  confidence: number;
  managerAction: 'approved' | 'modified' | 'rejected' | 'pending';
  impact: string;
  notes?: string;
  versions: number;
  changedAt?: string;
}

interface DecisionAuditTrailProps {
  organizationId: string;
  days?: number;
}

const DecisionAuditTrail: React.FC<DecisionAuditTrailProps> = ({ organizationId, days = 30 }) => {
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'accuracy' | 'type'>('date');
  const [filterType, setFilterType] = useState<'all' | 'staffing' | 'forecast' | 'overtime' | 'schedule'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDecisions();
  }, [organizationId, days, filterType, sortBy]);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/ai/decisions?org_id=${organizationId}&days=${days}&type=${filterType}&sort=${sortBy}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) throw new Error('Failed to fetch decisions');

      const data = await response.json();
      setDecisions(data.decisions || generateMockDecisions());
    } catch (error) {
      console.error('Audit trail error:', error);
      setDecisions(generateMockDecisions());
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'staffing':
        return 'bg-blue-100 text-blue-800';
      case 'demand-forecast':
        return 'bg-purple-100 text-purple-800';
      case 'overtime-prediction':
        return 'bg-orange-100 text-orange-800';
      case 'schedule-optimization':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'modified':
        return 'bg-blue-50 border-blue-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return '';
    }
  };

  const filteredDecisions = decisions.filter((d) =>
    searchTerm === '' ||
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.type.includes(searchTerm.toLowerCase()) ||
    d.prediction.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: decisions.length,
    avgAccuracy: Math.round(decisions.reduce((a, d) => a + d.accuracy, 0) / decisions.length),
    approved: decisions.filter((d) => d.managerAction === 'approved').length,
    modified: decisions.filter((d) => d.managerAction === 'modified').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">AI Decision Audit Trail</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review all AI recommendations from the last {days} days
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Decisions</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Avg Accuracy</p>
              <p className="text-3xl font-bold text-green-600">{stats.avgAccuracy}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Modified</p>
              <p className="text-3xl font-bold text-orange-600">{stats.modified}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Search</label>
          <Input
            placeholder="Search decisions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="min-w-[150px]">
          <label className="text-sm font-medium mb-2 block">Type</label>
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="staffing">Staffing</SelectItem>
              <SelectItem value="forecast">Demand Forecast</SelectItem>
              <SelectItem value="overtime">Overtime Prediction</SelectItem>
              <SelectItem value="schedule">Schedule Optimization</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[150px]">
          <label className="text-sm font-medium mb-2 block">Sort By</label>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date (Newest)</SelectItem>
              <SelectItem value="accuracy">Accuracy (Best)</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading decisions...
            </CardContent>
          </Card>
        ) : filteredDecisions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No decisions found
            </CardContent>
          </Card>
        ) : (
          filteredDecisions.map((decision) => (
            <Card key={decision.id} className={`transition-colors ${getActionColor(decision.managerAction)}`}>
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={getTypeColor(decision.type)}>
                          {decision.type.replace('-', ' ')}
                        </Badge>
                        <Badge variant={decision.accuracy >= 85 ? 'default' : 'secondary'}>
                          {decision.accuracy}% accurate
                        </Badge>
                        <Badge variant="outline">{decision.managerAction}</Badge>
                        {decision.versions > 1 && (
                          <Badge variant="outline">
                            v{decision.versions}
                            <AlertCircle className="w-3 h-3 ml-1" />
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold">
                        {decision.prediction}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(decision.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="text-lg font-bold text-blue-600">{decision.confidence}%</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === decision.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Details */}
                {expandedId === decision.id && (
                  <CardContent className="border-t pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Prediction</p>
                        <p className="font-mono text-sm p-2 bg-muted rounded">
                          {decision.prediction}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Actual Result</p>
                        <p className="font-mono text-sm p-2 bg-muted rounded">
                          {decision.actual}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Confidence</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${decision.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{decision.confidence}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Manager Action</p>
                        <Badge variant="outline" className="capitalize">
                          {decision.managerAction}
                        </Badge>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Impact</p>
                        <p className="text-sm">{decision.impact}</p>
                      </div>
                      {decision.notes && (
                        <div className="md:col-span-2">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm italic text-muted-foreground">
                            "{decision.notes}"
                          </p>
                        </div>
                      )}
                      {decision.changedAt && (
                        <div className="md:col-span-2">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Decision Updated</p>
                          <p className="text-sm">
                            This decision was revised on{' '}
                            {new Date(decision.changedAt).toLocaleDateString('en-US')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                        <BarChart3 className="w-4 h-4" />
                        View Analysis
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        View History
                      </Button>
                    </div>
                  </CardContent>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================

function generateMockDecisions(): AIDecision[] {
  const types: AIDecision['type'][] = [
    'staffing',
    'demand-forecast',
    'overtime-prediction',
    'schedule-optimization',
  ];
  const actions: AIDecision['managerAction'][] = ['approved', 'modified', 'rejected', 'pending'];

  const decisions: AIDecision[] = [];
  const today = new Date();

  for (let i = 0; i < 25; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    const type = types[Math.floor(Math.random() * types.length)];
    const accuracy = 70 + Math.floor(Math.random() * 30);

    decisions.push({
      id: `decision-${i}`,
      date: date.toISOString(),
      type,
      prediction: generatePrediction(type),
      actual: generateActual(type),
      accuracy,
      confidence: 75 + Math.floor(Math.random() * 20),
      managerAction: actions[Math.floor(Math.random() * actions.length)],
      impact: `Impact: ${Math.floor(Math.random() * 500)} hours optimized`,
      notes:
        Math.random() > 0.5
          ? 'Manager noted: Review before implementation'
          : undefined,
      versions: Math.random() > 0.7 ? 2 : 1,
      changedAt: Math.random() > 0.7 ? new Date(Date.now() - 86400000).toISOString() : undefined,
    });
  }

  return decisions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generatePrediction(type: AIDecision['type']): string {
  switch (type) {
    case 'staffing':
      return 'Recommend 12 staff on Saturday (95% confidence)';
    case 'demand-forecast':
      return 'Expected 180 covers on Friday (88% confidence)';
    case 'overtime-prediction':
      return '3 employees at high overtime risk (82% confidence)';
    case 'schedule-optimization':
      return 'Optimize schedule to reduce labor cost by 8%';
    default:
      return 'AI Recommendation';
  }
}

function generateActual(type: AIDecision['type']): string {
  switch (type) {
    case 'staffing':
      return '11 staff scheduled, 175 covers served';
    case 'demand-forecast':
      return '172 actual covers served';
    case 'overtime-prediction':
      return '2 employees actually went into overtime';
    case 'schedule-optimization':
      return 'Realized 7.5% labor cost reduction';
    default:
      return 'Actual Result';
  }
}

export default DecisionAuditTrail;
