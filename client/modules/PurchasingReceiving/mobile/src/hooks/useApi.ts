import { useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
export function useApi<T>(url: string, initialData: T | null = null) {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });
  const fetchData = useCallback(
    async (options?: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      data?: any;
    }) => {
      setState({ data: null, loading: true, error: null });
      try {
        const response = await axios({
          method: options?.method || "GET",
          url,
          data: options?.data,
          headers: { "Content-Type": "application/json" },
        });
        setState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (err) {
        const error = err as AxiosError;
        const errorMessage = error.message || "An error occurred";
        setState({ data: null, loading: false, error: errorMessage });
        throw error;
      }
    },
    [url],
  );
  const mutate = useCallback(
    async (newData: T, options?: { method?: "POST" | "PUT" | "DELETE" }) => {
      setState({ data: null, loading: true, error: null });
      try {
        const response = await axios({
          method: options?.method || "POST",
          url,
          data: newData,
          headers: { "Content-Type": "application/json" },
        });
        setState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (err) {
        const error = err as AxiosError;
        const errorMessage = error.message || "An error occurred";
        setState({ data: null, loading: false, error: errorMessage });
        throw error;
      }
    },
    [url],
  );
  return { ...state, fetchData, mutate };
}
