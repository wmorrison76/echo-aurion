import { useState, useCallback } from "react";
interface Survey {
  id: string;
  eventId: string;
  title: string;
  questions: any[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
interface UpsellOffer {
  id: string;
  eventId: string;
  attendeeId: string;
  offerType: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  conversionStatus: string;
  createdAt: Date;
  expiresAt: Date;
}
interface SurveyResults {
  survey: Survey;
  responses: any[];
  summary: any;
}
interface ConversionMetrics {
  totalOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
  pendingOffers: number;
  conversionRate: number;
  totalRevenue: number;
}
interface UsePostEventPortalReturn {
  loading: boolean;
  error: string | null;
  generateSurvey: (
    eventId: string,
    title: string,
    questions: any[],
  ) => Promise<Survey | null>;
  submitFeedback: (
    surveyId: string,
    respondentId: string,
    answers: Record<string, any>,
  ) => Promise<boolean>;
  getUpsells: (eventId: string) => Promise<UpsellOffer[]>;
  getUpsellConversions: (eventId: string) => Promise<ConversionMetrics | null>;
  getSurveyResults: (surveyId: string) => Promise<SurveyResults | null>;
}
export const usePostEventPortal = (): UsePostEventPortalReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateSurvey = useCallback(
    async (
      eventId: string,
      title: string,
      questions: any[],
    ): Promise<Survey | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/post-event-portal/surveys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ eventId, title, questions }),
        });
        if (!response.ok) {
          throw new Error(`Failed to generate survey: ${response.statusText}`);
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
  const submitFeedback = useCallback(
    async (
      surveyId: string,
      respondentId: string,
      answers: Record<string, any>,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/post-event-portal/surveys/${surveyId}/response`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ respondentId, answers }),
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to submit feedback: ${response.statusText}`);
        }
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getUpsells = useCallback(
    async (eventId: string): Promise<UpsellOffer[]> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/post-event-portal/upsells/${eventId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch upsells: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data || [];
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getUpsellConversions = useCallback(
    async (eventId: string): Promise<ConversionMetrics | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/post-event-portal/upsells/${eventId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch conversions: ${response.statusText}`,
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
  const getSurveyResults = useCallback(
    async (surveyId: string): Promise<SurveyResults | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/post-event-portal/surveys/${surveyId}/results`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch survey results: ${response.statusText}`,
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
  return {
    loading,
    error,
    generateSurvey,
    submitFeedback,
    getUpsells,
    getUpsellConversions,
    getSurveyResults,
  };
};
