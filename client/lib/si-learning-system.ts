import { EchoMemoryVault } from '@/core/ai3/EchoMemoryVault';
import { EchoContextCluster } from '@/core/ai3/EchoContextCluster';

export interface APILogEntry {
  timestamp: number;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  permissions: string[];
  denied?: boolean;
  denialReason?: string;
  latency: number;
  module: string;
  action: string;
}

export interface UserBehaviorProfile {
  userId: string;
  userName: string;
  totalRequests: number;
  successRate: number;
  commonActions: Map<string, number>;
  deniedActions: Map<string, number>;
  accessPatterns: AccessPattern;
  avgLatency: number;
  averagePermissionCount: number;
  riskScore: number; // 0-100
  lastUpdated: number;
}

export interface AccessPattern {
  peakHours: number[];
  weekdayVsWeekend: { weekday: number; weekend: number };
  departments: Map<string, number>;
  outlets: Map<string, number>;
  offHoursAccess: boolean;
  unusualAccessTimes: number;
}

export interface PermissionOptimization {
  userId: string;
  recommendedPermissions: string[];
  redundantPermissions: string[];
  missingPermissions: string[];
  confidenceScore: number;
}

export interface SystemPinchPoint {
  id: string;
  category: 'permission' | 'performance' | 'access' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: number;
  affectedModules: string[];
  errorRate: number;
  firstDetected: number;
  lastDetected: number;
  recommendations: string[];
}

export class SILearningSystem {
  private static instance: SILearningSystem | null = null;
  private memoryVault = EchoMemoryVault.getInstance();
  private contextCluster = EchoContextCluster.getInstance();

  private apiLogs: APILogEntry[] = [];
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private pinchPoints: Map<string, SystemPinchPoint> = new Map();

  private constructor() {
    this.initializeLearning();
  }

  static getInstance() {
    if (!SILearningSystem.instance) {
      SILearningSystem.instance = new SILearningSystem();
    }
    return SILearningSystem.instance;
  }

  private async initializeLearning() {
    // Load persisted data from memory vault
    await this.loadPersistedData();
  }

  /**
   * Ingest API logs for learning
   */
  async ingestAPILogs(logs: APILogEntry[]): Promise<void> {
    this.apiLogs.push(...logs);

    // Keep only recent logs (last 90 days)
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    this.apiLogs = this.apiLogs.filter((log) => log.timestamp > ninetyDaysAgo);

    // Analyze and update user profiles
    for (const log of logs) {
      await this.updateUserProfile(log);
    }

    // Detect pinch points
    await this.detectPinchPoints();

    // Persist updated data
    await this.persistLearningData();
  }

  /**
   * Update user behavior profile based on API log
   */
  private async updateUserProfile(log: APILogEntry): Promise<void> {
    let profile = this.userProfiles.get(log.userId);

    if (!profile) {
      profile = {
        userId: log.userId,
        userName: log.userId,
        totalRequests: 0,
        successRate: 0,
        commonActions: new Map(),
        deniedActions: new Map(),
        accessPatterns: {
          peakHours: [],
          weekdayVsWeekend: { weekday: 0, weekend: 0 },
          departments: new Map(),
          outlets: new Map(),
          offHoursAccess: false,
          unusualAccessTimes: 0,
        },
        avgLatency: 0,
        averagePermissionCount: 0,
        riskScore: 0,
        lastUpdated: Date.now(),
      };
    }

    // Update basic metrics
    profile.totalRequests++;
    const hour = new Date(log.timestamp).getHours();
    if (!profile.accessPatterns.peakHours.includes(hour)) {
      profile.accessPatterns.peakHours.push(hour);
    }

    // Update action tracking
    const actionKey = `${log.module}:${log.action}`;
    if (log.denied) {
      profile.deniedActions.set(actionKey, (profile.deniedActions.get(actionKey) || 0) + 1);
    } else {
      profile.commonActions.set(actionKey, (profile.commonActions.get(actionKey) || 0) + 1);
    }

    // Calculate success rate
    const deniedCount = Array.from(profile.deniedActions.values()).reduce((a, b) => a + b, 0);
    profile.successRate = (profile.totalRequests - deniedCount) / profile.totalRequests;

    // Update latency
    profile.avgLatency = (profile.avgLatency * (profile.totalRequests - 1) + log.latency) / profile.totalRequests;

    // Update permission count
    profile.averagePermissionCount = (profile.averagePermissionCount * (profile.totalRequests - 1) + log.permissions.length) / profile.totalRequests;

    // Check for unusual patterns
    const dayOfWeek = new Date(log.timestamp).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      profile.accessPatterns.weekdayVsWeekend.weekend++;
    } else {
      profile.accessPatterns.weekdayVsWeekend.weekday++;
    }

