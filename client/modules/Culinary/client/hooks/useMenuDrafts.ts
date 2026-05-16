import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { MenuDraft, MenuDraftResponse } from "@/client/types/menu";

export function useMenuDrafts() {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [drafts, setDrafts] = useState<MenuDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch drafts
  const fetchDrafts = useCallback(
    async (propertyId?: string) => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (propertyId) params.append("propertyId", propertyId);

        const response = await fetch(`/api/menu-drafts?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch drafts");

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setDrafts(data.data);
        } else {
          throw new Error(data.error || "Failed to fetch drafts");
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

  // Create draft
  const createDraft = useCallback(
    async (draftData: Partial<MenuDraft>) => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/menu-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draftData,
            userId: user.id,
          }),
        });

        if (!response.ok) throw new Error("Failed to create draft");

        const data: MenuDraftResponse = await response.json();
        if (data.success && data.data) {
          setDrafts((prev) => [data.data!, ...prev]);
          toast({
            title: "Success",
            description: "Draft created successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to create draft");
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

  // Update draft
  const updateDraft = useCallback(
    async (draftId: string, updates: Partial<MenuDraft>) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menu-drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error("Failed to update draft");

        const data: MenuDraftResponse = await response.json();
        if (data.success && data.data) {
          setDrafts((prev) =>
            prev.map((d) => (d.id === draftId ? data.data! : d))
          );
          return data.data;
        } else {
          throw new Error(data.error || "Failed to update draft");
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

  // Delete draft
  const deleteDraft = useCallback(
    async (draftId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menu-drafts/${draftId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete draft");

        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
        toast({
          title: "Success",
          description: "Draft deleted successfully",
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

  // Auto-save draft (periodic update)
  const autosaveDraft = useCallback(
    async (draftId: string, canvasState: Record<string, any>) => {
      try {
        const response = await fetch(`/api/menu-drafts/${draftId}/autosave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvasState }),
        });

        if (!response.ok) {
          console.error("Autosave failed");
          return false;
        }

        return true;
      } catch (err) {
        console.error("Autosave error:", err);
        return false;
      }
    },
    []
  );

  // Convert draft to menu
  const publishDraftAsMenu = useCallback(
    async (draftId: string, menuData: Partial<Record<string, any>>) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menu-drafts/${draftId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(menuData),
        });

        if (!response.ok) throw new Error("Failed to publish draft as menu");

        const data = await response.json();
        if (data.success) {
          setDrafts((prev) => prev.filter((d) => d.id !== draftId));
          toast({
            title: "Success",
            description: "Draft published as menu successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to publish draft as menu");
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
    drafts,
    loading,
    error,
    fetchDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
    autosaveDraft,
    publishDraftAsMenu,
  };
}
