import { useCallback, useEffect, useState } from 'react';
import { SIEngine, PermissionSuggestion, PermissionEnforcementPolicy } from '@/lib/si-engine';
import { SILearningSystem, UserBehaviorProfile, SystemPinchPoint, APILogEntry } from '@/lib/si-learning-system';
import { HQTelemetryClient, TelemetryEvent } from '@/lib/hq-telemetry-client';

export function useSIEngine() {
  const siEngine = SIEngine.getInstance();
  const learningSystem = SILearningSystem.getInstance();
  const telemetry = HQTelemetryClient.getInstance();

  const [suggestions, setSuggestions] = useState<PermissionSuggestion[]>([]);
  const [policies, setPolicies] = useState<PermissionEnforcementPolicy[]>([]);
  const [pinchPoints, setPinchPoints] = useState<SystemPinchPoint[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserBehaviorProfile[]>([]);

  useEffect(() => {
    setSuggestions(siEngine.getPendingSuggestions());
    setPolicies(siEngine.getPolicies());
    setPinchPoints(learningSystem.getPinchPoints());
    setUserProfiles(learningSystem.getAllProfiles());
  }, []);

  const generateSuggestions = useCallback(
    async (
      userId: string,
      userName: string,
      roleName: string,
      roleLevel: number,
      department: string,
      outletDepartment: string,
      actions: string[],
      historicalBehavior?: Record<string, any>
    ) => {
      const newSuggestions = await siEngine.generateSuggestions(
        userId,
        userName,
        roleName,
        roleLevel,
        department,
        outletDepartment,
        actions,
        historicalBehavior
      );
      setSuggestions(newSuggestions);
      return newSuggestions;
    },
    [siEngine]
  );

  const acceptSuggestion = useCallback(
    async (suggestionId: string) => {
      const result = await siEngine.processSuggestion(suggestionId, 'accept');
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      return result;
    },
    [siEngine]
  );

  const rejectSuggestion = useCallback(
    async (suggestionId: string, reason: string) => {
      const result = await siEngine.processSuggestion(suggestionId, 'reject', 'admin', reason);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      return result;
    },
    [siEngine]
  );

  const ingestAPILogs = useCallback(
    async (logs: APILogEntry[]) => {
      await learningSystem.ingestAPILogs(logs);
      setPinchPoints(learningSystem.getPinchPoints());
      setUserProfiles(learningSystem.getAllProfiles());
    },
    [learningSystem]
  );

  const recordUsage = useCallback(
    (userId: string, userName: string, module: string, action: string, details?: Record<string, any>) => {
      telemetry.recordUsage(userId, userName, module, action, details);
    },
    [telemetry]
  );

  const recordError = useCallback(
    (
      userId: string,
      userName: string,
      module: string,
      action: string,
      error: Error | string,
      severity?: 'warning' | 'error' | 'critical',
      details?: Record<string, any>
    ) => {
      telemetry.recordError(userId, userName, module, action, error, severity, details);
    },
    [telemetry]
  );

  const recordSecurityEvent = useCallback(
    (userId: string, userName: string, eventType: string, message: string, severity?: 'warning' | 'error' | 'critical', details?: Record<string, any>) => {
      telemetry.recordSecurityEvent(userId, userName, eventType, message, severity, details);
    },
    [telemetry]
  );

  const recordPerformance = useCallback(
    (userId: string, userName: string, module: string, action: string, latency: number, details?: Record<string, any>) => {
      telemetry.recordPerformance(userId, userName, module, action, latency, details);
    },
    [telemetry]
  );

  const upsertPolicy = useCallback(
    async (policy: PermissionEnforcementPolicy) => {
      const result = await siEngine.upsertPolicy(policy);
      setPolicies(siEngine.getPolicies());
      return result;
    },
    [siEngine]
  );

  const getEnforcementHistory = useCallback(
    (limit?: number) => {
      return siEngine.getEnforcementHistory(limit);
    },
    [siEngine]
  );

  const getPendingSuggestions = useCallback(() => {
    return siEngine.getPendingSuggestions();
  }, [siEngine]);

  const getUserProfile = useCallback(
    (userId: string) => {
      return learningSystem.getUserProfile(userId);
    },
    [learningSystem]
  );

  const generateOptimizations = useCallback(
    async (userId: string) => {
      return learningSystem.generateOptimizations(userId);
    },
    [learningSystem]
  );

  const getPendingBatches = useCallback(() => {
    return telemetry.getPendingBatches();
  }, [telemetry]);

  const generateHQReport = useCallback(() => {
    return telemetry.generateHQReport();
  }, [telemetry]);

  return {
    // Suggestions
    suggestions,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    getPendingSuggestions,
    getEnforcementHistory,

    // Policies
    policies,
    upsertPolicy,

    // Pinch points & learning
    pinchPoints,
    userProfiles,
    ingestAPILogs,
    getUserProfile,
    generateOptimizations,

    // Telemetry
    recordUsage,
    recordError,
    recordSecurityEvent,
    recordPerformance,
    getPendingBatches,
    generateHQReport,
  };
}
