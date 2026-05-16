import express, { Router, Request, Response } from "express";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
  AuthenticatedRequest,
} from "../middleware/supabaseAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import { featureGate } from "../middleware/featureGate";
import { tier2Limiter } from "../middleware/rateLimit";
import tierTechStackService from "../services/tierTechStackService";

const router: Router = express.Router();

/**
 * POST /api/tier-techstack/recommend
 * Get tier and tech stack recommendations based on project understanding
 */
router.post(
  "/recommend",
  verifySupabaseAuth,
  verifyOrganizationAccess,
  tier2Limiter,
  featureGate("tier2_workspaces"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const understanding = req.body;

    if (!understanding.coreIdea) {
      throwAppError("Core idea is required", 400);
    }

    // Get tier recommendation
    const tierRecommendation =
      await tierTechStackService.recommendTierForProject(understanding);

    // Get tech stack options for recommended tier
    const techStackForTier = await tierTechStackService.getTechStackForTier(
      tierRecommendation.recommendedTier,
      understanding,
    );

    return res.status(200).json({
      success: true,
      data: {
        tierRecommendation,
        techStackForTier,
        mapping: tierRecommendation.mapping,
      },
      message: "Tier and tech stack recommendations generated",
    });
  }),
);

/**
 * POST /api/tier-techstack/configure
 * Configure tier and enable features based on tech stack selection
 */
router.post(
  "/configure",
  verifySupabaseAuth,
  verifyOrganizationAccess,
  tier2Limiter,
  featureGate("tier2_workspaces"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;
    const { tier, techStack } = req.body;

    if (!orgId || !tier || !techStack) {
      throwAppError("Organization ID, tier, and tech stack are required", 400);
    }

    // Validate tier
    const validTiers = ["starter", "professional", "enterprise"];
    if (!validTiers.includes(tier)) {
      throwAppError(
        "Invalid tier. Must be one of: starter, professional, enterprise",
        400,
      );
    }

    // Configure features for tier and tech stack
    const configResult =
      await tierTechStackService.configureFeaturesByTechStack(
        orgId,
        tier,
        techStack,
      );

    // Get feature recommendations
    const recommendations =
      await tierTechStackService.getFeatureRecommendations(tier, techStack);

    return res.status(200).json({
      success: true,
      data: {
        configuration: configResult,
        recommendations,
        tier,
        techStack,
      },
      message: `${tier} tier configured with ${Object.values(techStack).join(", ")} tech stack`,
    });
  }),
);

/**
 * GET /api/tier-techstack/features/:tier
 * Get available features for a specific tier
 */
router.get(
  "/features/:tier",
  asyncHandler(async (req: Request, res: Response) => {
    const { tier } = req.params;

    const mapping =
      tierTechStackService.tierTechStackMappings[
        tier as keyof typeof tierTechStackService.tierTechStackMappings
      ];

    if (!mapping) {
      throwAppError(
        "Invalid tier. Must be one of: starter, professional, enterprise",
        400,
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        tier,
        features: mapping.includedFeatures,
        techStackAlignment: mapping.techStackAlignment,
        scalingCapabilities: mapping.scalingCapabilities,
        estimatedMonthlyUsers: mapping.estimatedMonthlyUsers,
        dataStorageLimit: mapping.dataStorageLimit,
        supportLevel: mapping.supportLevel,
      },
      message: `Features for ${tier} tier retrieved`,
    });
  }),
);

/**
 * POST /api/tier-techstack/compare
 * Compare tier options and their capabilities
 */
router.post(
  "/compare",
  asyncHandler(async (req: Request, res: Response) => {
    const { tiers = ["starter", "professional", "enterprise"] } = req.body;

    const comparisons = tiers.map((tier: string) => {
      const mapping =
        tierTechStackService.tierTechStackMappings[
          tier as keyof typeof tierTechStackService.tierTechStackMappings
        ];

      if (!mapping) return null;

      return {
        tier,
        features: mapping.includedFeatures.length,
        estimatedUsers: mapping.estimatedMonthlyUsers,
        storageLimit: mapping.dataStorageLimit,
        supportLevel: mapping.supportLevel,
        scalingCapabilities: mapping.scalingCapabilities.length,
      };
    });

    return res.status(200).json({
      success: true,
      data: comparisons.filter((c) => c !== null),
      message: "Tier comparison data retrieved",
    });
  }),
);

/**
 * GET /api/tier-techstack/architecture/:tier
 * Get recommended architecture for a tier
 */
router.get(
  "/architecture/:tier",
  asyncHandler(async (req: Request, res: Response) => {
    const { tier } = req.params;

    const techStackInfo = await tierTechStackService.getTechStackForTier(tier);

    return res.status(200).json({
      success: true,
      data: {
        tier,
        recommendedArchitecture: techStackInfo.recommendedArchitecture,
        techStackOptions: techStackInfo.alignedTechStack,
        scalingStrategy: techStackInfo.scalingStrategy,
      },
      message: `Architecture recommendation for ${tier} tier`,
    });
  }),
);

export default router;
