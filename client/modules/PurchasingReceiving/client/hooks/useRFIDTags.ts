/** * useRFIDTags - React hooks for RFID tag management * Handles tag registration, product assignments, location tracking */ import {
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  RFIDTag,
  TagProductAssignment,
  TagLocation,
  TagMovementHistory,
} from "@shared/types/iot";
import * as tagAPI from "@shared/api/rfid-tags";
interface UseTagsOptions {
  organizationId: string;
  status?: "active" | "inactive" | "lost" | "damaged";
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useRFIDTags(options: UseTagsOptions) {
  const [tags, setTags] = useState<RFIDTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tagAPI.getTags(options.organizationId, {
        status: options.status,
        limit: options.limit || 100,
      });
      setTags(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch RFID tags"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.status, options.limit]);
  useEffect(() => {
    fetchTags();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchTags,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchTags, options.autoRefresh, options.refreshInterval]);
  const createTag = useCallback(
    async (tag: Omit<RFIDTag, "id" | "created_at" | "updated_at">) => {
      try {
        const newTag = await tagAPI.createTag(tag);
        setTags([...tags, newTag]);
        return newTag;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to create RFID tag");
      }
    },
    [tags],
  );
  const updateTagStatus = useCallback(
    async (
      tagId: string,
      status: "active" | "inactive" | "lost" | "damaged",
    ) => {
      try {
        const updated = await tagAPI.updateTagStatus(tagId, status);
        setTags(tags.map((t) => (t.id === tagId ? updated : t)));
        return updated;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to update tag status");
      }
    },
    [tags],
  );
  return {
    tags,
    loading,
    error,
    refetch: fetchTags,
    createTag,
    updateTagStatus,
    summary: {
      total: tags.length,
      active: tags.filter((t) => t.status === "active").length,
      lost: tags.filter((t) => t.status === "lost").length,
    },
  };
}
interface UseTagLocationsOptions {
  organizationId: string;
  outletId?: string;
  zone?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useTagLocations(options: UseTagLocationsOptions) {
  const [locations, setLocations] = useState<TagLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tagAPI.getTagLocations(options.organizationId, {
        outletId: options.outletId,
        zone: options.zone,
      });
      setLocations(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch tag locations"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId, options.zone]);
  useEffect(() => {
    fetchLocations();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchLocations,
        (options.refreshInterval || 60) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchLocations, options.autoRefresh, options.refreshInterval]);
  const recordLocation = useCallback(
    async (location: Omit<TagLocation, "id" | "read_at" | "is_latest">) => {
      try {
        const newLocation = await tagAPI.recordTagLocation(location);
        setLocations([newLocation, ...locations]);
        return newLocation;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to record tag location");
      }
    },
    [locations],
  );
  const byZone = locations.reduce(
    (acc, loc) => {
      const zone = loc.zone || "unknown";
      acc[zone] = (acc[zone] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
    recordLocation,
    summary: { total: locations.length, byZone },
  };
}
interface UseTagProductAssignmentsOptions {
  organizationId: string;
  outletId?: string;
  highValueOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useTagProductAssignments(
  options: UseTagProductAssignmentsOptions,
) {
  const [assignments, setAssignments] = useState<TagProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tagAPI.getTagProductAssignments(
        options.organizationId,
        { outletId: options.outletId, highValueOnly: options.highValueOnly },
      );
      setAssignments(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch tag-product assignments"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId, options.highValueOnly]);
  useEffect(() => {
    fetchAssignments();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchAssignments,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchAssignments, options.autoRefresh, options.refreshInterval]);
  const assignTag = useCallback(
    async (
      assignment: Omit<
        TagProductAssignment,
        "id" | "assigned_at" | "is_current"
      >,
    ) => {
      try {
        const newAssignment = await tagAPI.assignTagToProduct(assignment);
        setAssignments([...assignments, newAssignment]);
        return newAssignment;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to assign tag to product");
      }
    },
    [assignments],
  );
  const deassignTag = useCallback(
    async (assignmentId: string) => {
      try {
        await tagAPI.deassignTagFromProduct(assignmentId);
        setAssignments(assignments.filter((a) => a.id !== assignmentId));
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to deassign tag");
      }
    },
    [assignments],
  );
  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    assignTag,
    deassignTag,
    summary: {
      total: assignments.length,
      highValue: assignments.filter((a) => a.high_value).length,
      trackingSpoilage: assignments.filter((a) => a.track_spoilage).length,
    },
  };
}
interface UseTagMovementHistoryOptions {
  tagId: string;
  limit?: number;
}
export function useTagMovementHistory(options: UseTagMovementHistoryOptions) {
  const [history, setHistory] = useState<TagMovementHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await tagAPI.getTagMovementHistory(options.tagId, {
          limit: options.limit || 100,
        });
        setHistory(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch tag movement history"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.tagId, options.limit]);
  const suspiciousMovements = history.filter(
    (m) => m.movement_type === "unusual" || m.movement_type === "theft_risk",
  );
  return { history, loading, error, suspiciousMovements };
}
interface UseHighValueTagsOptions {
  organizationId: string;
  outletId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useHighValueTags(options: UseHighValueTagsOptions) {
  const [tags, setTags] = useState<
    (TagLocation & { product_name?: string; product_code?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tagAPI.getHighValueTagLocations(
        options.organizationId,
        options.outletId,
      );
      setTags(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch high-value tags"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId]);
  useEffect(() => {
    fetchTags();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchTags,
        (options.refreshInterval || 60) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchTags, options.autoRefresh, options.refreshInterval]);
  return { tags, loading, error, refetch: fetchTags, total: tags.length };
}
