import { useCallback, useState } from "react";
import type {
  UnifiedRequest,
  UnifiedResponse,
} from "../echo/engines/EchoUnifiedBrain";

interface UseEchoUnifiedBrainState {
  response: UnifiedResponse | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to query the Echo Unified Brain across all domains
 */
export function useEchoUnifiedBrain() {
  const [state, setState] = useState<UseEchoUnifiedBrainState>({
    response: null,
    isLoading: false,
    error: null,
  });

  const query = useCallback(
    async (request: UnifiedRequest): Promise<UnifiedResponse | null> => {
      setState({ response: null, isLoading: true, error: null });

      try {
        const response = await fetch("/api/echo-unified/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = (await response.json()) as UnifiedResponse;
        setState({ response: data, isLoading: false, error: null });
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ response: null, isLoading: false, error: err });
        throw err;
      }
    },
    [],
  );

  const batchQuery = useCallback(
    async (requests: UnifiedRequest[]): Promise<UnifiedResponse[]> => {
      setState({ response: null, isLoading: true, error: null });

      try {
        const response = await fetch("/api/echo-unified/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        setState({ response: null, isLoading: false, error: null });
        return data.responses;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ response: null, isLoading: false, error: err });
        throw err;
      }
    },
    [],
  );

  const getCapabilities = useCallback(async () => {
    try {
      const response = await fetch("/api/echo-unified/capabilities");
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch capabilities:", error);
      throw error;
    }
  }, []);

  return {
    response: state.response,
    isLoading: state.isLoading,
    error: state.error,
    query,
    batchQuery,
    getCapabilities,
  };
}
