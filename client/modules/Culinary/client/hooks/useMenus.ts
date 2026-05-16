import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type {
  Menu,
  MenuDraft,
  MenuQueryOptions,
  MenuResponse,
  MenuListResponse,
} from "@/client/types/menu";

export function useMenus() {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch menus with filters
  const fetchMenus = useCallback(
    async (options?: MenuQueryOptions) => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        
        if (options?.propertyId) params.append("propertyId", options.propertyId);
        if (options?.season) params.append("season", options.season);
        if (options?.menuType) params.append("menuType", options.menuType);
        if (options?.visibility) params.append("visibility", options.visibility);
        if (options?.isPublished !== undefined) params.append("isPublished", String(options.isPublished));
        if (options?.search) params.append("search", options.search);
        if (options?.limit) params.append("limit", String(options.limit));
        if (options?.offset) params.append("offset", String(options.offset));

        const response = await fetch(`/api/menus?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch menus");

        const data: MenuListResponse = await response.json();
        if (data.success && data.data) {
          setMenus(data.data);
        } else {
          throw new Error(data.error || "Failed to fetch menus");
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

  // Create menu
  const createMenu = useCallback(
    async (menuData: Partial<Menu>) => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...menuData,
            userId: user.id,
          }),
        });

        if (!response.ok) throw new Error("Failed to create menu");

        const data: MenuResponse = await response.json();
        if (data.success && data.data) {
          setMenus((prev) => [data.data!, ...prev]);
          toast({
            title: "Success",
            description: "Menu created successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to create menu");
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

  // Update menu
  const updateMenu = useCallback(
    async (menuId: string, updates: Partial<Menu>) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menus/${menuId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error("Failed to update menu");

        const data: MenuResponse = await response.json();
        if (data.success && data.data) {
          setMenus((prev) =>
            prev.map((m) => (m.id === menuId ? data.data! : m))
          );
          toast({
            title: "Success",
            description: "Menu updated successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to update menu");
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

  // Delete menu
  const deleteMenu = useCallback(
    async (menuId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menus/${menuId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete menu");

        setMenus((prev) => prev.filter((m) => m.id !== menuId));
        toast({
          title: "Success",
          description: "Menu deleted successfully",
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

  // Publish menu
  const publishMenu = useCallback(
    async (menuId: string, publishedBy?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menus/${menuId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publishedBy: publishedBy || user?.id }),
        });

        if (!response.ok) throw new Error("Failed to publish menu");

        const data: MenuResponse = await response.json();
        if (data.success && data.data) {
          setMenus((prev) =>
            prev.map((m) => (m.id === menuId ? data.data! : m))
          );
          toast({
            title: "Success",
            description: "Menu published successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to publish menu");
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

  // Share menu with users
  const shareMenu = useCallback(
    async (menuId: string, userIds: string[]) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menus/${menuId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });

        if (!response.ok) throw new Error("Failed to share menu");

        const data: MenuResponse = await response.json();
        if (data.success && data.data) {
          setMenus((prev) =>
            prev.map((m) => (m.id === menuId ? data.data! : m))
          );
          toast({
            title: "Success",
            description: "Menu shared successfully",
          });
          return data.data;
        } else {
          throw new Error(data.error || "Failed to share menu");
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
    menus,
    loading,
    error,
    fetchMenus,
    createMenu,
    updateMenu,
    deleteMenu,
    publishMenu,
    shareMenu,
  };
}
