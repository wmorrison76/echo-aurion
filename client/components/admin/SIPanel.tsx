import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle, Zap, TrendingUp, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/glass';
import { SIEngine, PermissionSuggestion, PermissionEnforcementPolicy } from '@/lib/si-engine';
import { SILearningSystem, SystemPinchPoint } from '@/lib/si-learning-system';

interface SIPanelProps {
  className?: string;
}

export function SIPanel({ className }: SIPanelProps) {
  const siEngine = SIEngine.getInstance();
  const learningSystem = SILearningSystem.getInstance();

  const [suggestions, setSuggestions] = useState<PermissionSuggestion[]>([]);
  const [policies, setPolicies] = useState<PermissionEnforcementPolicy[]>([]);
  const [pinchPoints, setPinchPoints] = useState<SystemPinchPoint[]>([]);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'policies' | 'pinch-points' | 'history'>('suggestions');
  const [selectedSuggestion, setSelectedSuggestion] = useState<PermissionSuggestion | null>(null);
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load initial data
    setSuggestions(siEngine.getPendingSuggestions());
    setPolicies(siEngine.getPolicies());
    setPinchPoints(learningSystem.getPinchPoints());
  }, []);

  const handleAcceptSuggestion = async (suggestionId: string) => {
    const result = await siEngine.processSuggestion(suggestionId, 'accept');
    if (result) {
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      setSelectedSuggestion(null);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string, reason: string) => {
    const result = await siEngine.processSuggestion(suggestionId, 'reject', 'admin', reason);
    if (result) {
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      setSelectedSuggestion(null);
    }
  };

  const togglePolicy = (policyId: string) => {
    const newExpanded = new Set(expandedPolicies);
    if (newExpanded.has(policyId)) {
      newExpanded.delete(policyId);
    } else {
      newExpanded.add(policyId);
    }
    setExpandedPolicies(newExpanded);
  };

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
  const criticalPinchPoints = pinchPoints.filter((p) => p.severity === 'critical');

  return (
    <div className={cn('w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg p-6 overflow-auto', className)}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Semantic Intelligence Engine</h2>
        <p className="text-slate-400">AI-powered permission management and system health monitoring</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Pending Suggestions</span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white">{pendingCount}</div>
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Active Policies</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">{policies.filter((p) => p.enabled).length}</div>
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Critical Pinch Points</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-white">{criticalPinchPoints.length}</div>
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">System Health</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white">{Math.round((1 - criticalPinchPoints.length / Math.max(1, pinchPoints.length)) * 100)}%</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-600">
        {(['suggestions', 'policies', 'pinch-points', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 text-sm font-medium transition-colors', activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300')}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'suggestions' && (
          <SuggestionsTab
            suggestions={suggestions}
            selectedSuggestion={selectedSuggestion}
            onSelectSuggestion={setSelectedSuggestion}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
          />
        )}

        {activeTab === 'policies' && (
          <PoliciesTab
            policies={policies}
            expandedPolicies={expandedPolicies}
            onTogglePolicy={togglePolicy}
            onPolicyChange={(updated) => setPolicies(policies.map((p) => (p.id === updated.id ? updated : p)))}
          />
        )}

        {activeTab === 'pinch-points' && <PinchPointsTab pinchPoints={pinchPoints} />}

        {activeTab === 'history' && <HistoryTab siEngine={siEngine} />}
      </div>
    </div>
  );
}

