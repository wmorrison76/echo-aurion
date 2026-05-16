import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import type { PnLData } from '../../lib/financial-panel-hooks';

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '$0';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const rounded = Math.round(amount);
    return `$${rounded.toLocaleString()}`;
  }
}

interface PayrollMiniPanelProps {
  pnl: PnLData | null;
  loading?: boolean;
  payrollVerified: boolean;
  payrollAccessDenied: boolean;
  onRequestAccess: () => void;
  onDrillDown?: () => void;
}

const PayrollMiniPanel: React.FC<PayrollMiniPanelProps> = ({
  pnl,
  loading = false,
  payrollVerified,
  payrollAccessDenied,
  onRequestAccess,
  onDrillDown,
}) => {
  const payroll = pnl?.payroll_data;
  const hasBreakdown = Boolean(payroll);
  const usingActuals = payroll?.source === 'payroll' && (payroll?.total || 0) > 0;

  const headline = (() => {
    if (loading) return 'Payroll';
    if (!payrollVerified) return 'Payroll (Locked)';
    if (!hasBreakdown) return 'Payroll';
    return usingActuals ? 'Payroll (Actuals)' : 'Payroll (Estimate)';
  })();

  const primaryValue = (() => {
    if (loading) return '—';
    if (!payrollVerified) return 'Sensitive';
    if (!hasBreakdown) return payrollAccessDenied ? 'Access required' : 'Unavailable';
    return formatMoney(payroll?.total || 0);
  })();

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {headline.toUpperCase()}
          </p>
          <div className="text-2xl font-bold text-foreground">{primaryValue}</div>
          {hasBreakdown && payrollVerified && (
            <p className="text-xs text-muted-foreground mt-1">
              Run: {payroll?.payroll_run_id || '—'}
            </p>
          )}
        </div>

        {onDrillDown && payrollVerified && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDrillDown}
            className="h-8 px-2"
          >
            Details
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        )}

        {!loading && payrollVerified && hasBreakdown && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Wages</p>
              <p className="font-medium">{formatMoney(payroll?.wages || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxes</p>
              <p className="font-medium">{formatMoney(payroll?.taxes || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Benefits</p>
              <p className="font-medium">{formatMoney(payroll?.benefits || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="font-medium">{payroll?.employee_count ?? '—'}</p>
            </div>
          </div>
        )}

        {!loading && payrollVerified && hasBreakdown && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Scheduled labor estimate: {formatMoney(payroll?.scheduled_labor_cost || 0)}
          </div>
        )}

        {!loading && !payrollVerified && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              Verification required
            </div>
            <Button variant="outline" size="sm" onClick={onRequestAccess}>
              Access
            </Button>
          </div>
        )}

        {!loading && payrollVerified && payrollAccessDenied && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Payroll access not authorized for this role.
            </div>
            <Button variant="outline" size="sm" onClick={onRequestAccess}>
              Re-verify
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PayrollMiniPanel;
