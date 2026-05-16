/**
 * Timeline Panel - LUCCCA Chef Workflow Timeline
 * 
 * Features from manifest:
 * - Prep day before planning and management
 * - Execution day timeline with real-time tracking
 * - Role breakdown and staff assignment coordination
 * 
 * Integrates with Nova Lab Event Planner and BEO/REO data
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import type { 
  EventTimeline, 
  TimelineDay, 
  TimelineTask, 
  TaskStatus, 
  RoleAssignment, 
  StaffMember, 
  Milestone,
  EventPlannerChange,
  EchoTimelineOptimization,
  RiskFactor,
  ContingencyPlan
} from '../../types/timeline';

interface TimelinePanelProps {
  eventId?: string;
  timelineId?: string;
  mode?: 'prep' | 'execution' | 'review';
}

const TaskStatusIcon: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const icons = {
    not_started: '⏳',
    in_progress: '⚡',
    paused: '⏸️',
    completed: '✅',
    cancelled: '❌',
    delayed: '⚠️',
    blocked: '🚫',
    quality_issue: '⚠️'
  };
  
  const colors = {
    not_started: 'text-muted',
    in_progress: 'text-accent',
    paused: 'text-warn',
    completed: 'text-ok',
    cancelled: 'text-err',
    delayed: 'text-warn',
    blocked: 'text-err',
    quality_issue: 'text-err'
  };

  return (
    <span className={`${colors[status]} text-lg`}>
      {icons[status]}
    </span>
  );
};

const TaskCard: React.FC<{
  task: TimelineTask;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateProgress: (taskId: string, progress: number) => void;
  showDetails?: boolean;
}> = ({ task, onUpdateStatus, onUpdateProgress, showDetails = false }) => {
  const [expanded, setExpanded] = useState(showDetails);
  
  const isOverdue = task.scheduledEnd < new Date().toISOString() && task.status !== 'completed';
  const isUpcoming = task.scheduledStart > new Date().toISOString();
  const isCritical = task.criticalPath;

  return (
    <div className={`glass-panel p-4 mb-3 ${
      isCritical ? 'border-l-4 border-accent' : ''
    } ${isOverdue ? 'bg-err/5' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 flex-1">
          <TaskStatusIcon status={task.status} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-primary">{task.name}</h4>
              {isCritical && (
                <span className="px-2 py-0.5 text-xs bg-accent text-white rounded">Critical</span>
              )}
              {task.haccp && (
                <span className="px-2 py-0.5 text-xs bg-err text-white rounded">HACCP</span>
              )}
            </div>
            <div className="text-sm text-muted">{task.description}</div>
            <div className="flex items-center gap-4 text-xs text-muted mt-1">
              <span>📅 {new Date(task.scheduledStart).toLocaleTimeString()}</span>
              <span>⏱️ {task.scheduledDuration}m</span>
              <span>📍 {task.locationRequired}</span>
              {task.linkedRecipeId && (
                <span className="text-accent">🍽️ Recipe linked</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Progress indicator */}
          <div className="text-right">
            <div className={`text-sm font-medium ${
              task.progress === 100 ? 'text-ok' :
              task.progress > 0 ? 'text-accent' :
              'text-muted'
            }`}>
              {task.progress}%
            </div>
            <div className="w-16 h-2 bg-panel rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
          
          {/* Status selector */}
          <select
            value={task.status}
            onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
            className="text-xs p-1 bg-panel border border-default rounded"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
            <option value="blocked">Blocked</option>
          </select>
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 text-xs bg-panel border border-default rounded hover:bg-muted/10"
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Progress slider */}
      {task.status === 'in_progress' && (
        <div className="mb-3">
          <label className="text-xs text-muted">Progress</label>
          <input
            type="range"
            min="0"
            max="100"
            value={task.progress}
            onChange={(e) => onUpdateProgress(task.id, Number(e.target.value))}
            className="w-full mt-1"
          />
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-default/20 pt-3 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff assignments */}
            <div>
              <h5 className="font-medium text-primary mb-2">Staff Assigned</h5>
              <div className="space-y-1">
                {task.assignedRoles.map(role => (
                  <div key={role.roleId} className="text-sm">
                    <span className="text-primary">{role.roleName}</span>
                    <span className="text-muted ml-2">({role.staffCount} staff)</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Equipment */}
            <div>
              <h5 className="font-medium text-primary mb-2">Equipment Needed</h5>
              <div className="flex flex-wrap gap-1">
                {task.equipmentNeeded.map(equipment => (
                  <span key={equipment} className="px-2 py-0.5 text-xs bg-panel border border-default rounded">
                    {equipment}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          {task.instructions.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-primary mb-2">Instructions</h5>
              <div className="space-y-1">
                {task.instructions.map((instruction, idx) => (
                  <div key={idx} className="text-sm text-primary">
                    {idx + 1}. {instruction}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* HACCP temperature checks */}
          {task.haccp && task.temperaturePoints.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-err mb-2">🌡️ Temperature Monitoring</h5>
              <div className="space-y-1">
                {task.temperaturePoints.map(point => (
                  <div key={point.time} className="text-sm flex justify-between">
                    <span className="text-primary">{point.location}</span>
                    <span className={`font-medium ${
                      point.passed === true ? 'text-ok' :
                      point.passed === false ? 'text-err' :
                      'text-warn'
                    }`}>
                      {point.actualTemp ? `${point.actualTemp}°F` : `Target: ${point.requiredTemp}°F`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RoleBreakdown: React.FC<{
  roleAssignments: RoleAssignment[];
  currentTime: string;
}> = ({ roleAssignments, currentTime }) => (
  <div className="glass-panel p-4">
    <h3 className="font-semibold text-accent mb-4">Staff Role Breakdown</h3>
    <div className="space-y-3">
      {roleAssignments.map(role => {
        const isActive = currentTime >= role.shiftStart && currentTime <= role.shiftEnd;
        const staffUtilization = role.assignedStaff.length / role.requiredCount;
        
        return (
          <div key={role.roleId} className={`p-3 rounded-lg border ${
            isActive ? 'bg-accent/5 border-accent/20' : 'bg-panel border-default'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-primary">{role.roleName}</h4>
                <div className="text-sm text-muted">{role.description}</div>
                <div className="text-xs text-muted mt-1">
                  {new Date(role.shiftStart).toLocaleTimeString()} - {new Date(role.shiftEnd).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  staffUtilization >= 1 ? 'text-ok' :
                  staffUtilization >= 0.8 ? 'text-warn' :
                  'text-err'
                }`}>
                  {role.assignedStaff.length}/{role.requiredCount}
                </div>
                <div className="text-xs text-muted">staffed</div>
              </div>
            </div>
            
            {/* Assigned staff */}
            <div className="space-y-1">
              {role.assignedStaff.map(staff => (
                <div key={staff.id} className="flex justify-between items-center text-sm">
                  <span className="text-primary">{staff.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      staff.availability === 'available' ? 'bg-ok' :
                      staff.availability === 'busy' ? 'bg-warn' :
                      staff.availability === 'break' ? 'bg-accent' :
                      'bg-err'
                    }`} />
                    <span className="text-muted text-xs capitalize">
                      {staff.availability.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Skills and requirements */}
            <div className="mt-2 pt-2 border-t border-default/20">
              <div className="text-xs text-muted">
                <strong>Required Skills:</strong> {role.requiredSkills.join(', ')}
              </div>
              <div className="text-xs text-muted mt-1">
                <strong>Primary Tasks:</strong> {role.primaryTasks.join(', ')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const MilestoneTracker: React.FC<{
  milestones: Milestone[];
  currentTime: string;
}> = ({ milestones, currentTime }) => (
  <div className="glass-panel p-4">
    <h3 className="font-semibold text-accent mb-4">Key Milestones</h3>
    <div className="space-y-3">
      {milestones.map(milestone => {
        const isPassed = currentTime > milestone.scheduledTime;
        const isUpcoming = !isPassed && 
          new Date(milestone.scheduledTime).getTime() - new Date(currentTime).getTime() < 3600000; // 1 hour
        
        return (
          <div key={milestone.id} className={`flex items-center gap-3 p-3 rounded-lg ${
            milestone.status === 'achieved' ? 'bg-ok/10 border border-ok/20' :
            milestone.status === 'missed' ? 'bg-err/10 border border-err/20' :
            isUpcoming ? 'bg-warn/10 border border-warn/20' :
            'bg-panel border border-default'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              milestone.status === 'achieved' ? 'bg-ok' :
              milestone.status === 'missed' ? 'bg-err' :
              isUpcoming ? 'bg-warn' :
              'bg-muted'
            }`} />
            
            <div className="flex-1">
              <div className="font-medium text-primary">{milestone.name}</div>
              <div className="text-sm text-muted">{milestone.description}</div>
              <div className="text-xs text-muted">
                Target: {new Date(milestone.scheduledTime).toLocaleString()}
                {milestone.actualTime && (
                  <span className="ml-2">
                    Actual: {new Date(milestone.actualTime).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            <div className={`px-2 py-1 text-xs rounded capitalize ${
              milestone.status === 'achieved' ? 'bg-ok text-white' :
              milestone.status === 'missed' ? 'bg-err text-white' :
              milestone.criticality === 'critical' ? 'bg-err text-white' :
              milestone.criticality === 'high' ? 'bg-warn text-white' :
              'bg-panel border border-default'
            }`}>
              {milestone.status === 'pending' ? milestone.criticality : milestone.status}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const EchoOptimizationSuggestions: React.FC<{
  optimization?: EchoTimelineOptimization;
  onApplyOptimization: (optimization: EchoTimelineOptimization) => void;
}> = ({ optimization, onApplyOptimization }) => {
  if (!optimization) return null;

  return (
    <div className="glass-panel p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-accent">Echo AI Timeline Optimization</h3>
          <span className="px-2 py-0.5 text-xs bg-accent text-white rounded">
            {optimization.confidence}% Confidence
          </span>
        </div>
        {!optimization.implemented && (
          <button
            onClick={() => onApplyOptimization(optimization)}
            className="px-3 py-1.5 bg-ok text-white rounded-lg text-sm font-medium hover:bg-ok/90 transition-colors"
          >
            Apply Suggestions
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-ok">{optimization.timeReduction}m</div>
          <div className="text-xs text-muted">Time Saved</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-accent">{optimization.staffOptimization}h</div>
          <div className="text-xs text-muted">Staff Hours Saved</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-primary">+{optimization.qualityImprovement}%</div>
          <div className="text-xs text-muted">Quality Improvement</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-warn">-{optimization.riskReduction}%</div>
          <div className="text-xs text-muted">Risk Reduction</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-primary mb-2">🔄 Task Reordering</h4>
          <div className="space-y-1">
            {optimization.taskReordering.slice(0, 3).map(reorder => (
              <div key={reorder.taskId} className="text-sm">
                <span className="text-primary">Task {reorder.taskId.slice(-3)}</span>
                <span className="text-muted ml-2">
                  Position {reorder.currentPosition} → {reorder.suggestedPosition}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-primary mb-2">⚡ Parallelization</h4>
          <div className="space-y-1">
            {optimization.parallelization.slice(0, 3).map((parallel, idx) => (
              <div key={idx} className="text-sm">
                <span className="text-primary">{parallel.taskIds.length} tasks</span>
                <span className="text-muted ml-2">Save {parallel.timeSaving}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  eventId,
  timelineId,
  mode = 'prep'
}) => {
  const [timeline, setTimeline] = useState<EventTimeline | null>(null);
  const [selectedDay, setSelectedDay] = useState<'prep' | 'execution'>('prep');
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [echoOptimization, setEchoOptimization] = useState<EchoTimelineOptimization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load timeline data
  useEffect(() => {
    const loadTimeline = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock timeline data
      const mockTimeline: EventTimeline = {
        id: timelineId || 'timeline-1',
        eventId: eventId || 'event-1',
        menuCollectionId: 'menu-1',
        guestCount: 150,
        prepDay: {
          date: '2024-06-14',
          label: 'Prep Day',
          startTime: '2024-06-14T06:00:00Z',
          endTime: '2024-06-14T18:00:00Z',
          tasks: [
            {
              id: 'task-prep-1',
              name: 'Protein Prep - Salmon Portioning',
              description: 'Cut and portion salmon fillets for 150 guests',
              category: 'protein',
              scheduledStart: '2024-06-14T08:00:00Z',
              scheduledDuration: 120,
              scheduledEnd: '2024-06-14T10:00:00Z',
              dependencies: [],
              dependents: ['task-prep-2'],
              criticalPath: true,
              assignedRoles: [
                {
                  roleId: 'garde-manger',
                  roleName: 'Garde Manger',
                  staffCount: 2,
                  requiredSkills: ['knife skills', 'fish handling'],
                  estimatedHours: 4
                }
              ],
              equipmentNeeded: ['fish station', 'scales', 'knives'],
              locationRequired: 'Cold Prep Station',
              linkedRecipeId: 'recipe-1',
              portionCount: 150,
              status: 'completed',
              progress: 100,
              quality: { required: true, completed: true, score: 9 },
              haccp: true,
              temperaturePoints: [
                {
                  time: '2024-06-14T08:30:00Z',
                  location: 'fish station',
                  requiredTemp: 38,
                  actualTemp: 36,
                  passed: true,
                  recordedBy: 'chef-1'
                }
              ],
              instructions: [
                'Remove salmon from walk-in cooler',
                'Inspect quality and freshness',
                'Portion into 6oz fillets',
                'Store in hotel pans on ice'
              ],
              canStartEarly: true,
              canStartLate: false,
              maxDelay: 30,
              createdFrom: 'recipe',
              lastModified: new Date().toISOString()
            }
          ],
          milestones: [
            {
              id: 'milestone-prep-1',
              name: 'All Proteins Prepped',
              description: 'All protein components ready for service day',
              scheduledTime: '2024-06-14T16:00:00Z',
              actualTime: '2024-06-14T15:45:00Z',
              requiredTasks: ['task-prep-1'],
              qualityGates: [],
              approvalRequired: true,
              status: 'achieved',
              criticality: 'high',
              notifyRoles: ['executive-chef', 'sous-chef']
            }
          ],
          roleAssignments: [
            {
              roleId: 'garde-manger',
              roleName: 'Garde Manger',
              description: 'Cold food preparation specialist',
              shiftStart: '2024-06-14T07:00:00Z',
              shiftEnd: '2024-06-14T17:00:00Z',
              breakSchedule: [],
              primaryTasks: ['protein', 'garde_manger'],
              canSupervise: [],
              requiredSkills: ['knife skills', 'fish handling', 'food safety'],
              requiredCertifications: ['HACCP'],
              experienceLevel: 'experienced',
              requiredCount: 2,
              assignedStaff: [
                {
                  id: 'staff-1',
                  name: 'John Martinez',
                  role: 'Garde Manger',
                  skills: ['knife skills', 'fish handling'],
                  certifications: ['HACCP', 'ServSafe'],
                  scheduledHours: 10,
                  availability: 'available',
                  currentTasks: ['task-prep-1'],
                  productivity: 95
                }
              ],
              substitutes: [],
              productivity: 95,
              efficiency: 92,
              qualityScore: 88
            }
          ],
          shiftSchedule: [],
          equipmentSchedule: [],
          spaceRequirements: [],
          totalTasks: 1,
          completedTasks: 1,
          criticaltasks: 1,
          estimatedHours: 4,
          actualHours: 3.75
        },
        executionDay: {
          date: '2024-06-15',
          label: 'Event Day',
          startTime: '2024-06-15T10:00:00Z',
          endTime: '2024-06-15T24:00:00Z',
          tasks: [],
          milestones: [],
          roleAssignments: [],
          shiftSchedule: [],
          equipmentSchedule: [],
          spaceRequirements: [],
          totalTasks: 0,
          completedTasks: 0,
          criticaltasks: 0,
          estimatedHours: 0
        },
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        createdBy: 'chef-1',
        status: 'active',
        version: 1,
        syncedWithEventPlanner: true,
        lastSyncAt: new Date().toISOString(),
        criticalPath: ['task-prep-1'],
        totalDuration: 840,
        bufferTime: 60,
        totalStaffHours: 32,
        peakStaffing: 8,
        equipmentRequirements: [],
        riskFactors: [],
        contingencyPlans: []
      };

      const mockOptimization: EchoTimelineOptimization = {
        timelineId: mockTimeline.id,
        optimizedAt: new Date().toISOString(),
        aiModel: 'Echo-Timeline-v2.1',
        timeReduction: 45,
        staffOptimization: 3.5,
        qualityImprovement: 8,
        riskReduction: 15,
        taskReordering: [
          {
            taskId: 'task-prep-1',
            currentPosition: 1,
            suggestedPosition: 2,
            reason: 'Better flow with vegetable prep',
            impact: 'Reduces waiting time'
          }
        ],
        parallelization: [
          {
            taskIds: ['task-prep-1', 'task-prep-2'],
            currentSequential: true,
            canParallelize: true,
            requirements: ['Additional station'],
            timeSaving: 30
          }
        ],
        staffReallocation: [],
        equipmentOptimization: [],
        confidence: 87,
        implemented: false
      };

      setTimeline(mockTimeline);
      setEchoOptimization(mockOptimization);
      setIsLoading(false);
    };

    loadTimeline();
  }, [eventId, timelineId]);

  const handleTaskStatusUpdate = useCallback((taskId: string, status: TaskStatus) => {
    if (!timeline) return;
    
    const updateTasks = (tasks: TimelineTask[]): TimelineTask[] =>
      tasks.map(task => task.id === taskId ? { ...task, status } : task);
    
    setTimeline({
      ...timeline,
      prepDay: { ...timeline.prepDay, tasks: updateTasks(timeline.prepDay.tasks) },
      executionDay: { ...timeline.executionDay, tasks: updateTasks(timeline.executionDay.tasks) }
    });
  }, [timeline]);

  const handleTaskProgressUpdate = useCallback((taskId: string, progress: number) => {
    if (!timeline) return;
    
    const updateTasks = (tasks: TimelineTask[]): TimelineTask[] =>
      tasks.map(task => task.id === taskId ? { ...task, progress } : task);
    
    setTimeline({
      ...timeline,
      prepDay: { ...timeline.prepDay, tasks: updateTasks(timeline.prepDay.tasks) },
      executionDay: { ...timeline.executionDay, tasks: updateTasks(timeline.executionDay.tasks) }
    });
  }, [timeline]);

  const handleApplyOptimization = useCallback((optimization: EchoTimelineOptimization) => {
    // Apply optimization suggestions
    setEchoOptimization({ ...optimization, implemented: true });
    // In real implementation, would update timeline based on optimization
  }, []);

  const currentDay = selectedDay === 'prep' ? timeline?.prepDay : timeline?.executionDay;
  const filteredTasks = useMemo(() => {
    if (!currentDay) return [];
    
    let tasks = currentDay.tasks;
    
    if (filterRole !== 'all') {
      tasks = tasks.filter(task => 
        task.assignedRoles.some(role => role.roleId === filterRole)
      );
    }
    
    if (!showCompleted) {
      tasks = tasks.filter(task => task.status !== 'completed');
    }
    
    return tasks.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }, [currentDay, filterRole, showCompleted]);

  const toolbarRight = (
    <div className="flex items-center gap-3">
      {timeline?.syncedWithEventPlanner && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ok" />
          <span className="text-sm text-muted">Synced with Nova Lab</span>
        </div>
      )}
      
      <button
        onClick={() => {/* Manual sync */}}
        className="px-3 py-1.5 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors"
      >
        🔄 Sync
      </button>
      
      <button
        onClick={() => {/* Generate optimization */}}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        🤖 Optimize
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <PanelShell title="Timeline" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="animate-pulse text-muted">Loading timeline data...</div>
        </div>
      </PanelShell>
    );
  }

  if (!timeline) {
    return (
      <PanelShell title="Timeline" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="text-err">Timeline not found</div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title={`Timeline — ${timeline.guestCount} Guests`} toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Timeline Overview */}
        <div className="glass-panel p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-muted">Status</div>
              <div className={`text-lg font-bold capitalize ${
                timeline.status === 'active' ? 'text-accent' :
                timeline.status === 'completed' ? 'text-ok' :
                'text-primary'
              }`}>
                {timeline.status}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Total Duration</div>
              <div className="text-lg font-bold text-primary">{Math.round(timeline.totalDuration / 60)}h</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Staff Hours</div>
              <div className="text-lg font-bold text-accent">{timeline.totalStaffHours}h</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Peak Staffing</div>
              <div className="text-lg font-bold text-primary">{timeline.peakStaffing}</div>
            </div>
          </div>
          
          {/* Day selector */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedDay('prep')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedDay === 'prep'
                  ? 'bg-accent text-white'
                  : 'bg-panel border border-default hover:bg-muted/10'
              }`}
            >
              📋 Prep Day ({timeline.prepDay.totalTasks} tasks)
            </button>
            <button
              onClick={() => setSelectedDay('execution')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedDay === 'execution'
                  ? 'bg-accent text-white'
                  : 'bg-panel border border-default hover:bg-muted/10'
              }`}
            >
              🎯 Event Day ({timeline.executionDay.totalTasks} tasks)
            </button>
          </div>
        </div>

        {/* Echo AI Optimization */}
        <EchoOptimizationSuggestions 
          optimization={echoOptimization}
          onApplyOptimization={handleApplyOptimization}
        />

        {/* Filters and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="p-2 bg-panel border border-default rounded-lg text-sm"
            >
              <option value="all">All Roles</option>
              {currentDay?.roleAssignments.map(role => (
                <option key={role.roleId} value={role.roleId}>
                  {role.roleName}
                </option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded"
              />
              Show completed tasks
            </label>
          </div>
          
          <div className="text-sm text-muted">
            {filteredTasks.length} of {currentDay?.totalTasks || 0} tasks shown
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main timeline */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-accent mb-4">
              {selectedDay === 'prep' ? '📋 Prep Day Tasks' : '🎯 Execution Day Tasks'}
            </h3>
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                  <div className="text-muted">No tasks found</div>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={handleTaskStatusUpdate}
                    onUpdateProgress={handleTaskProgressUpdate}
                  />
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Role breakdown */}
            {currentDay && (
              <RoleBreakdown 
                roleAssignments={currentDay.roleAssignments}
                currentTime={currentTime}
              />
            )}
            
            {/* Milestones */}
            {currentDay && currentDay.milestones.length > 0 && (
              <MilestoneTracker 
                milestones={currentDay.milestones}
                currentTime={currentTime}
              />
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
};

export default TimelinePanel;
