import { useState, useCallback } from "react";
import { rdLabsAPI, type ApiResponse, type Experiment } from "@/lib/rdlabs-api";

interface UseRDLabsAPIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseRDLabsAPIResult<T> extends UseRDLabsAPIState<T> {
  refetch: () => Promise<void>;
}

/**
 * Custom hook for R&D Labs API calls
 * Provides loading, error, and data states
 */
export function useRDLabsAPI<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  deps: any[] = []
): UseRDLabsAPIResult<T> {
  const [state, setState] = useState<UseRDLabsAPIState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await apiCall();
      if (response.success && response.data) {
        setState({ data: response.data, loading: false, error: null });
      } else {
        setState({
          data: null,
          loading: false,
          error: response.error?.message || "Unknown error",
        });
      }
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [apiCall]);

  // Fetch on mount
  useState(() => {
    refetch();
  });

  return { ...state, refetch };
}

/**
 * Hook for listing experiments
 */
export function useListExperiments(params?: {
  status?: string;
  specialization?: string;
  search?: string;
}) {
  return useRDLabsAPI(
    () => rdLabsAPI.listExperiments(params),
    [params?.status, params?.specialization, params?.search]
  );
}

/**
 * Hook for getting single experiment
 */
export function useGetExperiment(id: string) {
  return useRDLabsAPI(() => rdLabsAPI.getExperiment(id), [id]);
}

/**
 * Hook for creating experiment with mutation
 */
export function useCreateExperiment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: {
    title: string;
    hypothesis: string;
    specialization: "culinary" | "pastry" | "cross-disciplinary";
    description?: string;
    tags?: string[];
  }): Promise<Experiment | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await rdLabsAPI.createExperiment(data);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || "Failed to create experiment");
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/**
 * Hook for updating experiment
 */
export function useUpdateExperiment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (
    id: string,
    updates: Partial<Experiment>
  ): Promise<Experiment | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await rdLabsAPI.updateExperiment(id, updates);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || "Failed to update experiment");
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}

/**
 * Hook for deleting experiment
 */
export function useDeleteExperiment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteExperiment = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await rdLabsAPI.deleteExperiment(id);
      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || "Failed to delete experiment");
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteExperiment, loading, error };
}

/**
 * Hook for adding experiment step
 */
export function useAddExperimentStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStep = useCallback(async (
    experimentId: string,
    data: {
      title: string;
      description?: string;
      variables?: string[];
    }
  ): Promise<any | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await rdLabsAPI.addStep(experimentId, data);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || "Failed to add step");
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { addStep, loading, error };
}

/**
 * Hook for linking recipe
 */
export function useLinkRecipe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkRecipe = useCallback(async (
    experimentId: string,
    data: {
      recipe_id: string;
      implementation_notes?: string;
    }
  ): Promise<any | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await rdLabsAPI.linkRecipe(experimentId, data);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || "Failed to link recipe");
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { linkRecipe, loading, error };
}

/**
 * Hook for granting access
 */
export function useGrantAccess() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantAccess = useCallback(async (
    experimentId: string,
    data: {
      email: string;
      role: "owner" | "editor" | "viewer";
    }
  ): Promise<any | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await rdLabsAPI.grantAccess(experimentId, data);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || "Failed to grant access");
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { grantAccess, loading, error };
}
