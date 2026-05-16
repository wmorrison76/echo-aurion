/**
 * Kitchen Library Content Management System
 * Provides content management, search, and organization for culinary knowledge
 * 
 * Features:
 * - Content management system
 * - Content library population
 * - Content search (semantic + keyword)
 * - Content organization (tags, categories)
 * - Content versioning
 */

import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Kitchen Library Content Types
 */
export interface LibraryContent {
  id: string;
  orgId?: string; // NULL for system-wide content
  title: string;
  description?: string;
  category: string; // e.g., "technique", "ingredient", "recipe", "tool", "history"
  type: "article" | "video" | "image" | "recipe" | "technique" | "reference";
  content: string; // Markdown or HTML content
  tags: string[];
  author?: string;
  source?: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert" | "master";
  masteryLevel: 1 | 2 | 3 | 4 | 5; // 1=fundamental, 5=master
  relatedContentIds: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  views: number;
  rating?: number; // 0-5
  createdAt: string;
  updatedAt: string;
}

export interface ContentSearchResult {
  content: LibraryContent;
  relevanceScore: number; // 0-1
  matchType: "title" | "description" | "content" | "tag" | "semantic";
  matchedTerms: string[];
}

export interface ContentLibrary {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  category: string;
  contentCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Kitchen Library Content Management Service
 */
export class KitchenLibraryCMS {
  /**
   * Create or update content
   */
  async upsertContent(
    content: Omit<LibraryContent, "id" | "views" | "createdAt" | "updatedAt">,
  ): Promise<LibraryContent> {
    try {
      const { data, error } = await supabase
        .from("kitchen_library_content")
        .upsert(
          {
            org_id: content.orgId || null,
            title: content.title,
            description: content.description || null,
            category: content.category,
            type: content.type,
            content: content.content,
            tags: content.tags || [],
            author: content.author || null,
            source: content.source || null,
            difficulty: content.difficulty,
            mastery_level: content.masteryLevel,
            related_content_ids: content.relatedContentIds || [],
            metadata: content.metadata || null,
            is_active: content.isActive,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "title,org_id,category",
          },
        )
        .select()
        .single();

      if (error) throw error;

      logger.info("[KitchenLibraryCMS] Content upserted", {
        contentId: data.id,
        title: content.title,
      });

      return this.mapToContent(data);
    } catch (error) {
      logger.error("[KitchenLibraryCMS] Failed to upsert content", { error, content });
      throw error;
    }
  }

