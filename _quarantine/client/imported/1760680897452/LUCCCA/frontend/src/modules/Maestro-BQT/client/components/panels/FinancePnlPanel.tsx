import React, { useState, useMemo } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';

interface CostBreakdown {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

const MetricCard: React.FC<{
  title: string;
  value: number;
  format?: 'currency' | 'percent';
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  color?: 'accent' | 'ok' | 'warn' | 'err';
}> = ({ title, value, format = 'currency', trend, subtitle, color = 'accent' }) => {
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(val);
    }
    if (format === 'percent') {
      return `${(val * 100).toFixed(1)}%`;
    }
    return val.toString();
  };

  const colorClasses = {
    accent: 'text-accent',
    ok: 'text-ok',
    warn: 'text-warn',
    err: 'text-err'
  };

  const trendIcon = {
    up: '📈',
    down: '📉',
    neutral: '➡️'
  };

  return (
    <div className="glass-panel p-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm text-muted">{title}</h4>
        {trend && <span>{trendIcon[trend]}</span>}
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]} mb-1`}>
        {formatValue(value)}
      </div>
      {subtitle && (
        <div className="text-xs text-muted">{subtitle}</div>
      )}
    </div>
  );
};

const CostBreakdownTable: React.FC<{ 
  breakdown: CostBreakdown[];
  title: string;
}> = ({ breakdown, title }) => {
  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default">
              <th className="text-left py-2 text-muted">Category</th>
              <th className="text-right py-2 text-muted">Planned</th>
              <th className="text-right py-2 text-muted">Actual</th>
              <th className="text-right py-2 text-muted">Variance</th>
              <th className="text-right py-2 text-muted">%</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((item, index) => (
              <tr key={index} className="border-b border-default/50">
                <td className="py-2 font-medium text-primary">{item.category}</td>
                <td className="py-2 text-right text-primary">
                  ${item.planned.toLocaleString()}
                </td>
                <td className="py-2 text-right text-primary">
                  ${item.actual.toLocaleString()}
                </td>
                <td className={`py-2 text-right font-medium ${
                  item.variance > 0 ? 'text-err' : item.variance < 0 ? 'text-ok' : 'text-muted'
                }`}>
                  {item.variance > 0 ? '+' : ''}${item.variance.toLocaleString()}
                </td>
                <td className={`py-2 text-right font-medium ${
                  item.variancePercent > 5 ? 'text-err' : 
                  item.variancePercent < -5 ? 'text-ok' : 'text-muted'
                }`}>
                  {item.variancePercent > 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProfitabilityChart: React.FC<{
  revenue: number;
  costs: number;
  targetMargin: number;
}> = ({ revenue, costs, targetMargin }) => {
  const profit = revenue - costs;
  const actualMargin = revenue > 0 ? profit / revenue : 0;
  const revenuePercent = 100;
  const costsPercent = revenue > 0 ? (costs / revenue) * 100 : 0;
  const profitPercent = 100 - costsPercent;

  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">Profitability Waterfall</h4>
      
      <div className="space-y-4">
        {/* Visual Chart */}
        <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-accent"
            style={{ width: `${revenuePercent}%` }}
          >
            <div className="p-2 text-white text-sm font-medium">
              Revenue
            </div>
          </div>
          
          <div 
            className="absolute top-0 right-0 h-full bg-err"
            style={{ width: `${costsPercent}%` }}
          >
            <div className="p-2 text-white text-sm font-medium text-right">
              Costs
            </div>
          </div>
          
          <div className="absolute top-0 left-0 h-full flex items-center justify-center">
            <div className="text-white font-bold">
              {actualMargin > 0 ? `${(actualMargin * 100).toFixed(1)}% Profit` : 'Loss'}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="w-4 h-4 bg-accent rounded mx-auto mb-1"></div>
            <div className="font-medium text-primary">Revenue</div>
            <div className="text-muted">${revenue.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="w-4 h-4 bg-err rounded mx-auto mb-1"></div>
            <div className="font-medium text-primary">Costs</div>
            <div className="text-muted">${costs.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className={`w-4 h-4 rounded mx-auto mb-1 ${profit > 0 ? 'bg-ok' : 'bg-warn'}`}></div>
            <div className="font-medium text-primary">Profit</div>
            <div className="text-muted">${profit.toLocaleString()}</div>
          </div>
        </div>
        
        {/* Target vs Actual */}
        <div className="pt-4 border-t border-default">
          <div className="flex justify-between items-center">
            <span className="text-muted">Target Margin:</span>
            <span className="font-medium text-primary">{(targetMargin * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Actual Margin:</span>
            <span className={`font-medium ${
              actualMargin >= targetMargin ? 'text-ok' : 'text-err'
            }`}>
              {(actualMargin * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CashflowProjection: React.FC<{
  initialPayment: number;
  finalPayment: number;
  expenses: number;
  paymentSchedule: Array<{ date: string; amount: number; description: string }>;
}> = ({ initialPayment, finalPayment, expenses, paymentSchedule }) => {
  const runningBalance = paymentSchedule.reduce((acc, payment, index) => {
    const balance = index === 0 ? payment.amount : acc[index - 1].balance + payment.amount;
    acc.push({ ...payment, balance });
    return acc;
  }, [] as Array<{ date: string; amount: number; description: string; balance: number }>);

  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">Cashflow Projection</h4>
      
      <div className="space-y-3">
        {runningBalance.map((item, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-default/50 last:border-b-0">
            <div>
              <div className="font-medium text-primary">{item.description}</div>
              <div className="text-xs text-muted">{new Date(item.date).toLocaleDateString()}</div>
            </div>
            <div className="text-right">
              <div className={`font-medium ${item.amount >= 0 ? 'text-ok' : 'text-err'}`}>
                {item.amount >= 0 ? '+' : ''}${item.amount.toLocaleString()}
              </div>
              <div className="text-xs text-muted">
                Balance: ${item.balance.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-default">
        <div className="flex justify-between items-center">
          <span className="font-medium text-primary">Final Balance:</span>
          <span className={`text-lg font-bold ${
            runningBalance[runningBalance.length - 1]?.balance > 0 ? 'text-ok' : 'text-err'
          }`}>
            ${runningBalance[runningBalance.length - 1]?.balance.toLocaleString() || '0'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const FinancePnlPanel: React.FC<{
  eventId?: string;
}> = ({ eventId }) => {
  const { currentEvent } = useEventStore();
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'cashflow'>('summary');

  const financialData = useMemo(() => {
    if (!currentEvent) return null;

    const { budget, menu, guestCount } = currentEvent;
    
    // Calculate actual costs based on menu
    const menuCosts = Object.values(menu).flat().reduce((sum, item) => sum + item.cost, 0);
    const actualFoodCost = menuCosts * guestCount;
    
    // For demo purposes, add some variance to actual costs
    const actualLaborCost = budget.laborCost * 1.08; // 8% over budget
    const actualVenueCost = budget.venueCost; // On budget
    const actualMiscCost = budget.totalRevenue * 0.05; // 5% for misc expenses
    
    const totalActualCosts = actualFoodCost + actualLaborCost + actualVenueCost + actualMiscCost;
    const profit = budget.totalRevenue - totalActualCosts;
    const actualMargin = profit / budget.totalRevenue;
    
    const costBreakdown: CostBreakdown[] = [
      {
        category: 'Food & Beverage',
        planned: budget.foodCost,
        actual: actualFoodCost,
        variance: actualFoodCost - budget.foodCost,
        variancePercent: ((actualFoodCost - budget.foodCost) / budget.foodCost) * 100
      },
      {
        category: 'Labor',
        planned: budget.laborCost,
        actual: actualLaborCost,
        variance: actualLaborCost - budget.laborCost,
        variancePercent: ((actualLaborCost - budget.laborCost) / budget.laborCost) * 100
      },
      {
        category: 'Venue',
        planned: budget.venueCost,
        actual: actualVenueCost,
        variance: actualVenueCost - budget.venueCost,
        variancePercent: budget.venueCost > 0 ? ((actualVenueCost - budget.venueCost) / budget.venueCost) * 100 : 0
      },
      {
        category: 'Miscellaneous',
        planned: 500,
        actual: actualMiscCost,
        variance: actualMiscCost - 500,
        variancePercent: ((actualMiscCost - 500) / 500) * 100
      }
    ];

    const cashflowSchedule = [
      { date: '2024-03-01', amount: budget.totalRevenue * 0.5, description: 'Initial Deposit (50%)' },
      { date: '2024-06-01', amount: -actualFoodCost * 0.3, description: 'Food Pre-Payment' },
      { date: '2024-06-10', amount: -actualVenueCost, description: 'Venue Payment' },
      { date: '2024-06-15', amount: budget.totalRevenue * 0.5, description: 'Final Payment (50%)' },
      { date: '2024-06-15', amount: -actualLaborCost, description: 'Labor Costs' },
      { date: '2024-06-15', amount: -actualFoodCost * 0.7, description: 'Final Food Payment' },
      { date: '2024-06-15', amount: -actualMiscCost, description: 'Miscellaneous Expenses' }
    ];

    return {
      revenue: budget.totalRevenue,
      plannedCosts: budget.foodCost + budget.laborCost + budget.venueCost,
      actualCosts: totalActualCosts,
      profit,
      plannedMargin: budget.profitMargin,
      actualMargin,
      costBreakdown,
      cashflowSchedule,
      guestCount
    };
  }, [currentEvent]);

  if (!currentEvent || !financialData) {
    return (
      <PanelShell title="Finance: P&L & Cashflow">
        <div className="text-center text-muted">No event selected</div>
      </PanelShell>
    );
  }

  const {
    revenue,
    plannedCosts,
    actualCosts,
    profit,
    plannedMargin,
    actualMargin,
    costBreakdown,
    cashflowSchedule,
    guestCount
  } = financialData;

  const revenuePerGuest = revenue / guestCount;
  const costPerGuest = actualCosts / guestCount;
  const profitPerGuest = profit / guestCount;

  const toolbarRight = (
    <div className="flex gap-1 bg-panel rounded-lg p-1">
      {[
        { id: 'summary', label: '📊 Summary' },
        { id: 'detailed', label: '📈 Detailed' },
        { id: 'cashflow', label: '💰 Cashflow' }
      ].map((mode) => (
        <button
          key={mode.id}
          onClick={() => setViewMode(mode.id as any)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            viewMode === mode.id
              ? 'bg-accent text-white'
              : 'text-muted hover:text-primary hover:bg-muted/10'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );

  return (
    <PanelShell title="Finance: P&L & Cashflow" toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {viewMode === 'summary' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Revenue"
                value={revenue}
                color="accent"
                subtitle={`$${revenuePerGuest.toFixed(0)} per guest`}
              />
              <MetricCard
                title="Total Costs"
                value={actualCosts}
                color={actualCosts > plannedCosts ? 'err' : 'ok'}
                trend={actualCosts > plannedCosts ? 'up' : 'down'}
                subtitle={`$${costPerGuest.toFixed(0)} per guest`}
              />
              <MetricCard
                title="Net Profit"
                value={profit}
                color={profit > 0 ? 'ok' : 'err'}
                subtitle={`$${profitPerGuest.toFixed(0)} per guest`}
              />
              <MetricCard
                title="Profit Margin"
                value={actualMargin}
                format="percent"
                color={actualMargin >= plannedMargin ? 'ok' : 'warn'}
                trend={actualMargin >= plannedMargin ? 'up' : 'down'}
                subtitle={`Target: ${(plannedMargin * 100).toFixed(1)}%`}
              />
            </div>

            {/* Profitability Chart */}
            <ProfitabilityChart
              revenue={revenue}
              costs={actualCosts}
              targetMargin={plannedMargin}
            />
          </>
        )}

        {viewMode === 'detailed' && (
          <>
            {/* Cost Variance Analysis */}
            <CostBreakdownTable
              breakdown={costBreakdown}
              title="Cost Variance Analysis"
            />

            {/* Per Guest Analysis */}
            <div className="glass-panel p-4">
              <h4 className="font-semibold text-accent mb-4">Per Guest Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">${revenuePerGuest.toFixed(0)}</div>
                  <div className="text-sm text-muted">Revenue per Guest</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-err">${costPerGuest.toFixed(0)}</div>
                  <div className="text-sm text-muted">Cost per Guest</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${profit > 0 ? 'text-ok' : 'text-err'}`}>
                    ${profitPerGuest.toFixed(0)}
                  </div>
                  <div className="text-sm text-muted">Profit per Guest</div>
                </div>
              </div>
            </div>
          </>
        )}

        {viewMode === 'cashflow' && (
          <CashflowProjection
            initialPayment={revenue * 0.5}
            finalPayment={revenue * 0.5}
            expenses={actualCosts}
            paymentSchedule={cashflowSchedule}
          />
        )}

        {/* Alert Section */}
        {actualMargin < plannedMargin * 0.8 && (
          <div className="glass-panel p-4 border-l-4 border-warn">
            <div className="flex items-start gap-3">
              <span className="text-warn text-xl">⚠️</span>
              <div>
                <h4 className="font-semibold text-warn">Margin Alert</h4>
                <p className="text-sm text-muted mt-1">
                  Profit margin is significantly below target. Consider reviewing cost allocations or adjusting pricing for future events.
                </p>
                <div className="mt-2 text-xs">
                  <span className="text-muted">Current: </span>
                  <span className="font-medium text-warn">{(actualMargin * 100).toFixed(1)}%</span>
                  <span className="text-muted mx-2">•</span>
                  <span className="text-muted">Target: </span>
                  <span className="font-medium text-primary">{(plannedMargin * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
};

export default FinancePnlPanel;
