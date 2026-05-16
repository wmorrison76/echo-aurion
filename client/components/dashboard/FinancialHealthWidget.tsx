/**
 * FinancialHealthWidget
 * Wrapper component for FinancialHealthPanel that integrates with Dashboard widget system
 * Provides the standard widget interface with minimize, pin, detach controls
 */

import React from 'react';
import FinancialHealthPanel from './FinancialHealthPanel';
import { openPanel } from '@/lib/open-panel';

interface FinancialHealthWidgetProps {
  minimized?: boolean;
  showHeader?: boolean;
  onMinimize?: () => void;
  onPin?: () => void;
  onDetach?: () => void;
  isPinned?: boolean;
  title?: string;
  icon?: string;
  widgetId?: string;
}

const FinancialHealthWidget: React.FC<FinancialHealthWidgetProps> = ({
  minimized = false,
  showHeader = true,
  onMinimize,
  onPin,
  onDetach,
  isPinned = false,
  title = 'Financial Health',
  icon = '💹',
  widgetId = 'financial-health',
}) => {
  if (minimized) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
        <div className="text-center">
          <div className="text-3xl mb-2">{icon}</div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-xs text-slate-500 mt-1">Minimized</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Widget Header - if showHeader is true */}
      {showHeader && (
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <h3 className="font-semibold text-slate-700">{title}</h3>
          </div>
          <div className="flex items-center gap-1">
            {onPin && (
              <button
                onClick={onPin}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  isPinned
                    ? 'bg-primary/20 text-primary'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title={isPinned ? 'Unpin widget' : 'Pin widget'}
              >
                📌
              </button>
            )}
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                title="Minimize widget"
              >
                −
              </button>
            )}
            {onDetach && (
              <button
                onClick={onDetach}
                className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                title="Pop out as floating window"
              >
                ⤢
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content - FinancialHealthPanel */}
      <div className="flex-1 overflow-auto p-4">
        <FinancialHealthPanel
          outletId="default-outlet"
          period={(() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          })()}
          showMultiOutlet={false}
          compact={false}
          onDrillDown={(section) => {
            if (section === 'payroll') {
              openPanel('hr-payroll', undefined, {
                initialPage: 'payroll',
                outletId: 'default-outlet',
              });
              return;
            }

            if (section === 'pnl') {
              openPanel('aurum', 'pnl', {
                outletId: 'default-outlet',
              });
            }
          }}
        />
      </div>
    </div>
  );
};

export default FinancialHealthWidget;