    // Detect off-hours access
    if (hour < 6 || hour > 22) {
      profile.accessPatterns.offHoursAccess = true;
      profile.accessPatterns.unusualAccessTimes++;
    }

    // Calculate risk score
    profile.riskScore = this.calculateUserRiskScore(profile);
    profile.lastUpdated = Date.now();

    this.userProfiles.set(log.userId, profile);
  }

  /**
   * Detect system pinch points
   */
  private async detectPinchPoints(): Promise<void> {
    const now = Date.now();

    // Analyze error patterns
    for (const log of this.apiLogs) {
      if (log.statusCode >= 400) {
        const pointKey = `error-${log.endpoint}`;
        let point = this.pinchPoints.get(pointKey);

        if (!point) {
          point = {
            id: pointKey,
            category: 'access',
            severity: 'medium',
            description: `High error rate on endpoint ${log.endpoint}`,
            affectedUsers: new Set<string>().size,
            affectedModules: [log.module],
            errorRate: 0,
            firstDetected: now,
            lastDetected: now,
            recommendations: [],
          };
        }

        point.lastDetected = now;
        this.pinchPoints.set(pointKey, point);
      }
    }

    // Analyze permission denial patterns
    const denialGroups = new Map<string, APILogEntry[]>();
    for (const log of this.apiLogs) {
      if (log.denied) {
        const action = `${log.module}:${log.action}`;
        if (!denialGroups.has(action)) {
          denialGroups.set(action, []);
        }
        denialGroups.get(action)!.push(log);

        // Emit trace for permission denial pattern detection
        try {
          const { emitTrace } = await import("./trace-emitter");
          await emitTrace(
            "permission-denial-pattern",
            `pattern-${action}-${Date.now()}`,
            "si-learning-system",
            "permissions",
            {
              module: log.module,
              action: log.action,
              endpoint: log.endpoint,
              userId: log.userId,
            },
            {
              patternDetected: true,
              action,
              denialCount: denialGroups.get(action)!.length,
            },
            {
              confidence: 0.8, // Pattern detection confidence
            }
          );
        } catch {
          // Ignore import/emission errors - graceful degradation
        }
      }
    }

    for (const [action, logs] of denialGroups) {
      if (logs.length > 5) {
        const pointKey = `permission-${action}`;
        let point = this.pinchPoints.get(pointKey);

        if (!point) {
          point = {
            id: pointKey,
            category: 'permission',
            severity: logs.length > 20 ? 'high' : 'medium',
            description: `Frequent access denial on ${action} (${logs.length} instances)`,
            affectedUsers: new Set(logs.map((l) => l.userId)).size,
            affectedModules: [logs[0].module],
            errorRate: logs.length / Math.max(1, this.apiLogs.length),
            firstDetected: Math.min(...logs.map((l) => l.timestamp)),
            lastDetected: Math.max(...logs.map((l) => l.timestamp)),
            recommendations: [
              `Review if ${action} permission should be granted to more users`,
              `Provide alternative permissions for denied action`,
              `Audit access control policy for this action`,
            ],
          };
        }

        this.pinchPoints.set(pointKey, point);
      }
    }

    // Analyze latency patterns
    const latencies = this.apiLogs.map((l) => l.latency).sort((a, b) => a - b);
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];

    for (const log of this.apiLogs) {
      if (log.latency > p95Latency * 1.5) {
        const pointKey = `latency-${log.endpoint}`;
        let point = this.pinchPoints.get(pointKey);

        if (!point) {
          point = {
            id: pointKey,
            category: 'performance',
            severity: 'medium',
            description: `Slow endpoint: ${log.endpoint} (${log.latency}ms)`,
            affectedUsers: 1,
            affectedModules: [log.module],
            errorRate: 0,
            firstDetected: now,
            lastDetected: now,
            recommendations: [
              `Optimize database queries on ${log.endpoint}`,
              `Consider caching for ${log.module}`,
              `Review permission checking logic performance`,
            ],
          };
        }

        this.pinchPoints.set(pointKey, point);
      }
    }
  }

  /**
   * Generate permission optimization recommendations
   */
  async generateOptimizations(userId: string): Promise<PermissionOptimization> {
    const profile = this.userProfiles.get(userId);

    if (!profile) {
      return {
        userId,
        recommendedPermissions: [],
        redundantPermissions: [],
        missingPermissions: [],
        confidenceScore: 0,
      };
    }

    // Find frequently denied actions - these should be granted
    const missingPermissions = Array.from(profile.deniedActions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action]) => action);

    // Find rarely used permissions - these might be redundant
    const allActions = new Set([
      ...profile.commonActions.keys(),
      ...profile.deniedActions.keys(),
    ]);
    const totalActionAccess = Array.from(profile.commonActions.values()).reduce((a, b) => a + b, 0);
    const redundantPermissions = Array.from(profile.commonActions.entries())
      .filter(([_, count]) => count < totalActionAccess * 0.02)
      .slice(0, 5)
      .map(([action]) => action);

    // Recommended permissions are based on common actions
    const recommendedPermissions = Array.from(profile.commonActions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action]) => action);

    return {
      userId,
      recommendedPermissions,
      redundantPermissions,
      missingPermissions,
      confidenceScore: profile.successRate,
    };
  }

  /**
   * Get system pinch points
   */
  getPinchPoints(severity?: string): SystemPinchPoint[] {
    let points = Array.from(this.pinchPoints.values());

    if (severity) {
      points = points.filter((p) => p.severity === severity);
    }

    return points.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0);
    });
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(userId);
  }

  /**
   * Get all user profiles
   */
  getAllProfiles(): UserBehaviorProfile[] {
    return Array.from(this.userProfiles.values());
  }

  private calculateUserRiskScore(profile: UserBehaviorProfile): number {
    let score = 0;

    // High denial rate is risky
    if (profile.successRate < 0.7) {
      score += 30;
    }

    // Off-hours access increases risk
    if (profile.accessPatterns.offHoursAccess && profile.accessPatterns.unusualAccessTimes > 5) {
      score += 20;
    }

    // High permission count is risky
    if (profile.averagePermissionCount > 30) {
      score += 25;
    }

    // Weekend access patterns
    const weekendRatio =
      profile.accessPatterns.weekdayVsWeekend.weekend /
      Math.max(1, profile.accessPatterns.weekdayVsWeekend.weekday + profile.accessPatterns.weekdayVsWeekend.weekend);
    if (weekendRatio > 0.3) {
      score += 15;
    }

    return Math.min(100, score);
  }

  private async loadPersistedData(): Promise<void> {
    // Load from memory vault if available
    try {
      const profiles = await this.memoryVault.recallMemory<Map<string, UserBehaviorProfile>>('si-user-profiles');
      if (profiles) {
        this.userProfiles = profiles;
      }

      const pinchPoints = await this.memoryVault.recallMemory<Map<string, SystemPinchPoint>>('si-pinch-points');
      if (pinchPoints) {
        this.pinchPoints = pinchPoints;
      }
    } catch (e) {
      // Ignore load errors
    }
  }

  private async persistLearningData(): Promise<void> {
    try {
      await this.memoryVault.storeMemory('si-user-profiles', this.userProfiles);
      await this.memoryVault.storeMemory('si-pinch-points', this.pinchPoints);
    } catch (e) {
      console.error('Failed to persist learning data:', e);
    }
  }
}
