import { useState, useCallback, useEffect } from "react";
interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  recipientList: string[];
  status: "draft" | "scheduled" | "sent" | "failed";
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
}
interface GeneratedCampaign {
  subject: string;
  content: string;
}
interface UseEmailCampaignsReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  getEmailCampaigns: () => Promise<void>;
  createCampaign: (data: Partial<Campaign>) => Promise<Campaign | null>;
  generateCampaign: (
    eventType: string,
    targetAudience: string,
    brandVoice?: string,
  ) => Promise<GeneratedCampaign | null>;
  sendCampaign: (campaignId: string) => Promise<boolean>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;
}
export const useEmailCampaigns = (): UseEmailCampaignsReturn => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getEmailCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/marketing-automation/campaigns", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      const data = await response.json();
      setCampaigns(data.data || []);
    } catch (err: any) {
      setError(err.message);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const createCampaign = useCallback(
    async (data: Partial<Campaign>): Promise<Campaign | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/marketing-automation/campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error(`Failed to create campaign: ${response.statusText}`);
        }
        const result = await response.json();
        const newCampaign = result.data;
        setCampaigns([...campaigns, newCampaign]);
        return newCampaign;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [campaigns],
  );
  const generateCampaign = useCallback(
    async (
      eventType: string,
      targetAudience: string,
      brandVoice?: string,
    ): Promise<GeneratedCampaign | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "/api/v1/marketing-automation/campaigns/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              eventType,
              targetAudience,
              brandVoice: brandVoice || "professional",
            }),
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to generate campaign: ${response.statusText}`,
          );
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const sendCampaign = useCallback(
    async (campaignId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/marketing-automation/campaigns/${campaignId}/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to send campaign: ${response.statusText}`);
        }
        setCampaigns(
          campaigns.map((c) =>
            c.id === campaignId ? { ...c, status: "sent" as const } : c,
          ),
        );
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [campaigns],
  );
  const deleteCampaign = useCallback(
    async (campaignId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/marketing-automation/campaigns/${campaignId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to delete campaign: ${response.statusText}`);
        }
        setCampaigns(campaigns.filter((c) => c.id !== campaignId));
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [campaigns],
  );
  return {
    campaigns,
    loading,
    error,
    getEmailCampaigns,
    createCampaign,
    generateCampaign,
    sendCampaign,
    deleteCampaign,
  };
};
