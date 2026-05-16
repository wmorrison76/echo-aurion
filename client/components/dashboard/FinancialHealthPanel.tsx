/**
 * FinancialHealthPanel
 * Main dashboard widget displaying financial health grade, metrics, and drill-down access
 * Integrated with financial hooks for real-time P&L updates
 */

import React, { useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from '../ui/use-toast';
import {
  useFinancialHealth,
  useOutletPnL,
  usePayrollAccessVerification,
} from '../../lib/financial-panel-hooks';
import HealthGradeCard from './HealthGradeCard';
import HighLevelMetrics from './HighLevelMetrics';
import DetailedPnLView from './DetailedPnLView';
import PayrollMiniPanel from './PayrollMiniPanel';
import MultiOutletSelector from './MultiOutletSelector';
import SalaryAccessGate from './SalaryAccessGate';

interface FinancialHealthPanelProps {
  outletId?: string;
  period?: string;
  onDrillDown?: (section: string) => void;
  showMultiOutlet?: boolean;
  compact?: boolean;
}

const FinancialHealthPanel: React.FC<FinancialHealthPanelProps> = ({
  outletId,
  period,
  onDrillDown,
  showMultiOutlet = false,
  compact = false,
}) => {
  const [selectedOutletId, setSelectedOutletId] = useState(outletId || '');
  const [showDetails, setShowDetails] = useState(!compact);
  const [salaryAccessOpen, setSalaryAccessOpen] = useState(false);

  const { health, loading: healthLoading } = useFinancialHealth(
    selectedOutletId,
    period
  );
  const { isVerified: payrollVerified, setVerified: setPayrollVerified } =
    usePayrollAccessVerification();
  const { pnl, loading: pnlLoading, payrollAccessDenied } = useOutletPnL(
    selectedOutletId,
    period,
    payrollVerified
  );

  const handlePayrollAccess = () => {
    if (payrollVerified && !payrollAccessDenied) {
      setShowDetails(true);
      toast({
        title: 'Access Granted',
        description: 'Viewing payroll data for the next 15 minutes',
      });
      return;
    }

    if (payrollAccessDenied) {
      toast({
        title: 'Payroll Access Denied',
        description: 'Your role does not have permission to view payroll breakdown.',
        variant: 'destructive',
      });
      return;
    }

    setSalaryAccessOpen(true);
  };

  const handlePayrollVerified = () => {
    setPayrollVerified(true);
    setSalaryAccessOpen(false);
    setShowDetails(true);
  };

  if (healthLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Financial Health</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading financial data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Financial Health</CardTitle>
          <CardDescription>Unable to load financial data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Financial Health</CardTitle>
              <CardDescription>Real-time P&L monitoring</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-8 w-8 p-0"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showDetails ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Outlet Selector */}
          {showMultiOutlet && (
            <MultiOutletSelector
              selectedOutletIds={selectedOutletId ? [selectedOutletId] : []}
              onSelectionChange={(ids) => setSelectedOutletId(ids[0] || '')}
              loading={healthLoading}
            />
          )}

          {/* Health Grade Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <HealthGradeCard
                grade={health.grade}
                score={health.score}
                trend={health.trend}
                risks={health.risks}
                loading={healthLoading}
              />
            </div>

            {/* High-Level Metrics */}
            <div className="lg:col-span-2">
              {showDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <HighLevelMetrics
                    data={
                      health
                        ? {
                            revenue: health.revenue,
                            cogs_percentage: health.cogs_percentage,
                            labor_percentage: health.labor_percentage,
                            net_margin: health.net_margin,
                          }
                        : undefined
                    }
                    loading={healthLoading}
                  />
                  <PayrollMiniPanel
                    pnl={pnl}
                    loading={pnlLoading}
                    payrollVerified={payrollVerified}
                    payrollAccessDenied={payrollAccessDenied}
                    onRequestAccess={handlePayrollAccess}
                    onDrillDown={() => onDrillDown?.('payroll')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Detailed P&L */}
          {showDetails && pnl && (
            <DetailedPnLView
              revenue={pnl.revenue}
              cogs={pnl.cogs}
              cogs_percentage={pnl.cogs_percentage}
              labor_cost={pnl.labor_cost}
              labor_percentage={pnl.labor_percentage}
              overhead_cost={pnl.overhead_cost}
              overhead_percentage={pnl.overhead_percentage}
              net_profit={pnl.net_profit}
              net_margin={pnl.net_margin}
              payroll_data={pnl.payroll_data}
              loading={pnlLoading}
            />
          )}

          {/* Action Buttons */}
          {showDetails && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onDrillDown?.('pnl');
                }}
              >
                Export Report
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePayrollAccess}
              >
                <Lock className="w-3 h-3 mr-1" />
                {payrollVerified ? 'Payroll Details' : 'Access Payroll'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Access Gate Modal */}
      <SalaryAccessGate
        isOpen={salaryAccessOpen}
        onClose={() => setSalaryAccessOpen(false)}
        onVerified={handlePayrollVerified}
      />
    </>
  );
};

export default FinancialHealthPanel;
