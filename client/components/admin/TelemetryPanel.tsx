import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, TrendingDown, AlertTriangle, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/glass';
import { HQTelemetryClient } from '@/lib/hq-telemetry-client';

interface TelemetryPanelProps {
  className?: string;
}

export function TelemetryPanel({ className }: TelemetryPanelProps) {
  const telemetry = HQTelemetryClient.getInstance();
  const [report, setReport] = useState(telemetry.generateHQReport());
  const [activeTab, setActiveTab] = useState<'health' | 'events' | 'security' | 'pending'>('health');
  const [pendingBatches, setPendingBatches] = useState(telemetry.getPendingBatches());

  useEffect(() => {
    const interval = setInterval(() => {
      setReport(telemetry.generateHQReport());
      setPendingBatches(telemetry.getPendingBatches());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [telemetry]);

  const statusColor = report.systemHealth.successRate > 0.95 ? 'green' : report.systemHealth.successRate > 0.90 ? 'yellow' : 'red';

  return (
    <div className={cn('w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg p-6 overflow-auto', className)}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Telemetry & System Health</h2>
        <p className="text-slate-400">Real-time usage monitoring and HQ reporting</p>
      </div>

      {/* System Health Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className={cn('bg-slate-700/50 border rounded-lg p-4', statusColor === 'green' ? 'border-green-600' : statusColor === 'yellow' ? 'border-yellow-600' : 'border-red-600')}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Success Rate</span>
            <Activity className={cn('w-4 h-4', statusColor === 'green' ? 'text-green-400' : statusColor === 'yellow' ? 'text-yellow-400' : 'text-red-400')} />
          </div>
          <div className="text-3xl font-bold text-white">{Math.round(report.systemHealth.successRate * 100)}%</div>
          <p className="text-xs text-slate-400 mt-1">{report.systemHealth.errorRate === 0 ? 'No errors' : `${report.systemHealth.errorRate.toFixed(2)}% error rate`}</p>
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Avg Latency</span>
            <TrendingDown className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">{report.systemHealth.avgLatency.toFixed(0)}ms</div>
          <p className="text-xs text-slate-400 mt-1">Network response time</p>
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Total Requests</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white">{report.systemHealth.totalRequests.toLocaleString()}</div>
          <p className="text-xs text-slate-400 mt-1">Operations processed</p>
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Pending Reports</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white">{pendingBatches.length}</div>
          <p className="text-xs text-slate-400 mt-1">Awaiting HQ sync</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-600">
        {(['health', 'events', 'security', 'pending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 text-sm font-medium transition-colors', activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300')}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'health' && (
          <HealthTab report={report} />
        )}

        {activeTab === 'events' && (
          <EventsTab topErrors={report.topErrors} userActivity={report.userActivity} />
        )}

        {activeTab === 'security' && (
          <SecurityTab securityEvents={report.securityEvents} />
        )}

        {activeTab === 'pending' && (
          <PendingTab batches={pendingBatches} />
        )}
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">HQ Recommendations</h3>
          <ul className="space-y-1">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-blue-200 flex gap-2">
                <span className="text-blue-400">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HealthTab({ report }: { report: ReturnType<HQTelemetryClient['generateHQReport']> }) {
  return (
    <div className="space-y-4">
      {/* Module Health */}
      <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart className="w-5 h-5 text-blue-400" />
          Module Health
        </h3>

        <div className="space-y-3">
          {report.userActivity && report.userActivity.slowestEndpoints && report.userActivity.slowestEndpoints.length > 0 ? (
            report.userActivity.slowestEndpoints.map((endpoint) => (
              <div key={endpoint}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{endpoint}</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2" />
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">All modules performing normally</p>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Active Users</h4>
          <div className="text-2xl font-bold text-green-400">{report.userActivity?.activeUsers || 0}</div>
          <p className="text-xs text-slate-400 mt-2">Concurrent connections</p>
        </div>

        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Peak Hours</h4>
          <div className="text-white text-sm">
            {report.userActivity?.peakHours && report.userActivity.peakHours.length > 0
              ? `${report.userActivity.peakHours.join(':00, ')}:00`
              : 'No data'}
          </div>
          <p className="text-xs text-slate-400 mt-2">When system is busiest</p>
        </div>
      </div>
    </div>
  );
}

function EventsTab({ topErrors, userActivity }: { topErrors: any[]; userActivity: any }) {
  return (
    <div className="space-y-4">
      {/* Top Errors */}
      <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          Top Errors
        </h3>

        {topErrors.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No errors detected</p>
        ) : (
          <div className="space-y-3">
            {topErrors.map((error, idx) => (
              <div key={idx} className="bg-slate-600/30 p-3 rounded">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-white text-sm">{error.error}</span>
                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">{error.count} times</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>
                    Affected: <span className="text-slate-200 font-medium">{error.affectedUsers}</span> users
                  </div>
                  <div>
                    Last: <span className="text-slate-200 font-medium">{new Date(error.lastOccurrence).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Activity */}
      <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">User Activity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">Total Operations</p>
            <p className="text-2xl font-bold text-blue-400">{userActivity?.totalOperations || 0}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">Active Users</p>
            <p className="text-2xl font-bold text-purple-400">{userActivity?.activeUsers || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ securityEvents }: { securityEvents: any[] }) {
  return (
    <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        Security Events
      </h3>

      {securityEvents.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No security events detected</p>
      ) : (
        <div className="space-y-2">
          {securityEvents.map((event, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-600/30 rounded">
              <div>
                <p className="font-medium text-white text-sm">{event.event}</p>
                <p className="text-xs text-slate-400">Last: {new Date(event.lastOccurrence).toLocaleTimeString()}</p>
              </div>
              <div className="text-right">
                <span className={cn('text-xs px-2 py-1 rounded font-medium', event.severity === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300')}>
                  {event.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingTab({ batches }: { batches: any[] }) {
  return (
    <div className="space-y-3">
      {batches.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-50" />
          <p className="text-slate-400">All telemetry data synced to HQ</p>
        </div>
      ) : (
        batches.map((batch) => (
          <div key={batch.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Batch #{batch.batchNumber}</h4>
              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">Pending</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm text-slate-400">
              <div>
                Events: <span className="text-white font-medium">{batch.events.length}</span>
              </div>
              <div>
                Duration: <span className="text-white font-medium">{((batch.endTime - batch.startTime) / 1000).toFixed(1)}s</span>
              </div>
              <div>
                Queued: <span className="text-white font-medium">{new Date(batch.startTime).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
