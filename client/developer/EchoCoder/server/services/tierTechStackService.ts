import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",
);

interface DialogUnderstanding {
  coreIdea: string;
  targetUsers: string;
  mainProblem: string;
  keyFeatures: string[];
  dataEntities: string[];
  integrations: string[];
  constraints: string[];
  complexity: "simple" | "moderate" | "complex";
  completenessScore: number;
}

interface TechStackRecommendation {
  database: { name: string; rationale: string };
  backend: { name: string; rationale: string };
  frontend: { name: string; rationale: string };
  overall: {
    complexity: string;
    timeToMarket: string;
    scalability: string;
    maintenanceLevel: string;
    costEstimate: string;
  };
}

interface TierFeatureMapping {
  tier: "starter" | "professional" | "enterprise";
  recommendedForComplexity: string[];
  includedFeatures: string[];
  techStackAlignment: {
    database: string[];
    backend: string[];
    frontend: string[];
  };
  scalingCapabilities: string[];
  estimatedMonthlyUsers: string;
  dataStorageLimit: string;
  supportLevel: string;
}

/**
 * Map tech stack recommendations to LUCCCA tier capabilities
 */
export const tierTechStackMappings: Record<string, TierFeatureMapping> = {
  starter: {
    tier: "starter",
    recommendedForComplexity: ["simple"],
    includedFeatures: [
      "tier1_batch_operations",
      "tier1_seo_generator",
      "tier1_analytics",
      "tier1_asset_management",
      "tier1_content_relations",
    ],
    techStackAlignment: {
      database: ["SQLite", "PostgreSQL (shared)"],
      backend: ["Node.js/Express", "Python/Flask"],
      frontend: ["React", "Vue.js"],
    },
    scalingCapabilities: ["Single server", "Basic caching"],
    estimatedMonthlyUsers: "Up to 10,000",
    dataStorageLimit: "10 GB",
    supportLevel: "Community",
  },
  professional: {
    tier: "professional",
    recommendedForComplexity: ["simple", "moderate"],
    includedFeatures: [
      "tier1_batch_operations",
      "tier1_seo_generator",
      "tier1_analytics",
      "tier1_asset_management",
      "tier1_content_relations",
      "tier2_workspaces",
      "tier2_roles",
      "tier2_feature_flags",
      "tier2_webhooks",
      "tier2_graphql",
      "tier3_logging",
      "tier3_compliance",
    ],
    techStackAlignment: {
      database: ["PostgreSQL (dedicated)", "MongoDB"],
      backend: ["Node.js/Express", "Go", "Python/Django"],
      frontend: ["React", "Vue.js", "Next.js"],
    },
    scalingCapabilities: [
      "Multi-server",
      "Redis caching",
      "CDN ready",
      "Load balancing",
    ],
    estimatedMonthlyUsers: "10,000 - 1,000,000",
    dataStorageLimit: "100 GB",
    supportLevel: "Email support",
  },
  enterprise: {
    tier: "enterprise",
    recommendedForComplexity: ["simple", "moderate", "complex"],
    includedFeatures: [
      "tier1_batch_operations",
      "tier1_seo_generator",
      "tier1_analytics",
      "tier1_asset_management",
      "tier1_content_relations",
      "tier2_workspaces",
      "tier2_roles",
      "tier2_feature_flags",
      "tier2_webhooks",
      "tier2_graphql",
      "tier3_logging",
      "tier3_compliance",
      "tier3_ip_whitelist",
      "tier3_sso_saml",
      "tier3_2fa",
      "tier4_ab_testing",
      "tier4_targeting",
      "tier4_image_optimization",
      "tier4_predictive_analytics",
    ],
    techStackAlignment: {
      database: [
        "PostgreSQL (multi-node)",
        "MongoDB Atlas",
        "Google Firestore",
      ],
      backend: [
        "Node.js/Express",
        "Go",
        "Rust",
        "Java/Spring",
        "Python/Django",
      ],
      frontend: ["React", "Vue.js", "Next.js", "Svelte"],
    },
    scalingCapabilities: [
      "Global distribution",
      "Auto-scaling",
      "Advanced caching",
      "DDoS protection",
      "High availability",
    ],
    estimatedMonthlyUsers: "1,000,000+",
    dataStorageLimit: "1 TB+",
    supportLevel: "24/7 phone + dedicated account manager",
  },
};

/**
 * Recommend LUCCCA tier based on project understanding
 */
export async function recommendTierForProject(
  understanding: DialogUnderstanding,
): Promise<{
  recommendedTier: string;
  rationale: string;
  alternativeTiers: string[];
  mapping: TierFeatureMapping;
}> {
  const { complexity, dataEntities, keyFeatures, constraints } = understanding;

  let recommendedTier = "starter";
  let rationale = "";

  // Determine tier based on complexity
  if (complexity === "simple") {
    recommendedTier = "starter";
    rationale =
      "Simple project with basic requirements. Starter tier provides all needed features.";
  } else if (complexity === "moderate") {
    recommendedTier = "professional";
    rationale =
      "Moderate complexity project. Professional tier includes team collaboration and advanced analytics.";
  } else {
    recommendedTier = "enterprise";
    rationale =
      "Complex project with advanced requirements. Enterprise tier provides full feature set and high availability.";
  }

  // Adjust based on constraints
  if (constraints.includes("high scalability") || dataEntities.length > 20) {
    recommendedTier = "enterprise";
    rationale =
      "High scalability requirements detected. Enterprise tier supports global distribution.";
  }

  if (constraints.includes("compliance") || constraints.includes("security")) {
    if (recommendedTier === "starter") {
      recommendedTier = "professional";
    }
    rationale =
      "Compliance/security requirements detected. Upgrading to " +
      recommendedTier +
      " tier.";
  }

  const mapping =
    tierTechStackMappings[
      recommendedTier as keyof typeof tierTechStackMappings
    ];

  return {
    recommendedTier,
    rationale,
    alternativeTiers: ["starter", "professional", "enterprise"].filter(
      (t) => t !== recommendedTier,
    ),
    mapping,
  };
}

