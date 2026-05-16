/**
 * DetailedPnLView
 * Displays complete P&L statement with line items
 * Only shown to users with VIEW_DETAILED_PNL permission
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PayrollDataBreakdown } from '../../lib/financial-panel-hooks';

interface DetailedPnLViewProps {
  revenue: number;
  cogs: number;
  cogs_percentage: number;
  labor_cost: number;
  labor_percentage: number;
  overhead_cost: number;
  overhead_percentage: number;
  net_profit: number;
  net_margin: number;
  payroll_data?: PayrollDataBreakdown;
  loading?: boolean;
  expandable?: boolean;
}

interface PnLLineProps {
  label: string;
  amount: number;
  percentage?: number;
  isSubtotal?: boolean;
  isDanger?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}

const PnLLine: React.FC<PnLLineProps> = ({
  label,
  amount,
  percentage,
  isSubtotal = false,
  isDanger = false,
  expandable = false,
  expanded = false,
  onToggle,
  children,
}) => {
  return (
    <div>
      <div
        className={`flex items-center gap-2 p-3 rounded ${
          isSubtotal
            ? 'bg-slate-100 font-semibold border-t-2 border-slate-300'
            : isDanger
            ? 'bg-red-50'
            : ''
        } ${expandable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={expandable ? onToggle : undefined}
      >
        {expandable && (
          <button className="p-0 h-6 w-6 flex items-center justify-center">
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="flex-1">
          <p className={`text-sm ${isSubtotal ? 'font-semibold' : 'font-medium'}`}>
            {label}
          </p>
        </div>

        <div className="text-right">
          <p className={`text-sm font-semibold ${isDanger ? 'text-red-700' : ''}`}>
            ${Math.abs(amount).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          {percentage !== undefined && (
            <p className="text-xs text-muted-foreground">
              {percentage.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {expandable && expanded && children && (
        <div className="bg-slate-50 border-l-2 border-slate-300 ml-6">
          {children}
        </div>
      )}
    </div>
  );
};

const DetailedPnLView: React.FC<DetailedPnLViewProps> = ({
  revenue,
  cogs,
  cogs_percentage,
  labor_cost,
  labor_percentage,
  overhead_cost,
  overhead_percentage,
  net_profit,
  net_margin,
  payroll_data,
  loading = false,
  expandable = true,
}) => {
  const [expandedSections, setExpandedSections] = React.useState<
    Record<string, boolean>
  >({
    cogs: false,
    labor: false,
    overhead: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const totalExpenses = cogs + labor_cost + overhead_cost;
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Statement</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading P&L...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L Statement</CardTitle>
        <CardDescription>
          Complete profit & loss breakdown
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {/* Revenue */}
          <PnLLine
            label="Revenue"
            amount={revenue}
            isSubtotal={false}
          />

          {/* COGS */}
          <PnLLine
            label="Cost of Goods Sold"
            amount={-cogs}
            percentage={cogs_percentage}
            isDanger={cogs_percentage > 35}
            expandable={expandable}
            expanded={expandedSections.cogs}
            onToggle={() => toggleSection('cogs')}
          >
            <PnLLine
              label="Food & Beverage"
              amount={-(cogs * 0.7)}
            />
            <PnLLine
              label="Packaging & Waste"
              amount={-(cogs * 0.3)}
            />
          </PnLLine>

          {/* Gross Profit */}
          <PnLLine
            label="Gross Profit"
            amount={grossProfit}
            percentage={grossMargin}
            isSubtotal={true}
          />

          {/* Labor */}
          <PnLLine
            label="Labor Costs"
            amount={-labor_cost}
            percentage={labor_percentage}
            isDanger={labor_percentage > 35}
            expandable={expandable}
            expanded={expandedSections.labor}
            onToggle={() => toggleSection('labor')}
          >
            {payroll_data ? (
              <>
                <PnLLine
                  label="Salaries & Wages"
                  amount={-(payroll_data.wages || 0)}
                />
                <PnLLine
                  label="Payroll Taxes"
                  amount={-(payroll_data.taxes || 0)}
                />
                <PnLLine
                  label="Benefits"
                  amount={-(payroll_data.benefits || 0)}
                />
              </>
            ) : (
              <>
                <PnLLine
                  label="Salaries & Wages"
                  amount={-(labor_cost * 0.85)}
                />
                <PnLLine
                  label="Payroll Taxes & Benefits"
                  amount={-(labor_cost * 0.15)}
                />
              </>
            )}
          </PnLLine>

          {/* Overhead */}
          <PnLLine
            label="Operating Expenses"
            amount={-overhead_cost}
            percentage={overhead_percentage}
            expandable={expandable}
            expanded={expandedSections.overhead}
            onToggle={() => toggleSection('overhead')}
          >
            <PnLLine
              label="Rent & Utilities"
              amount={-(overhead_cost * 0.4)}
            />
            <PnLLine
              label="Marketing & Supplies"
              amount={-(overhead_cost * 0.3)}
            />
            <PnLLine
              label="Maintenance & Repairs"
              amount={-(overhead_cost * 0.3)}
            />
          </PnLLine>

          {/* Net Profit */}
          <PnLLine
            label="Net Profit"
            amount={net_profit}
            percentage={net_margin}
            isSubtotal={true}
          />
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="font-semibold">
              ${totalExpenses.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {revenue > 0 ? (((totalExpenses / revenue) * 100).toFixed(1)) : 0}%
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
            <p className="font-semibold text-green-700">
              {grossMargin.toFixed(1)}%
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Net Margin</p>
            <p
              className={`font-semibold ${
                (net_margin ?? 0) > 15
                  ? 'text-green-700'
                  : (net_margin ?? 0) > 10
                  ? 'text-yellow-700'
                  : 'text-red-700'
              }`}
            >
              {(net_margin ?? 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedPnLView;
