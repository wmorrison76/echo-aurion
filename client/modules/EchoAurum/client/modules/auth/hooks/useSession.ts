import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionEnvelope, SessionPersona } from "@shared/session";
import {
  createSession,
  fetchPersonas,
  fetchSession,
  getStoredSessionToken,
  revokeSession,
  storeSessionToken,
} from "../api";
type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";
interface UseSessionResult {
  session: SessionEnvelope | null;
  personas: SessionPersona[];
  status: SessionStatus;
  personasLoading: boolean;
  personasError?: string;
  sessionError?: string;
  issueSession: (personaId: string) => Promise<SessionEnvelope | null>;
  revokeCurrentSession: () => Promise<void>;
  issuing: boolean;
  revoking: boolean;
  refresh: () => Promise<void>;
}
const SESSION_QUERY_KEY = ["auth", "session"] as const;
const PERSONA_QUERY_KEY = ["auth", "personas"] as const;
export function useSession(): UseSessionResult {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery<SessionEnvelope | null, Error>({
    queryKey: SESSION_QUERY_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const token = getStoredSessionToken();
      if (!token) {
        return null;
      }
      const session = await fetchSession(token);
      if (!session) {
        storeSessionToken(null);
        return null;
      }
      return session;
    },
  });
  const personasQuery = useQuery<SessionPersona[], Error>({
    queryKey: PERSONA_QUERY_KEY,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const data = await fetchPersonas();
      return data ?? [];
    },
  });
  const issueMutation = useMutation<SessionEnvelope | null, Error, string>({
    mutationFn: async (personaId) => {
      const session = await createSession(personaId);
      if (session) {
        storeSessionToken(session.token);
        queryClient.setQueryData(SESSION_QUERY_KEY, session);
      }
      return session;
    },
    onSuccess: (session) => {
      if (session) {
        queryClient.invalidateQueries({ queryKey: PERSONA_QUERY_KEY });
      }
    },
  });
  const revokeMutation = useMutation<void, Error>({
    mutationFn: async () => {
      const token = getStoredSessionToken();
      if (token) {
        await revokeSession(token);
      }
      storeSessionToken(null);
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
    },
  });
  const status: SessionStatus = useMemo(() => {
    if (sessionQuery.isLoading) {
      return "loading";
    }
    if (sessionQuery.isError) {
      return "error";
    }
    if (sessionQuery.data) {
      return "authenticated";
    }
    return "unauthenticated";
  }, [sessionQuery.isError, sessionQuery.isLoading, sessionQuery.data]);
  return {
    session: sessionQuery.data ?? null,
    personas: personasQuery.data ?? [],
    status,
    personasLoading: personasQuery.isLoading,
    personasError: personasQuery.isError
      ? personasQuery.error.message
      : undefined,
    sessionError: sessionQuery.isError ? sessionQuery.error.message : undefined,
    issueSession: (personaId: string) => issueMutation.mutateAsync(personaId),
    revokeCurrentSession: () => revokeMutation.mutateAsync(),
    issuing: issueMutation.isPending,
    revoking: revokeMutation.isPending,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  };
}
