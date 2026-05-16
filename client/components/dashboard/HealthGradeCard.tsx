/**
 * HealthGradeCard
 * Displays A-F letter grade with health score and trend indicator
 */

import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';

type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';
type Trend = 'improving' | 'stable' | 'declining';

interface HealthGradeCardProps {
  grade: HealthGrade;
  score: number;
  trend?: Trend;
  risks?: string[];
  loading?: boolean;
}

const HealthGradeCard: React.FC<HealthGradeCardProps> = ({
  grade,
  score,
  trend = 'stable',
  risks = [],
  loading = false,
}) => {
  const getGradeBgColor = (g: HealthGrade): string => {
    switch (g) {
      case 'A':
      case 'B':
        return 'bg-gradient-to-br from-green-500 to-emerald-600';
      case 'C':
        return 'bg-gradient-to-br from-yellow-500 to-amber-600';
      case 'D':
        return 'bg-gradient-to-br from-orange-500 to-red-600';
      case 'F':
        return 'bg-gradient-to-br from-red-600 to-rose-700';
    }
  };

  const getGradeLabel = (g: HealthGrade): string => {
    switch (g) {
      case 'A':
        return 'Excellent';
      case 'B':
        return 'Good';
      case 'C':
        return 'Fair';
      case 'D':
        return 'Poor';
      case 'F':
        return 'Critical';
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading health...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className={`${getGradeBgColor(grade)} p-8 text-white`}>
        <div className="text-center">
          <div className="text-7xl font-bold mb-2">{grade}</div>
          <div className="text-2xl font-semibold mb-1">{score.toFixed(1)}%</div>
          <div className="text-sm font-medium opacity-90">{getGradeLabel(grade)}</div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Trend Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              TREND
            </p>
            <div className="flex items-center gap-2">
              {trend === 'improving' && (
                <>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Improving
                  </span>
                </>
              )}
              {trend === 'stable' && (
                <span className="text-sm font-medium text-gray-600">
                  Stable
                </span>
              )}
              {trend === 'declining' && (
                <>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    Declining
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Risk Summary */}
        {risks.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900 mb-1">
                  {risks.length} Risk{risks.length !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-1">
                  {risks.slice(0, 2).map((risk, idx) => (
                    <li key={idx} className="text-xs text-amber-800">
                      • {risk}
                    </li>
                  ))}
                  {risks.length > 2 && (
                    <li className="text-xs text-amber-700 font-medium">
                      +{risks.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default HealthGradeCard;