/**
 * Get tech stack recommendations aligned with tier
 */
export async function getTechStackForTier(
  tier: string,
  understanding?: DialogUnderstanding,
): Promise<{
  tier: string;
  alignedTechStack: {
    databaseOptions: string[];
    backendOptions: string[];
    frontendOptions: string[];
  };
  recommendedArchitecture: string;
  scalingStrategy: string[];
}> {
  const mapping =
    tierTechStackMappings[tier as keyof typeof tierTechStackMappings];

  if (!mapping) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  let recommendedArchitecture = "";
  if (tier === "starter") {
    recommendedArchitecture = "Simple monolithic application on single server";
  } else if (tier === "professional") {
    recommendedArchitecture =
      "Microservices-ready architecture with API gateway and service mesh";
  } else {
    recommendedArchitecture =
      "Distributed systems with event-driven architecture, API gateway, and message queues";
  }

  return {
    tier,
    alignedTechStack: {
      databaseOptions: mapping.techStackAlignment.database,
      backendOptions: mapping.techStackAlignment.backend,
      frontendOptions: mapping.techStackAlignment.frontend,
    },
    recommendedArchitecture,
    scalingStrategy: mapping.scalingCapabilities,
  };
}

/**
 * Enable features for tier based on tech stack choice
 */
export async function configureFeaturesByTechStack(
  orgId: string,
  tier: string,
  techStack: {
    database: string;
    backend: string;
    frontend: string;
  },
): Promise<{
  success: boolean;
  enabledFeatures: string[];
  message: string;
}> {
  const mapping =
    tierTechStackMappings[tier as keyof typeof tierTechStackMappings];

  if (!mapping) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  // Validate tech stack choices
  if (
    !mapping.techStackAlignment.database.some((db) =>
      techStack.database.toLowerCase().includes(db.toLowerCase()),
    )
  ) {
    throw new Error(
      `Database ${techStack.database} not recommended for ${tier} tier. Choose from: ${mapping.techStackAlignment.database.join(", ")}`,
    );
  }

  // Enable all features for this tier
  const enabledFeatures = [];

  for (const feature of mapping.includedFeatures) {
    const featureName = feature.replace("tier[1-4]_", "");

    // Insert or update feature flag for organization
    const { data, error } = await supabase
      .from("organization_features")
      .upsert({
        org_id: orgId,
        feature_name: feature,
        enabled: true,
        tech_stack_config: {
          database: techStack.database,
          backend: techStack.backend,
          frontend: techStack.frontend,
        },
        configured_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      enabledFeatures.push(feature);
    }
  }

  return {
    success: enabledFeatures.length > 0,
    enabledFeatures,
    message: `Configured ${enabledFeatures.length} features for ${tier} tier with ${techStack.database} database`,
  };
}

/**
 * Get feature recommendations based on selected tech stack
 */
export async function getFeatureRecommendations(
  tier: string,
  techStack: {
    database: string;
    backend: string;
    frontend: string;
  },
): Promise<{
  essentialFeatures: string[];
  recommendedAddons: string[];
  optimizationSuggestions: string[];
}> {
  const mapping =
    tierTechStackMappings[tier as keyof typeof tierTechStackMappings];

  if (!mapping) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  const essentialFeatures = mapping.includedFeatures;
  const recommendedAddons: string[] = [];
  const optimizationSuggestions: string[] = [];

  // Provide optimization suggestions based on tech stack
  if (techStack.database.includes("MongoDB")) {
    optimizationSuggestions.push(
      "Use mongoose for object modeling",
      "Implement proper indexing on frequently queried fields",
      "Consider sharding for large datasets",
    );
  }

  if (techStack.backend.includes("Go")) {
    optimizationSuggestions.push(
      "Use goroutines for concurrent request handling",
      "Implement proper error handling patterns",
      "Consider using gRPC for inter-service communication",
    );
  }

  if (techStack.frontend.includes("Next.js")) {
    recommendedAddons.push(
      "Static site generation",
      "API routes",
      "Image optimization",
    );
    optimizationSuggestions.push(
      "Leverage ISR (Incremental Static Regeneration)",
      "Use dynamic imports for code splitting",
      "Implement proper cache headers",
    );
  }

  // Add tier-specific recommendations
  if (tier === "enterprise") {
    recommendedAddons.push(
      "GraphQL federation",
      "Event streaming",
      "Advanced monitoring",
      "Performance analytics",
    );
    optimizationSuggestions.push(
      "Implement circuit breakers for resilience",
      "Use distributed tracing",
      "Set up performance budgets",
    );
  }

  return {
    essentialFeatures,
    recommendedAddons,
    optimizationSuggestions,
  };
}

export default {
  recommendTierForProject,
  getTechStackForTier,
  configureFeaturesByTechStack,
  getFeatureRecommendations,
  tierTechStackMappings,
};