function SuggestionsTab({
  suggestions,
  selectedSuggestion,
  onSelectSuggestion,
  onAccept,
  onReject,
}: {
  suggestions: PermissionSuggestion[];
  selectedSuggestion: PermissionSuggestion | null;
  onSelectSuggestion: (suggestion: PermissionSuggestion | null) => void;
  onAccept: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejectionReason, setRejectionReason] = useState('');

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-50" />
        <p className="text-slate-400">No pending suggestions</p>
        <p className="text-slate-500 text-sm">All permission configurations are optimal</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSelectSuggestion(suggestion)}
            className={cn(
              'w-full text-left p-4 rounded-lg border transition-all',
              selectedSuggestion?.id === suggestion.id
                ? 'bg-blue-500/20 border-blue-400'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-semibold text-white">{suggestion.userName}</span>
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded',
                  suggestion.action === 'revoke' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                )}
              >
                {suggestion.action.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-300 mb-1">{suggestion.permissionName}</p>
            <div className="flex items-center gap-2">
              <div className="w-full bg-slate-600 rounded-full h-1.5">
                <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${suggestion.confidence * 100}%` }} />
              </div>
              <span className="text-xs text-slate-400">{Math.round(suggestion.confidence * 100)}%</span>
            </div>
          </button>
        ))}
      </div>

      {selectedSuggestion && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4">Suggestion Details</h3>

          <div className="space-y-4 mb-4 flex-1 overflow-auto">
            <div>
              <label className="text-sm text-slate-400">User</label>
              <p className="text-white font-medium">{selectedSuggestion.userName}</p>
            </div>

            <div>
              <label className="text-sm text-slate-400">Action</label>
              <p className="text-white font-medium capitalize">{selectedSuggestion.action}</p>
            </div>

            <div>
              <label className="text-sm text-slate-400">Confidence</label>
              <p className="text-white font-medium">{Math.round(selectedSuggestion.confidence * 100)}%</p>
            </div>

            <div>
              <label className="text-sm text-slate-400">Reason</label>
              <p className="text-slate-300 text-sm">{selectedSuggestion.reason}</p>
            </div>

            {selectedSuggestion.reasoning && (
              <div>
                <label className="text-sm text-slate-400">AI Reasoning</label>
                <div className="text-sm space-y-2 mt-2">
                  {selectedSuggestion.reasoning.contextFactors.length > 0 && (
                    <div>
                      <p className="text-slate-300 font-medium text-xs">Context Factors:</p>
                      <ul className="text-slate-400 text-xs list-disc ml-4">
                        {selectedSuggestion.reasoning.contextFactors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedSuggestion.reasoning.anomalies.length > 0 && (
                    <div>
                      <p className="text-slate-300 font-medium text-xs">Detected Anomalies:</p>
                      <ul className="text-slate-400 text-xs list-disc ml-4">
                        {selectedSuggestion.reasoning.anomalies.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-auto pt-4 border-t border-slate-600">
            <button
              onClick={() => onAccept(selectedSuggestion.id)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Accept Suggestion
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Rejection reason (optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="flex-1 bg-slate-600 border border-slate-500 text-white px-3 py-2 rounded text-sm"
              />
              <button
                onClick={() => {
                  onReject(selectedSuggestion.id, rejectionReason);
                  setRejectionReason('');
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PoliciesTab({
  policies,
  expandedPolicies,
  onTogglePolicy,
  onPolicyChange,
}: {
  policies: PermissionEnforcementPolicy[];
  expandedPolicies: Set<string>;
  onTogglePolicy: (id: string) => void;
  onPolicyChange: (policy: PermissionEnforcementPolicy) => void;
}) {
  return (
    <div className="space-y-3">
      {policies.map((policy) => (
        <div key={policy.id} className="bg-slate-700/30 border border-slate-600 rounded-lg overflow-hidden">
          <button
            onClick={() => onTogglePolicy(policy.id)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: policy.enabled ? '#10b981' : '#6b7280' }} />
              <div className="text-left">
                <h3 className="font-semibold text-white">{policy.name}</h3>
                <p className="text-sm text-slate-400">{policy.description}</p>
              </div>
            </div>
            <Eye className="w-4 h-4 text-slate-400" />
          </button>

          {expandedPolicies.has(policy.id) && (
            <div className="px-4 pb-4 border-t border-slate-600 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.enabled}
                    onChange={(e) => onPolicyChange({ ...policy, enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">Enabled</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.autoEnforce}
                    onChange={(e) => onPolicyChange({ ...policy, autoEnforce: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">Auto Enforce</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.requiresApproval}
                    onChange={(e) => onPolicyChange({ ...policy, requiresApproval: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">Requires Approval</span>
                </label>
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Conditions</label>
                <div className="space-y-2">
                  {policy.conditions.map((cond, idx) => (
                    <div key={idx} className="bg-slate-600/30 p-2 rounded text-sm text-slate-300">
                      <span className="font-medium">{cond.type}</span> with threshold {cond.threshold} → {cond.action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PinchPointsTab({ pinchPoints }: { pinchPoints: SystemPinchPoint[] }) {
  if (pinchPoints.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-50" />
        <p className="text-slate-400">No system pinch points detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pinchPoints.map((point) => (
        <div key={point.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-white">{point.description}</h3>
              <p className="text-sm text-slate-400">{point.category}</p>
            </div>
            <span
              className={cn(
                'text-xs px-3 py-1 rounded font-medium',
                point.severity === 'critical' ? 'bg-red-500/20 text-red-300' : point.severity === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'
              )}
            >
              {point.severity.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div className="text-slate-400">
              Affected: <span className="text-white font-medium">{point.affectedUsers} users</span>
            </div>
            <div className="text-slate-400">
              Error Rate: <span className="text-white font-medium">{Math.round(point.errorRate * 100)}%</span>
            </div>
          </div>

          {point.recommendations.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {point.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-blue-400">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ siEngine }: { siEngine: SIEngine }) {
  const history = siEngine.getEnforcementHistory(10);

  return (
    <div className="space-y-2">
      {history.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-30" />
          <p className="text-slate-400">No enforcement history yet</p>
        </div>
      ) : (
        history.map((item) => (
          <div key={item.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-white">{item.userName}</span>
              <span
                className={cn('text-xs px-2 py-1 rounded', item.status === 'enforced' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300')}
              >
                {item.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-300 mb-1">{item.permissionName}</p>
            <p className="text-xs text-slate-500">
              {new Date((item.enforcedAt || item.rejectedAt) || item.suggestedAt).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
