import { SubscriptionTier } from "../types/PresentationTypes";

const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  basic: {
    level: "basic",
    features: {
      maxSlidesPerPresentation: 10,
      maxPresentationDuration: 30,
      exportFormats: ["pdf", "json"],
      interviewParticipants: 2,
      aiQuestionGeneration: false,
      liveTranslation: false,
      customBranding: false,
    },
  },
  pro: {
    level: "pro",
    features: {
      maxSlidesPerPresentation: 50,
      maxPresentationDuration: 120,
      exportFormats: ["pdf", "pptx", "json"],
      interviewParticipants: 5,
      aiQuestionGeneration: true,
      liveTranslation: false,
      customBranding: false,
    },
  },
  enterprise: {
    level: "enterprise",
    features: {
      maxSlidesPerPresentation: 500,
      maxPresentationDuration: 480,
      exportFormats: ["pdf", "pptx", "mp4", "json"],
      interviewParticipants: 25,
      aiQuestionGeneration: true,
      liveTranslation: true,
      customBranding: true,
    },
  },
};

export function useSubscriptionFeatures(
  tier: SubscriptionTier["level"] = "basic",
) {
  const subscription = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.basic;

  return {
    // Check if feature is available
    canUseFeature: (feature: keyof SubscriptionTier["features"]) => {
      const value = subscription.features[feature];
      // For boolean features, return the value
      // For array features (exportFormats), return true if not empty
      // For numeric features, return true if > 0
      if (typeof value === "boolean") return value;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "number") return value > 0;
      return false;
    },

    // Get feature value
    getFeatureValue: (feature: keyof SubscriptionTier["features"]) => {
      return subscription.features[feature];
    },

    // Check if specific export format is available
    canExport: (format: "pdf" | "mp4" | "pptx" | "json") => {
      const exportFormats = subscription.features.exportFormats;
      return exportFormats.includes(format);
    },

    // Check if slide count exceeds limit
    exceedsSlideLimit: (slideCount: number) => {
      return slideCount > subscription.features.maxSlidesPerPresentation;
    },

    // Check if presentation duration exceeds limit
    exceedsDurationLimit: (durationMinutes: number) => {
      return durationMinutes > subscription.features.maxPresentationDuration;
    },

    // Check if interview participant count exceeds limit
    exceedsParticipantLimit: (participantCount: number) => {
      return participantCount > subscription.features.interviewParticipants;
    },

    // Get all available export formats
    getExportFormats: () => {
      return subscription.features.exportFormats;
    },

    // Get subscription tier info
    getTierInfo: () => {
      return subscription;
    },

    // Get remaining slides (if limit applies)
    getRemainingSlides: (currentSlideCount: number) => {
      const limit = subscription.features.maxSlidesPerPresentation;
      return Math.max(0, limit - currentSlideCount);
    },

    // Check if AI features are available
    hasAIFeatures: () => {
      return subscription.features.aiQuestionGeneration;
    },
  };
}

// Export default tier
export const DEFAULT_SUBSCRIPTION_TIER: SubscriptionTier["level"] = "basic";
