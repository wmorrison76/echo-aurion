import { useEffect, useState, useCallback } from "react";
import {
  echoMemoryCore,
  MemorySession,
  RoomMemoryEntry,
} from "@/lib/EchoMemoryCore";
export interface UseEchoMemoryOptions {
  sessionId?: string;
  roomType?: string;
}
export interface UseEchoMemoryReturn {
  sessions: MemorySession[];
  currentSession: MemorySession | null;
  learnedHeuristics: {
    planarityBias: number;
    noiseSuppressionLevel: number;
    featureMatchThreshold: number;
    confidenceBoost: number;
  };
  statistics: any;
  registerSession: (
    sessionId: string,
    roomType?: string,
    location?: string,
  ) => MemorySession;
  updateSession: (data: Partial<MemorySession>) => void;
  recordSuccess: (accuracy: number, corrections: number) => void;
  storeRoomMemory: (entry: RoomMemoryEntry) => void;
  getRoomMemory: () => RoomMemoryEntry | null;
  findSimilarRooms: (limit?: number) => MemorySession[];
  clearMemory: () => void;
} /** * React hook for EchoAI³ Memory Core integration * Provides session management and adaptive learning */
export function useEchoMemory(
  options?: UseEchoMemoryOptions,
): UseEchoMemoryReturn {
  const [sessions, setSessions] = useState<MemorySession[]>([]);
  const [currentSession, setCurrentSession] = useState<MemorySession | null>(
    null,
  );
  const [statistics, setStatistics] = useState<any>(null); // Initialize/update sessions list useEffect(() => { setSessions(echoMemoryCore.getAllSessions()); setStatistics(echoMemoryCore.getStatistics()); // Register session if not already done if (options?.sessionId && !currentSession) { const session = echoMemoryCore.registerSession( options.sessionId, options.roomType ); setCurrentSession(session); setSessions(echoMemoryCore.getAllSessions()); } }, [options?.sessionId, options?.roomType, currentSession]); // Get learned heuristics const learnedHeuristics = echoMemoryCore.getLearnedHeuristics( currentSession?.roomType || options?.roomType ); const registerSession = useCallback( (sessionId: string, roomType?: string, location?: string) => { const session = echoMemoryCore.registerSession(sessionId, roomType, location); setCurrentSession(session); setSessions(echoMemoryCore.getAllSessions()); return session; }, [] ); const updateSession = useCallback((data: Partial<MemorySession>) => { if (!currentSession) return; echoMemoryCore.updateSession(currentSession.sessionId, data); setCurrentSession(echoMemoryCore.sessions as any); setSessions(echoMemoryCore.getAllSessions()); }, [currentSession]); const recordSuccess = useCallback( (accuracy: number, corrections: number) => { if (!currentSession) return; echoMemoryCore.recordSuccess(currentSession.sessionId, accuracy, corrections); const updated = echoMemoryCore.sessions as any; setCurrentSession(updated.get(currentSession.sessionId) || null); setSessions(echoMemoryCore.getAllSessions()); }, [currentSession] ); const storeRoomMemory = useCallback((entry: RoomMemoryEntry) => { echoMemoryCore.storeRoomMemory(entry); setStatistics(echoMemoryCore.getStatistics()); }, []); const getRoomMemory = useCallback(() => { if (!currentSession) return null; return echoMemoryCore.getRoomMemory(currentSession.sessionId); }, [currentSession]); const findSimilarRooms = useCallback( (limit?: number) => { if (!currentSession) return []; return echoMemoryCore.findSimilarRooms(currentSession.sessionId, limit); }, [currentSession] ); const clearMemory = useCallback(() => { echoMemoryCore.clearMemory(); setSessions([]); setCurrentSession(null); setStatistics(null); }, []); return { sessions, currentSession, learnedHeuristics, statistics, registerSession, updateSession, recordSuccess, storeRoomMemory, getRoomMemory, findSimilarRooms, clearMemory, };
}
