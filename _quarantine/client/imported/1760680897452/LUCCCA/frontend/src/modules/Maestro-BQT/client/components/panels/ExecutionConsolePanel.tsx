import React, { useState, useEffect } from 'react';
import { useEventStore, TimelinePhase, ReasonCode } from '../../stores/eventStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';

const StatusBadge: React.FC<{ status: TimelinePhase['status'] }> = ({ status }) => {
  const statusConfig = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⏳' },
    active: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔄' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
    delayed: { bg: 'bg-red-100', text: 'text-red-800', icon: '⚠️' }
  };

  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const VarianceIndicator: React.FC<{ varianceMin?: number }> = ({ varianceMin }) => {
  if (varianceMin === undefined) return null;
  
  const isPositive = varianceMin > 0;
  const absVariance = Math.abs(varianceMin);
  
  if (absVariance < 2) {
    return <span className="text-ok font-semibold">On Time</span>;
  }
  
  return (
    <span className={`font-semibold ${isPositive ? 'text-warn' : 'text-ok'}`}>
      {isPositive ? '+' : '-'}{absVariance}min
    </span>
  );
};

const ReasonCodeForm: React.FC<{
  phaseId: string;
  onSubmit: (reason: ReasonCode, notes: string) => void;
  onCancel: () => void;
}> = ({ phaseId, onSubmit, onCancel }) => {
  const [reason, setReason] = useState<ReasonCode>('other');
  const [notes, setNotes] = useState('');

  const reasonOptions: { value: ReasonCode; label: string }[] = [
    { value: 'kitchen_delay', label: 'Kitchen Delay' },
    { value: 'bar_queue', label: 'Bar Queue' },
    { value: 'late_vip', label: 'Late VIP Arrival' },
    { value: 'room_flip', label: 'Room Setup Delay' },
    { value: 'vendor_late', label: 'Vendor Late' },
    { value: 'equipment_issue', label: 'Equipment Issue' },
    { value: 'weather', label: 'Weather Impact' },
    { value: 'floor_congestion', label: 'Floor Congestion' },
    { value: 'plating_bottleneck', label: 'Plating Bottleneck' },
    { value: 'speech_overrun', label: 'Speech Overrun' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason, notes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel-elevated p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-primary mb-4">Log Variance Reason</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Reason Code
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReasonCode)}
              className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about the delay..."
              className="w-full p-3 border border-default rounded-lg bg-panel text-primary focus:ring-2 focus:ring-accent focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-accent text-white py-2 px-4 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Log Time
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-panel border border-default text-primary py-2 px-4 rounded-lg font-medium hover:bg-muted/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PhaseCard: React.FC<{
  phase: TimelinePhase;
  index: number;
  isActive: boolean;
  onLogTime: (phaseId: string) => void;
  onCompletePhase: (phaseId: string) => void;
}> = ({ phase, index, isActive, onLogTime, onCompletePhase }) => {
  const plannedTime = phase.plannedAt ? new Date(phase.plannedAt) : null;
  const actualTime = phase.actualAt ? new Date(phase.actualAt) : null;
  const currentTime = new Date();
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getPhaseProgress = () => {
    if (phase.status === 'completed') return 100;
    if (phase.status === 'active') {
      if (plannedTime && phase.plannedDurationMin) {
        const elapsed = Math.max(0, currentTime.getTime() - (actualTime || plannedTime).getTime());
        const elapsedMin = elapsed / (1000 * 60);
        return Math.min(100, (elapsedMin / phase.plannedDurationMin) * 100);
      }
    }
    return 0;
  };

  const progress = getPhaseProgress();

  return (
    <div className={`glass-panel p-4 transition-all duration-300 ${isActive ? 'ring-2 ring-accent shadow-lg scale-[1.02]' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-bold text-sm">
              {index + 1}
            </span>
            <h4 className="font-semibold text-primary">{phase.phase}</h4>
            <StatusBadge status={phase.status} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted">Planned</div>
              <div className="font-medium text-primary">
                {plannedTime ? formatTime(plannedTime) : 'TBD'}
                {phase.plannedDurationMin && (
                  <span className="text-muted ml-1">({phase.plannedDurationMin}min)</span>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-muted">Actual</div>
              <div className="font-medium text-primary">
                {actualTime ? formatTime(actualTime) : '—'}
                {phase.varianceMin !== undefined && (
                  <div className="mt-1">
                    <VarianceIndicator varianceMin={phase.varianceMin} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {phase.status === 'active' && progress > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-accent h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {(phase.reason || phase.notes) && (
            <div className="mt-3 p-2 bg-warn/10 border border-warn/20 rounded">
              {phase.reason && (
                <div className="text-xs font-medium text-warn capitalize">
                  {phase.reason.replace('_', ' ')}
                </div>
              )}
              {phase.notes && (
                <div className="text-xs text-muted mt-1">{phase.notes}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {phase.status === 'pending' && (
          <button
            onClick={() => onLogTime(phase.id)}
            className="flex-1 bg-accent text-white py-2 px-3 rounded text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            ▶️ Start Phase
          </button>
        )}
        
        {phase.status === 'active' && (
          <>
            <button
              onClick={() => onLogTime(phase.id)}
              className="flex-1 bg-warn text-white py-2 px-3 rounded text-sm font-medium hover:bg-warn/90 transition-colors"
            >
              ⏱️ Log Variance
            </button>
            <button
              onClick={() => onCompletePhase(phase.id)}
              className="flex-1 bg-ok text-white py-2 px-3 rounded text-sm font-medium hover:bg-ok/90 transition-colors"
            >
              ✅ Complete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export const ExecutionConsolePanel: React.FC<{
  eventId?: string;
}> = ({ eventId }) => {
  const { currentEvent, updateTimelinePhase, logActualTime } = useEventStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showReasonForm, setShowReasonForm] = useState<string | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (!currentEvent) {
    return (
      <PanelShell title="Execution Timeline">
        <div className="text-center text-muted">No event selected</div>
      </PanelShell>
    );
  }

  const { timelinePlan } = currentEvent;
  const activePhase = timelinePlan.find(p => p.status === 'active');
  const completedPhases = timelinePlan.filter(p => p.status === 'completed').length;
  const totalPhases = timelinePlan.length;
  const overallProgress = Math.round((completedPhases / totalPhases) * 100);

  // Calculate overall variance
  const totalVariance = timelinePlan
    .filter(p => p.varianceMin !== undefined)
    .reduce((sum, p) => sum + (p.varianceMin || 0), 0);

  const handleLogTime = (phaseId: string) => {
    const phase = timelinePlan.find(p => p.id === phaseId);
    if (!phase) return;

    if (phase.status === 'pending') {
      // Start the phase
      updateTimelinePhase(phaseId, { 
        status: 'active',
        actualAt: currentTime.toISOString()
      });
    } else {
      // Log variance - show reason form
      setShowReasonForm(phaseId);
    }
  };

  const handleCompletePhase = (phaseId: string) => {
    const phase = timelinePlan.find(p => p.id === phaseId);
    if (!phase || !phase.actualAt || !phase.plannedDurationMin) return;

    const actualStart = new Date(phase.actualAt);
    const actualDuration = Math.round((currentTime.getTime() - actualStart.getTime()) / (1000 * 60));
    const variance = actualDuration - phase.plannedDurationMin;

    updateTimelinePhase(phaseId, {
      status: 'completed',
      actualDurationMin: actualDuration,
      varianceMin: (phase.varianceMin || 0) + variance
    });

    // Auto-start next phase if it exists
    const currentIndex = timelinePlan.findIndex(p => p.id === phaseId);
    const nextPhase = timelinePlan[currentIndex + 1];
    if (nextPhase && nextPhase.status === 'pending') {
      setTimeout(() => {
        updateTimelinePhase(nextPhase.id, {
          status: 'active',
          actualAt: currentTime.toISOString()
        });
      }, 1000);
    }
  };

  const handleReasonSubmit = (reason: ReasonCode, notes: string) => {
    if (!showReasonForm) return;
    
    logActualTime(showReasonForm, currentTime.toISOString(), reason, notes);
    setShowReasonForm(null);
  };

  const getStatusColor = () => {
    if (totalVariance < -5) return 'text-ok';
    if (totalVariance > 10) return 'text-err';
    return 'text-warn';
  };

  const toolbarRight = (
    <div className="flex gap-2 text-sm">
      <div className="px-3 py-1.5 bg-panel border border-default rounded-lg">
        <span className="text-muted">Time:</span>
        <span className="ml-1 font-mono text-primary">
          {currentTime.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <PanelShell title="Execution Timeline" toolbarRight={toolbarRight}>
        <div className="space-y-6">
          {/* Overall Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted mb-1">Progress</div>
              <div className="text-2xl font-bold text-accent">{overallProgress}%</div>
              <div className="text-xs text-muted">{completedPhases}/{totalPhases} phases</div>
            </div>
            
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted mb-1">Current Phase</div>
              <div className="text-lg font-semibold text-primary">
                {activePhase ? activePhase.phase : 'No Active Phase'}
              </div>
              {activePhase?.actualAt && (
                <div className="text-xs text-muted">
                  Started {new Date(activePhase.actualAt).toLocaleTimeString('en-US', { hour12: true })}
                </div>
              )}
            </div>
            
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted mb-1">Total Variance</div>
              <div className={`text-2xl font-bold ${getStatusColor()}`}>
                <VarianceIndicator varianceMin={totalVariance} />
              </div>
              <div className="text-xs text-muted">
                {totalVariance > 0 ? 'Behind' : totalVariance < 0 ? 'Ahead' : 'On Track'}
              </div>
            </div>
            
            <div className="glass-panel p-4 text-center">
              <div className="text-sm text-muted mb-1">Event Status</div>
              <div className={`text-lg font-bold ${
                overallProgress === 100 ? 'text-ok' : 
                overallProgress > 0 ? 'text-accent' : 'text-muted'
              }`}>
                {overallProgress === 100 ? 'Complete' :
                 overallProgress > 0 ? 'In Progress' : 'Not Started'}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold text-accent">Event Timeline</h3>
            <div className="space-y-3">
              {timelinePlan.map((phase, index) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  index={index}
                  isActive={phase.status === 'active'}
                  onLogTime={handleLogTime}
                  onCompletePhase={handleCompletePhase}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-panel p-4">
            <h4 className="font-semibold text-accent mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button className="p-2 bg-warn/10 border border-warn/20 rounded text-warn text-sm hover:bg-warn/20 transition-colors">
                🚨 Emergency Stop
              </button>
              <button className="p-2 bg-accent/10 border border-accent/20 rounded text-accent text-sm hover:bg-accent/20 transition-colors">
                📢 Announce Delay
              </button>
              <button className="p-2 bg-ok/10 border border-ok/20 rounded text-ok text-sm hover:bg-ok/20 transition-colors">
                ⚡ Skip Phase
              </button>
              <button className="p-2 bg-muted/10 border border-default rounded text-muted text-sm hover:bg-muted/20 transition-colors">
                📝 Add Note
              </button>
            </div>
          </div>
        </div>
      </PanelShell>

      {/* Reason Form Modal */}
      {showReasonForm && (
        <ReasonCodeForm
          phaseId={showReasonForm}
          onSubmit={handleReasonSubmit}
          onCancel={() => setShowReasonForm(null)}
        />
      )}
    </>
  );
};

export default ExecutionConsolePanel;