  /**
   * Search content (keyword + semantic)
   */
  async searchContent(
    query: string,
    orgId?: string,
    filters?: {
      category?: string;
      type?: LibraryContent["type"];
      difficulty?: LibraryContent["difficulty"];
      tags?: string[];
      masteryLevel?: number;
    },
    limit: number = 20,
  ): Promise<ContentSearchResult[]> {
    try {
      logger.info("[KitchenLibraryCMS] Searching content", { query, orgId, filters });

      // Build base query
      let searchQuery = supabase
        .from("kitchen_library_content")
        .select("*")
        .eq("is_active", true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`);

      // Filter by org (system-wide or org-specific)
      if (orgId) {
        searchQuery = searchQuery.or(`org_id.eq.${orgId},org_id.is.null`);
      } else {
        searchQuery = searchQuery.is("org_id", null);
      }

      // Apply filters
      if (filters?.category) {
        searchQuery = searchQuery.eq("category", filters.category);
      }
      if (filters?.type) {
        searchQuery = searchQuery.eq("type", filters.type);
      }
      if (filters?.difficulty) {
        searchQuery = searchQuery.eq("difficulty", filters.difficulty);
      }
      if (filters?.masteryLevel) {
        searchQuery = searchQuery.eq("mastery_level", filters.masteryLevel);
      }
      if (filters?.tags && filters.tags.length > 0) {
        searchQuery = searchQuery.contains("tags", filters.tags);
      }

      const { data, error } = await searchQuery.limit(limit);

      if (error) throw error;

      // Calculate relevance scores
      const results: ContentSearchResult[] = (data || []).map((item: any) => {
        const content = this.mapToContent(item);
        const relevance = this.calculateRelevance(query, content);
        return {
          content,
          relevanceScore: relevance.score,
          matchType: relevance.matchType,
          matchedTerms: relevance.matchedTerms,
        };
      });

      // Sort by relevance
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      logger.info("[KitchenLibraryCMS] Search complete", {
        query,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error("[KitchenLibraryCMS] Search failed", { error, query });
      return [];
    }
  }

  /**
   * Calculate relevance score for search result
   */
  private calculateRelevance(
    query: string,
    content: LibraryContent,
  ): { score: number; matchType: ContentSearchResult["matchType"]; matchedTerms: string[] } {
    const queryTerms = query.toLowerCase().split(/\s+/);
    let score = 0;
    const matchedTerms: string[] = [];
    let matchType: ContentSearchResult["matchType"] = "content";

    // Title match (highest weight)
    const titleLower = content.title.toLowerCase();
    if (titleLower.includes(query.toLowerCase())) {
      score += 0.5;
      matchType = "title";
      matchedTerms.push(...queryTerms.filter((term) => titleLower.includes(term)));
    } else {
      // Partial title match
      const titleMatches = queryTerms.filter((term) => titleLower.includes(term)).length;
      if (titleMatches > 0) {
        score += 0.3 * (titleMatches / queryTerms.length);
        matchType = "title";
        matchedTerms.push(...queryTerms.filter((term) => titleLower.includes(term)));
      }
    }

    // Description match (medium weight)
    if (content.description) {
      const descLower = content.description.toLowerCase();
      const descMatches = queryTerms.filter((term) => descLower.includes(term)).length;
      if (descMatches > 0) {
        score += 0.3 * (descMatches / queryTerms.length);
        if (matchType === "content") matchType = "description";
        matchedTerms.push(...queryTerms.filter((term) => descLower.includes(term)));
      }
    }

    // Tag match (medium weight)
    const tagMatches = content.tags.filter((tag) =>
      queryTerms.some((term) => tag.toLowerCase().includes(term)),
    ).length;
    if (tagMatches > 0) {
      score += 0.2 * (tagMatches / content.tags.length);
      if (matchType === "content") matchType = "tag";
      matchedTerms.push(...content.tags.filter((tag) => queryTerms.some((term) => tag.toLowerCase().includes(term))));
    }

    // Content match (lower weight)
    const contentLower = content.content.toLowerCase();
    const contentMatches = queryTerms.filter((term) => contentLower.includes(term)).length;
    if (contentMatches > 0) {
      score += 0.1 * (contentMatches / queryTerms.length);
      if (matchType === "content") matchType = "content";
      matchedTerms.push(...queryTerms.filter((term) => contentLower.includes(term)));
    }

    // Normalize to 0-1
    score = Math.min(1, score);

    return { score, matchType, matchedTerms: [...new Set(matchedTerms)] };
  }

  /**
   * Get content by ID
   */
  async getContent(contentId: string, orgId?: string): Promise<LibraryContent | null> {
    try {
      let query = supabase.from("kitchen_library_content").select("*").eq("id", contentId).eq("is_active", true);

      if (orgId) {
        query = query.or(`org_id.eq.${orgId},org_id.is.null`);
      } else {
        query = query.is("org_id", null);
      }

      const { data, error } = await query.single();

      if (error || !data) return null;

      // Increment views
      await supabase
        .from("kitchen_library_content")
        .update({ views: (data.views || 0) + 1 })
        .eq("id", contentId);

      return this.mapToContent({ ...data, views: (data.views || 0) + 1 });
    } catch (error) {
      logger.error("[KitchenLibraryCMS] Failed to get content", { error, contentId });
      return null;
    }
  }

  /**
   * List content by category
   */
  async listContent(
    category?: string,
    orgId?: string,
    limit: number = 50,
  ): Promise<LibraryContent[]> {
    try {
      let query = supabase.from("kitchen_library_content").select("*").eq("is_active", true);

      if (category) {
        query = query.eq("category", category);
      }

      if (orgId) {
        query = query.or(`org_id.eq.${orgId},org_id.is.null`);
      } else {
        query = query.is("org_id", null);
      }

      const { data, error } = await query.order("views", { ascending: false }).limit(limit);

      if (error) throw error;

      return (data || []).map((item: any) => this.mapToContent(item));
    } catch (error) {
      logger.error("[KitchenLibraryCMS] Failed to list content", { error, category });
      return [];
    }
  }

  /**
   * Populate library with comprehensive default content
   */
  async populateDefaultContent(orgId?: string): Promise<number> {
    try {
      const defaultContent: Array<Omit<LibraryContent, "id" | "views" | "createdAt" | "updatedAt">> = [
        // ===== TECHNIQUES (Fundamental) =====
        {
          orgId,
          title: "Knife Skills: Basic Cuts",
          description: "Fundamental knife cutting techniques for professional kitchens",
          category: "technique",
          type: "technique",
          content: "Master the basic knife cuts: julienne, brunoise, dice, chiffonade, and more. Proper knife skills are fundamental to professional cooking. Includes: brunoise (1/8 inch cubes), julienne (matchstick), batonnet (1/4 inch sticks), dice (small, medium, large), chiffonade (ribbon cuts for herbs).",
          tags: ["knife-skills", "cutting", "fundamentals", "technique", "professional"],
          author: "CIA Culinary Institute",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Mise en Place",
          description: "French culinary technique for organizing and preparing ingredients before cooking",
          category: "technique",
          type: "technique",
          content: "Mise en place (French for 'put in place') is a fundamental professional cooking technique. It involves gathering and preparing all ingredients, tools, and equipment needed before starting to cook. This systematic approach ensures efficiency, safety, and quality in the kitchen.",
          tags: ["mise-en-place", "organization", "fundamentals", "technique", "professional"],
          author: "Escoffier",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Sauté Technique",
          description: "Quick cooking method using high heat and minimal fat",
          category: "technique",
          type: "technique",
          content: "Sautéing is a cooking method that uses a relatively small amount of oil or fat in a shallow pan over relatively high heat. Ingredients are usually cut into pieces or thinly sliced to facilitate fast cooking. The word comes from the French verb 'sauter', meaning 'to jump'.",
          tags: ["sauté", "cooking-method", "high-heat", "fundamentals"],
          author: "Larousse Gastronomique",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Sous Vide Cooking",
          description: "Precision temperature cooking technique for consistent results",
          category: "technique",
          type: "technique",
          content: "Sous vide (French for 'under vacuum') is a method of cooking in which food is placed in a plastic pouch or a glass jar and cooked in a water bath for longer than usual cooking times (usually 1 to 7 hours, up to 48 or more in some cases) at an precisely regulated temperature. This technique provides precise temperature control and consistent results.",
          tags: ["sous-vide", "precision", "temperature", "consistency", "modernist"],
          author: "Modernist Cuisine",
          difficulty: "intermediate",
          masteryLevel: 3,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Stock Making Fundamentals",
          description: "Classical technique for creating flavorful foundations",
          category: "technique",
          type: "technique",
          content: "Stock is a flavorful liquid made by simmering bones, vegetables, and aromatics in water. The five mother stocks are: white stock (veal or chicken), brown stock (roasted veal or beef bones), fish stock (fish bones and heads), vegetable stock, and dashi (Japanese seaweed and bonito). Proper stock is the foundation of classical French cuisine.",
          tags: ["stock", "mother-stocks", "foundations", "classical", "french"],
          author: "Escoffier",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Mother Sauces: The Five Fundamentals",
          description: "The five classic French mother sauces that form the basis of sauce-making",
          category: "technique",
          type: "technique",
          content: "The five mother sauces of classical French cuisine are: 1) Béchamel (white sauce with milk), 2) Velouté (velvety sauce with white stock), 3) Espagnole (brown sauce), 4) Tomato sauce, and 5) Hollandaise (emulsified butter sauce). All other sauces are derived from these five fundamentals.",
          tags: ["mother-sauces", "sauces", "classical", "french", "fundamentals"],
          author: "Auguste Escoffier",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Emulsion Techniques",
          description: "Mastering stable emulsions in sauces and dressings",
          category: "technique",
          type: "technique",
          content: "Emulsions are mixtures of two immiscible liquids (typically oil and water). Common culinary emulsions include hollandaise, mayonnaise, vinaigrette, and butter sauces. Techniques for stable emulsions include proper temperature control, gradual addition, and continuous whisking.",
          tags: ["emulsion", "sauces", "hollandaise", "mayonnaise", "chemistry"],
          author: "On Food and Cooking",
          difficulty: "intermediate",
          masteryLevel: 3,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Braising and Stewing",
          description: "Moist-heat cooking methods for tough cuts of meat",
          category: "technique",
          type: "technique",
          content: "Braising and stewing are moist-heat cooking methods that use both wet and dry heat. Braising typically involves searing meat and then cooking it in a covered pot with liquid at low heat. Stewing involves completely submerging ingredients in liquid. Both methods break down tough connective tissues and develop deep flavors.",
          tags: ["braising", "stewing", "moist-heat", "meat", "slow-cooking"],
          author: "CIA",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Molecular Gastronomy: Spherification",
          description: "Creating liquid-filled spheres using sodium alginate",
          category: "technique",
          type: "technique",
          content: "Spherification is a modern culinary technique that creates liquid-filled spheres. Basic spherification uses sodium alginate and calcium chloride. Reverse spherification uses calcium alginate in the flavored liquid. This technique is used for creating 'caviar' and 'ravioli' effects.",
          tags: ["molecular-gastronomy", "spherification", "modernist", "advanced"],
          author: "Ferran Adrià",
          difficulty: "advanced",
          masteryLevel: 4,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Fermentation Fundamentals",
          description: "Understanding the science and practice of fermentation in cooking",
          category: "technique",
          type: "technique",
          content: "Fermentation is the process of using microorganisms to transform food. Key techniques include: lacto-fermentation (sauerkraut, pickles), alcohol fermentation (bread, beer, wine), acetic acid fermentation (vinegar), and koji fermentation (soy sauce, miso). Proper temperature and salt concentration are critical.",
          tags: ["fermentation", "preservation", "science", "flavor-development"],
          author: "The Art of Fermentation",
          difficulty: "advanced",
          masteryLevel: 4,
          relatedContentIds: [],
          isActive: true,
        },

        // ===== INGREDIENTS =====
        {
          orgId,
          title: "Salt: Types and Uses",
          description: "Comprehensive guide to different types of salt and their culinary applications",
          category: "ingredient",
          type: "article",
          content: "Learn about different types of salt: table salt, kosher salt, sea salt, fleur de sel, Himalayan pink salt, black salt, and their best uses in cooking. Kosher salt is preferred by chefs for its clean flavor and texture. Sea salts add mineral complexity. Fleur de sel is a finishing salt.",
          tags: ["salt", "seasoning", "ingredient", "fundamentals"],
          author: "Harold McGee",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Umami: The Fifth Taste",
          description: "Understanding umami and umami-rich ingredients",
          category: "ingredient",
          type: "article",
          content: "Umami (Japanese for 'pleasant savory taste') is the fifth basic taste, alongside sweet, sour, salty, and bitter. Umami-rich ingredients include: Parmesan cheese, tomatoes, mushrooms, soy sauce, anchovies, seaweed, cured meats, and fermented foods. MSG is pure umami.",
          tags: ["umami", "taste", "flavor", "ingredient", "science"],
          author: "Kikunae Ikeda",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Oils and Fats: A Complete Guide",
          description: "Understanding different cooking oils and their smoke points",
          category: "ingredient",
          type: "article",
          content: "Different oils have different smoke points and flavor profiles. High-heat oils: avocado oil (520°F), refined safflower (510°F), refined sunflower (450°F). Medium-heat: olive oil (375-410°F), canola (400°F). Low-heat: extra virgin olive oil (325-375°F), butter (350°F). Choose the right oil for the cooking method.",
          tags: ["oils", "fats", "smoke-point", "cooking", "ingredient"],
          author: "On Food and Cooking",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Flavor Profiles of Herbs",
          description: "Guide to using fresh and dried herbs in cooking",
          category: "ingredient",
          type: "article",
          content: "Herbs fall into families: Mediterranean (rosemary, thyme, oregano, sage), anise-flavored (tarragon, fennel), mint family (basil, mint, marjoram), alliums (chives, garlic), and parsley family (cilantro, parsley, dill). Fresh vs dried: use fresh for delicate herbs (basil, cilantro), dried for robust herbs (oregano, thyme).",
          tags: ["herbs", "flavor", "seasoning", "ingredient"],
          author: "The Flavor Bible",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },

        // ===== TOOLS & EQUIPMENT =====
        {
          orgId,
          title: "Thermometer Guide",
          description: "How to use and calibrate kitchen thermometers for accurate temperature readings",
          category: "tool",
          type: "reference",
          content: "Kitchen thermometers are essential for food safety and precision cooking. Types: instant-read (fast, accurate), probe (continuous monitoring), infrared (non-contact), candy/deep-fry (high temperature). Calibration methods: ice water (32°F/0°C) and boiling water (212°F/100°C at sea level).",
          tags: ["thermometer", "temperature", "food-safety", "tool"],
          author: "ServSafe",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Kitchen Scale: Precision Weighing",
          description: "Why and how to use a kitchen scale for accurate measurements",
          category: "tool",
          type: "reference",
          content: "Professional kitchens use weight measurements (grams/ounces) rather than volume (cups/spoons) for accuracy and consistency. A digital kitchen scale is essential for baking and precision cooking. Look for scales with 0.1g precision and 5kg+ capacity.",
          tags: ["scale", "weighing", "precision", "baking", "tool"],
          author: "Professional Baking",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },

        // ===== FOOD SCIENCE =====
        {
          orgId,
          title: "The Maillard Reaction",
          description: "Understanding the science behind browning and flavor development",
          category: "science",
          type: "article",
          content: "The Maillard reaction is a chemical reaction between amino acids and reducing sugars that gives browned food its distinctive flavor. It occurs at temperatures between 280-330°F (140-165°C). This reaction is responsible for the flavors in seared meats, roasted coffee, toasted bread, and baked goods.",
          tags: ["maillard-reaction", "browning", "flavor", "science", "chemistry"],
          author: "Harold McGee",
          difficulty: "intermediate",
          masteryLevel: 3,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Protein Coagulation Temperatures",
          description: "Critical temperatures for cooking proteins",
          category: "science",
          type: "reference",
          content: "Proteins coagulate at specific temperatures: eggs (144-149°F), fish (120-140°F), chicken (165°F internal), beef (130°F rare, 145°F medium, 160°F well), pork (145°F). Understanding these temperatures is crucial for perfect cooking.",
          tags: ["protein", "temperature", "coagulation", "science", "food-safety"],
          author: "On Food and Cooking",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Caramelization vs Maillard",
          description: "Understanding the difference between these two browning reactions",
          category: "science",
          type: "article",
          content: "Caramelization is the oxidation of sugar at high temperatures (320°F+) producing caramel flavors. Maillard reaction is proteins and sugars reacting at lower temperatures (280-330°F) producing complex savory flavors. Both create browning but through different chemical processes.",
          tags: ["caramelization", "maillard-reaction", "browning", "science"],
          author: "Harold McGee",
          difficulty: "intermediate",
          masteryLevel: 3,
          relatedContentIds: [],
          isActive: true,
        },

        // ===== CUISINES =====
        {
          orgId,
          title: "French Cuisine: Classical Foundations",
          description: "The evolution of French culinary traditions from medieval to modern times",
          category: "cuisine",
          type: "article",
          content: "French cuisine has had a profound influence on Western culinary traditions. Key periods: Medieval (grand banquets), Renaissance (refined techniques), Classical (Carême, Escoffier), Nouvelle Cuisine (1970s-80s, lighter, fresher), Modern (technique-driven, ingredient-focused). The brigade system and mother sauces are fundamental.",
          tags: ["french-cuisine", "history", "culture", "culinary-traditions", "classical"],
          author: "Larousse Gastronomique",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Japanese Culinary Philosophy: Washoku",
          description: "Principles of Japanese cuisine and seasonal eating",
          category: "cuisine",
          type: "article",
          content: "Washoku (和食) is the traditional dietary culture of Japan, emphasizing seasonality, balance, and presentation. Five principles: five colors (goshiki), five tastes (gomi), five cooking methods (goho), seasonal ingredients (shun), and five senses. Respect for ingredients and minimal intervention.",
          tags: ["japanese-cuisine", "washoku", "seasonality", "philosophy", "culture"],
          author: "Traditional Japanese Cooking",
          difficulty: "advanced",
          masteryLevel: 4,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Italian Regional Cooking",
          description: "Understanding the diversity of Italian regional cuisines",
          category: "cuisine",
          type: "article",
          content: "Italy's 20 regions each have distinct culinary traditions: Northern (rice, butter, cream), Central (pasta, olive oil, tomatoes), Southern (Mediterranean vegetables, seafood, bold flavors). Regional specialties include: risotto (Lombardy), pesto (Liguria), carbonara (Rome), pizza (Naples), and arancini (Sicily).",
          tags: ["italian-cuisine", "regional", "culture", "diversity"],
          author: "Essentials of Classic Italian Cooking",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },

        // ===== FOOD SAFETY =====
        {
          orgId,
          title: "HACCP Principles",
          description: "Hazard Analysis Critical Control Points for food safety",
          category: "safety",
          type: "reference",
          content: "HACCP is a systematic preventive approach to food safety. Seven principles: 1) Conduct hazard analysis, 2) Identify critical control points, 3) Establish critical limits, 4) Monitor CCPs, 5) Establish corrective actions, 6) Verify procedures, 7) Keep records. Temperature danger zone: 41-135°F (5-57°C).",
          tags: ["haccp", "food-safety", "critical-control-points", "safety"],
          author: "ServSafe",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Temperature Danger Zone",
          description: "Food safety guidelines for temperature control",
          category: "safety",
          type: "reference",
          content: "The temperature danger zone is 41°F to 135°F (5°C to 57°C). Food should not be kept in this range for more than 4 hours total (2 hours in the upper range 70-135°F). Cold food: below 41°F. Hot food: above 135°F. Rapid cooling: from 135°F to 70°F within 2 hours, then to 41°F within 4 more hours.",
          tags: ["temperature", "food-safety", "danger-zone", "safety"],
          author: "FDA Food Code",
          difficulty: "beginner",
          masteryLevel: 1,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Allergen Management",
          description: "Best practices for handling food allergens in the kitchen",
          category: "safety",
          type: "reference",
          content: "The Big 8 allergens: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans. Key practices: separate preparation areas, dedicated equipment, clear labeling, staff training, accurate menu descriptions, and cross-contamination prevention. Always ask customers about allergies.",
          tags: ["allergens", "food-safety", "cross-contamination", "safety"],
          author: "FDA Food Allergen Labeling",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },

        // ===== SERVICE & PRESENTATION =====
        {
          orgId,
          title: "Plating Fundamentals",
          description: "Principles of attractive food presentation",
          category: "presentation",
          type: "article",
          content: "Effective plating principles: height and dimension, odd numbers (rule of threes), color contrast, negative space (white space), sauce placement, garnish purpose. The clock method: proteins at 6 o'clock, starch at 9, vegetables at 3. Consider the customer's viewpoint.",
          tags: ["plating", "presentation", "visual", "service"],
          author: "The Professional Chef",
          difficulty: "intermediate",
          masteryLevel: 2,
          relatedContentIds: [],
          isActive: true,
        },
        {
          orgId,
          title: "Wine Service Standards",
          description: "Professional wine service protocols",
          category: "service",
          type: "reference",
          content: "Professional wine service includes: proper storage (55°F, 70% humidity), decanting (red wines, sediment), temperature service (champagne 45-50°F, white 50-55°F, red 60-65°F), proper glassware, presentation of bottle, opening, tasting protocol, and pour levels (4-6oz for table wine).",
          tags: ["wine", "service", "sommelier", "beverage"],
          author: "Court of Master Sommeliers",
          difficulty: "advanced",
          masteryLevel: 4,
          relatedContentIds: [],
          isActive: true,
        },
      ];

      let createdCount = 0;

      for (const content of defaultContent) {
        try {
          await this.upsertContent(content);
          createdCount++;
        } catch (error) {
          logger.warn("[KitchenLibraryCMS] Failed to create default content", { error, title: content.title });
        }
      }

      logger.info("[KitchenLibraryCMS] Default content populated", {
        orgId,
        createdCount,
        total: defaultContent.length,
      });

      return createdCount;
    } catch (error) {
      logger.error("[KitchenLibraryCMS] Failed to populate default content", { error, orgId });
      return 0;
    }
  }

  /**
   * Map database row to LibraryContent
   */
  private mapToContent(data: any): LibraryContent {
    return {
      id: data.id,
      orgId: data.org_id || undefined,
      title: data.title,
      description: data.description || undefined,
      category: data.category,
      type: data.type,
      content: data.content,
      tags: data.tags || [],
      author: data.author || undefined,
      source: data.source || undefined,
      difficulty: data.difficulty,
      masteryLevel: data.mastery_level,
      relatedContentIds: data.related_content_ids || [],
      metadata: data.metadata || undefined,
      isActive: data.is_active,
      views: data.views || 0,
      rating: data.rating || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get content statistics
   */
  async getContentStatistics(orgId?: string): Promise<{
    totalContent: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    byDifficulty: Record<string, number>;
    averageRating: number;
    totalViews: number;
  }> {
    try {
      let query = supabase.from("kitchen_library_content").select("*").eq("is_active", true);

      if (orgId) {
        query = query.or(`org_id.eq.${orgId},org_id.is.null`);
      } else {
        query = query.is("org_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      const content = (data || []).map((item: any) => this.mapToContent(item));

      const byCategory: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const byDifficulty: Record<string, number> = {};
      let totalRating = 0;
      let ratedCount = 0;
      let totalViews = 0;

      for (const item of content) {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
        byType[item.type] = (byType[item.type] || 0) + 1;
        byDifficulty[item.difficulty] = (byDifficulty[item.difficulty] || 0) + 1;
        totalViews += item.views;
        if (item.rating !== undefined) {
          totalRating += item.rating;
          ratedCount++;
        }
      }

      return {
        totalContent: content.length,
        byCategory,
        byType,
        byDifficulty,
        averageRating: ratedCount > 0 ? totalRating / ratedCount : 0,
        totalViews,
      };
    } catch (error) {
      logger.error("[KitchenLibraryCMS] Failed to get statistics", { error, orgId });
      return {
        totalContent: 0,
        byCategory: {},
        byType: {},
        byDifficulty: {},
        averageRating: 0,
        totalViews: 0,
      };
    }
  }
}

// Export singleton instance
export const kitchenLibraryCMS = new KitchenLibraryCMS();
