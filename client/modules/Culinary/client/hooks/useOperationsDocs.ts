import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { OperationsDoc } from "@/client/types/menu";

export function useOperationsDocs() {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [docs, setDocs] = useState<OperationsDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch operations docs
  const fetchDocs = useCallback(
    async (propertyId?: string, menuId?: string) => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (propertyId) params.append("propertyId", propertyId);
        if (menuId) params.append("menuId", menuId);

        const response = await fetch(`/api/operations-docs?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch operations docs");

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setDocs(data.data);
        } else {
          throw new Error(data.error || "Failed to fetch operations docs");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user?.id, toast]
  );

  // Create operations doc
  const createDoc = useCallback(
    async (docData: Partial<OperationsDoc>) => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/operations-docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...docData,
            userId: user.id,
          }),
        });

        if (!response.ok) throw new Error("Failed to create operations doc");

        const data = await response.json();
        if (data.success && data.data) {
          setDocs((prev) => [data.data, ...prev]);
          toast({
            title: "Success",
            description: "Operations doc created successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to create operations doc");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, toast]
  );

  // Update operations doc
  const updateDoc = useCallback(
    async (docId: string, updates: Partial<OperationsDoc>) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/operations-docs/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error("Failed to update operations doc");

        const data = await response.json();
        if (data.success && data.data) {
          setDocs((prev) =>
            prev.map((d) => (d.id === docId ? data.data : d))
          );
          toast({
            title: "Success",
            description: "Operations doc updated successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to update operations doc");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Delete operations doc
  const deleteDoc = useCallback(
    async (docId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/operations-docs/${docId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete operations doc");

        setDocs((prev) => prev.filter((d) => d.id !== docId));
        toast({
          title: "Success",
          description: "Operations doc deleted successfully",
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Share doc with users
  const shareDoc = useCallback(
    async (docId: string, userIds: string[]) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/operations-docs/${docId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });

        if (!response.ok) throw new Error("Failed to share operations doc");

        const data = await response.json();
        if (data.success && data.data) {
          setDocs((prev) =>
            prev.map((d) => (d.id === docId ? data.data : d))
          );
          toast({
            title: "Success",
            description: "Operations doc shared successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to share operations doc");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    docs,
    loading,
    error,
    fetchDocs,
    createDoc,
    updateDoc,
    deleteDoc,
    shareDoc,
  };
}
