import { useState, useCallback } from "react";
import { supabase } from "@/lib/auth-service";
import { toast } from "sonner";

export interface RecipeDeployment {
  id: string;
  created_by: string;
  deployment_name: string;
  description?: string;
  status:
    | "draft"
    | "scheduled"
    | "in_progress"
    | "completed"
    | "failed"
    | "cancelled";
  target_outlets: string[];
  target_locations: string[];
  all_outlets: boolean;
  deployment_type: "recipe_update" | "menu_rollout" | "procedure_update";
  priority: "critical" | "high" | "normal" | "low";
  requires_confirmation: boolean;
  scheduled_at?: string;
  confirmation_deadline?: string;
  allow_rollback: boolean;
  rollback_deadline?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface DeploymentPacket {
  recipe_id: string;
  recipe_name: string;
  packet_data: Record<string, any>;
  previous_recipe_version_hash?: string;
  changes_summary?: Record<string, any>;
}

export interface StoreConfirmation {
  id: string;
  deployment_id: string;
  outlet_id: string;
  location_id?: string;
  status:
    | "pending"
    | "received"
    | "confirmed"
    | "applied"
    | "failed"
    | "rejected";
  received_at?: string;
  confirmed_at?: string;
  applied_at?: string;
  confirmed_by_user_id?: string;
  confirmed_by_username?: string;
  rejection_reason?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DeploymentWithDetails extends RecipeDeployment {
  deployment_packets?: Array<DeploymentPacket & { id: string }>;
  store_deployment_confirmations?: StoreConfirmation[];
}

export function useRecipeDeployment() {
  const [loading, setLoading] = useState(false);
  const [deployments, setDeployments] = useState<RecipeDeployment[]>([]);
  const [selectedDeployment, setSelectedDeployment] =
    useState<DeploymentWithDetails | null>(null);

  const createDeployment = useCallback(
    async (
      deploymentName: string,
      description: string | undefined,
      targetOutlets: string[],
      targetLocations: string[] | undefined,
      allOutlets: boolean,
      deploymentType: "recipe_update" | "menu_rollout" | "procedure_update",
      priority: "critical" | "high" | "normal" | "low",
      packets: DeploymentPacket[],
      scheduledAt?: string,
      confirmationDeadline?: string,
      allowRollback?: boolean,
      rollbackDeadline?: string,
    ) => {
      setLoading(true);
      try {
        const response = await fetch("/api/recipes/deployments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deployment_name: deploymentName,
            description,
            target_outlets: targetOutlets,
            target_locations: targetLocations,
            all_outlets: allOutlets,
            deployment_type: deploymentType,
            priority,
            requires_confirmation: true,
            scheduled_at: scheduledAt,
            confirmation_deadline: confirmationDeadline,
            allow_rollback: allowRollback,
            rollback_deadline: rollbackDeadline,
            packets,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create deployment");
        }

        const { deployment } = await response.json();
        toast.success("Deployment created successfully");
        return deployment;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to create deployment",
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchDeployments = useCallback(
    async (status?: string, limit = 50, offset = 0) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        params.append("limit", limit.toString());
        params.append("offset", offset.toString());

        const response = await fetch(
          `/api/recipes/deployments?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Failed to fetch deployments");

        const { data } = await response.json();
        setDeployments(data);
        return data;
      } catch (error) {
        toast.error("Failed to fetch deployments");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchDeploymentDetails = useCallback(async (deploymentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recipes/deployments/${deploymentId}`);
      if (!response.ok) throw new Error("Failed to fetch deployment details");

      const { deployment } = await response.json();
      setSelectedDeployment(deployment);
      return deployment;
    } catch (error) {
      toast.error("Failed to fetch deployment details");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStoreConfirmation = useCallback(
    async (
      deploymentId: string,
      outletId: string,
      status: "received" | "confirmed" | "applied" | "rejected" | "failed",
      confirmedByUserId?: string,
      confirmedByUsername?: string,
      rejectionReason?: string,
      failureReason?: string,
    ) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/recipes/deployments/${deploymentId}/store-confirmations/${outletId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              confirmed_by_user_id: confirmedByUserId,
              confirmed_by_username: confirmedByUsername,
              rejection_reason: rejectionReason,
              failure_reason: failureReason,
            }),
          },
        );

        if (!response.ok) throw new Error("Failed to update confirmation");

        const { confirmation } = await response.json();
        toast.success(`Store confirmation updated: ${status}`);

        // Refresh deployment details
        await fetchDeploymentDetails(deploymentId);
        return confirmation;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update confirmation",
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchDeploymentDetails],
  );

  const startDeployment = useCallback(async (deploymentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/recipes/deployments/${deploymentId}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) throw new Error("Failed to start deployment");

      const { deployment } = await response.json();
      toast.success("Deployment started");
      return deployment;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start deployment",
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelDeployment = useCallback(async (deploymentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/recipes/deployments/${deploymentId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) throw new Error("Failed to cancel deployment");

      const { deployment } = await response.json();
      toast.success("Deployment cancelled");
      return deployment;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel deployment",
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    deployments,
    selectedDeployment,
    createDeployment,
    fetchDeployments,
    fetchDeploymentDetails,
    updateStoreConfirmation,
    startDeployment,
    cancelDeployment,
    setSelectedDeployment,
  };
}
