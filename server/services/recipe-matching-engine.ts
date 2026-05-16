/**
 * Recipe Matching Engine Service
 * 
 * Enhanced semantic matching for menu items to recipes
 * - Semantic matching ("Pistou" → "Herb Garlic Oil")
 * - Top 3-5 matches display
 * - Chef confirmation below threshold
 * - Learns over time (moderate aggressiveness increases)
 */

import { logger } from '../lib/logger';
import { getSupabaseServiceClient } from '../lib/supabase-service-client';
import { recipeSearchOptimizer } from './recipe-search-optimizer';

export interface MatchedRecipe {
  recipe_id: string;
  recipe_name: string;
  match_score: number; // 0-1, where 1 is exact match
  match_type: 'exact' | 'semantic' | 'synonym' | 'fuzzy';
  confidence: number; // 0-1, confidence in match
  course_type?: string;
  description?: string;
  servings?: number;
  prep_time?: number;
  cook_time?: number;
}

export interface RecipeSelection {
  menu_item_name: string;
  selected_recipe_id: string;
  selected_recipe_name: string;
  match_score: number;
  org_id: string;
  user_id: string;
  created_at: string;
}

class RecipeMatchingEngine {
  // Recipe synonym dictionary (can be expanded/learned)
  private synonymDictionary: Map<string, string[]> = new Map([
    ['pistou', ['herb garlic oil', 'basil oil', 'garlic herb paste', 'pesto']],
    ['pesto', ['pistou', 'herb garlic oil', 'basil sauce']],
    ['rouille', ['garlic saffron mayonnaise', 'spicy aioli']],
    ['aioli', ['garlic mayonnaise', 'garlic aioli']],
    ['beurre blanc', ['white butter sauce', 'butter wine sauce']],
    ['beurre noir', ['black butter', 'browned butter']],
    ['court bouillon', ['poaching liquid', 'broth']],
    ['jus', ['gravy', 'pan sauce', 'drippings']],
    ['veloute', ['velvet sauce', 'white sauce']],
    ['duxelles', ['mushroom paste', 'mushroom duxelles']],
    ['gremolata', ['lemon parsley garlic', 'gremolada']],
    ['mirepoix', ['holy trinity', 'soffritto', 'carrot celery onion']],
    ['sofrito', ['soffritto', 'mirepoix', 'sofregit']],
    ['concasse', ['chopped tomatoes', 'tomato concasse']],
    ['brunoise', ['fine dice', 'tiny cubes']],
    ['julienne', ['matchstick cut', 'thin strips']],
    ['chiffonade', ['ribbon cut', 'thin strips']],
  ]);

  // Learning database (stores chef selections to improve matching)
  private selectionCache: Map<string, RecipeSelection[]> = new Map();

  /**
   * Find recipes for menu item (top 3-5 matches)
   */
  async findRecipesForMenuItem(
    menuItemName: string,
    courseType: string,
    orgId: string,
    outletId?: string,
    chefProfileName?: string,
    limit: number = 5
  ): Promise<MatchedRecipe[]> {
    try {
      logger.info('[RecipeMatchingEngine] Finding recipes for menu item', {
        menuItemName,
        courseType,
        orgId,
        limit,
      });

      // Step 1: Exact match search
      const exactMatches = await this.exactMatch(menuItemName, orgId, outletId, courseType);

      // Step 2: Semantic match search (using recipe search optimizer)
      const semanticMatches = await this.semanticMatch(menuItemName, orgId, outletId, courseType, limit * 2);

      // Step 3: Synonym match search
      const synonymMatches = await this.synonymMatch(menuItemName, orgId, outletId, courseType);

      // Step 4: Combine and deduplicate matches
      const allMatches = this.combineAndDeduplicate(
        exactMatches,
        semanticMatches,
        synonymMatches
      );

      // Step 5: Apply learning (boost recipes that chef has selected before)
      const learnedMatches = await this.applyLearning(menuItemName, allMatches, orgId);

      // Step 6: Sort by match score and return top matches
      const sortedMatches = learnedMatches
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, limit);

      logger.info('[RecipeMatchingEngine] Recipes found', {
        menuItemName,
        matchCount: sortedMatches.length,
        topScore: sortedMatches[0]?.match_score || 0,
      });

      return sortedMatches;
    } catch (error) {
      logger.error('[RecipeMatchingEngine] Error finding recipes', {
        menuItemName,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Exact match search
   */
  private async exactMatch(
    menuItemName: string,
    orgId: string,
    outletId?: string,
    courseType?: string
  ): Promise<MatchedRecipe[]> {
    try {
      const supabase = getSupabaseServiceClient();
      const normalizedName = menuItemName.toLowerCase().trim();

      let query = supabase
        .from('user_recipes')
        .select('id, title, description, servings, course, prep_time, cook_time')
        .eq('organization_id', orgId)
        .ilike('title', normalizedName);

      if (outletId) {
        // Filter by outlet or global recipes
        query = query.or(`outlet_id.is.null,outlet_id.eq.${outletId}`);
      }

      if (courseType) {
        query = query.eq('course', courseType);
      }

      const { data: recipes, error } = await query.limit(10);

      if (error) {
        throw error;
      }

      return (recipes || []).map(recipe => ({
        recipe_id: recipe.id,
        recipe_name: recipe.title,
        match_score: 1.0, // Exact match
        match_type: 'exact' as const,
        confidence: 1.0,
        course_type: recipe.course || courseType,
        description: recipe.description,
        servings: recipe.servings,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
      }));
    } catch (error) {
      logger.warn('[RecipeMatchingEngine] Exact match failed', {
        menuItemName,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Semantic match search (using recipe search optimizer)
   */
  private async semanticMatch(
    menuItemName: string,
    orgId: string,
    outletId?: string,
    courseType?: string,
    limit: number = 10
  ): Promise<MatchedRecipe[]> {
    try {
      // Use recipe search optimizer for semantic search
      const searchResults = await recipeSearchOptimizer.searchRecipes({
        orgId,
        query: menuItemName,
        limit,
        outletId,
        courseType,
      });

      return searchResults.map(result => ({
        recipe_id: result.recipeId,
        recipe_name: result.title || result.recipeId,
        match_score: result.combinedScore || 0.7, // Use combined score from search optimizer
        match_type: 'semantic' as const,
        confidence: result.combinedScore || 0.7,
        course_type: result.courseType || courseType,
        description: result.description,
        servings: result.servings,
        prep_time: result.prepTime,
        cook_time: result.cookTime,
      }));
    } catch (error) {
      logger.warn('[RecipeMatchingEngine] Semantic match failed', {
        menuItemName,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Synonym match search
   */
  private async synonymMatch(
    menuItemName: string,
    orgId: string,
    outletId?: string,
    courseType?: string
  ): Promise<MatchedRecipe[]> {
    try {
      const supabase = getSupabaseServiceClient();
      const normalizedName = menuItemName.toLowerCase().trim();

      // Get synonyms for menu item name
      const synonyms = this.getSynonyms(normalizedName);
      if (synonyms.length === 0) {
        return [];
      }

      // Search for recipes matching synonyms
      const matches: MatchedRecipe[] = [];

      for (const synonym of synonyms) {
        let query = supabase
          .from('user_recipes')
          .select('id, title, description, servings, course, prep_time, cook_time')
          .eq('organization_id', orgId)
          .ilike('title', `%${synonym}%`);

        if (outletId) {
          query = query.or(`outlet_id.is.null,outlet_id.eq.${outletId}`);
        }

        if (courseType) {
          query = query.eq('course', courseType);
        }

        const { data: recipes, error } = await query.limit(5);

        if (error) {
          logger.warn('[RecipeMatchingEngine] Synonym match query failed', {
            synonym,
            error: error.message,
          });
          continue;
        }

        for (const recipe of recipes || []) {
          // Calculate similarity score based on synonym match
          const similarity = this.calculateSynonymSimilarity(normalizedName, synonym, recipe.title);
          
          matches.push({
            recipe_id: recipe.id,
            recipe_name: recipe.title,
            match_score: similarity,
            match_type: 'synonym' as const,
            confidence: 0.75, // Moderate confidence for synonym matches
            course_type: recipe.course || courseType,
            description: recipe.description,
            servings: recipe.servings,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
          });
        }
      }

      return matches;
    } catch (error) {
      logger.warn('[RecipeMatchingEngine] Synonym match failed', {
        menuItemName,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get synonyms for a term
   */
  private getSynonyms(term: string): string[] {
    const normalizedTerm = term.toLowerCase().trim();
    const synonyms: string[] = [];

    // Check synonym dictionary
    for (const [key, values] of this.synonymDictionary.entries()) {
      if (normalizedTerm === key || normalizedTerm.includes(key)) {
        synonyms.push(...values);
      }
      // Also check reverse (if term is a synonym of key)
      if (values.some(v => normalizedTerm === v || normalizedTerm.includes(v))) {
        synonyms.push(key);
        synonyms.push(...values.filter(v => v !== normalizedTerm));
      }
    }

    return [...new Set(synonyms)]; // Deduplicate
  }

  /**
   * Calculate similarity score for synonym match
   */
  private calculateSynonymSimilarity(
    menuItemName: string,
    synonym: string,
    recipeName: string
  ): number {
    const normalizedRecipe = recipeName.toLowerCase();
    const normalizedSynonym = synonym.toLowerCase();

    // If recipe name contains synonym, higher score
    if (normalizedRecipe.includes(normalizedSynonym)) {
      return 0.8;
    }

    // If recipe name starts with synonym, even higher
    if (normalizedRecipe.startsWith(normalizedSynonym)) {
      return 0.9;
    }

    // Partial match
    return 0.7;
  }

  /**
   * Combine and deduplicate matches
   */
  private combineAndDeduplicate(
    exactMatches: MatchedRecipe[],
    semanticMatches: MatchedRecipe[],
    synonymMatches: MatchedRecipe[]
  ): MatchedRecipe[] {
    const recipeMap = new Map<string, MatchedRecipe>();

    // Add exact matches first (highest priority)
    for (const match of exactMatches) {
      recipeMap.set(match.recipe_id, match);
    }

    // Add semantic matches (merge with existing if found)
    for (const match of semanticMatches) {
      const existing = recipeMap.get(match.recipe_id);
      if (existing) {
        // Keep highest match score
        if (match.match_score > existing.match_score) {
          recipeMap.set(match.recipe_id, match);
        }
      } else {
        recipeMap.set(match.recipe_id, match);
      }
    }

    // Add synonym matches (merge with existing if found)
    for (const match of synonymMatches) {
      const existing = recipeMap.get(match.recipe_id);
      if (existing) {
        // Keep highest match score
        if (match.match_score > existing.match_score) {
          recipeMap.set(match.recipe_id, match);
        }
      } else {
        recipeMap.set(match.recipe_id, match);
      }
    }

    return Array.from(recipeMap.values());
  }

  /**
   * Apply learning (boost recipes that chef has selected before)
   */
  private async applyLearning(
    menuItemName: string,
    matches: MatchedRecipe[],
    orgId: string
  ): Promise<MatchedRecipe[]> {
    try {
      // Get historical selections for this menu item
      const selections = await this.getHistoricalSelections(menuItemName, orgId);

      if (selections.length === 0) {
        return matches; // No learning data available
      }

      // Count selections per recipe
      const selectionCounts = new Map<string, number>();
      for (const selection of selections) {
        const count = selectionCounts.get(selection.selected_recipe_id) || 0;
        selectionCounts.set(selection.selected_recipe_id, count + 1);
      }

      // Apply learning boost (moderate aggressiveness)
      const learnedMatches = matches.map(match => {
        const selectionCount = selectionCounts.get(match.recipe_id) || 0;
        
        if (selectionCount > 0) {
          // Boost match score based on selection count (moderate boost: 0.1 * log(count + 1))
          const boost = Math.min(0.2, 0.1 * Math.log(selectionCount + 1));
          return {
            ...match,
            match_score: Math.min(1.0, match.match_score + boost),
            confidence: Math.min(1.0, match.confidence + boost * 0.5),
          };
        }

        return match;
      });

      return learnedMatches;
    } catch (error) {
      logger.warn('[RecipeMatchingEngine] Learning application failed', {
        menuItemName,
        error: error instanceof Error ? error.message : String(error),
      });
      return matches; // Return original matches if learning fails
    }
  }

  /**
   * Record chef selection (learns over time)
   */
  async recordChefSelection(
    menuItemName: string,
    selectedRecipeId: string,
    selectedRecipeName: string,
    matchScore: number,
    orgId: string,
    userId: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      // Store selection in database for learning
      const { error } = await supabase
        .from('recipe_selection_history')
        .insert({
          menu_item_name: menuItemName,
          selected_recipe_id: selectedRecipeId,
          selected_recipe_name: selectedRecipeName,
          match_score: matchScore,
          organization_id: orgId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

      if (error) {
        // Table might not exist yet, log and continue
        logger.warn('[RecipeMatchingEngine] Failed to record selection', {
          menuItemName,
          selectedRecipeId,
          error: error.message,
        });
        return;
      }

      // Update cache
      const cacheKey = `${orgId}:${menuItemName.toLowerCase()}`;
      const cached = this.selectionCache.get(cacheKey) || [];
      cached.push({
        menu_item_name: menuItemName,
        selected_recipe_id: selectedRecipeId,
        selected_recipe_name: selectedRecipeName,
        match_score: matchScore,
        org_id: orgId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      this.selectionCache.set(cacheKey, cached);

      logger.info('[RecipeMatchingEngine] Chef selection recorded', {
        menuItemName,
        selectedRecipeId,
        matchScore,
      });
    } catch (error) {
      logger.warn('[RecipeMatchingEngine] Error recording chef selection', {
        menuItemName,
        selectedRecipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - learning is non-critical
    }
  }

  /**
   * Get historical selections for learning
   */
  private async getHistoricalSelections(
    menuItemName: string,
    orgId: string
  ): Promise<RecipeSelection[]> {
    try {
      // Check cache first
      const cacheKey = `${orgId}:${menuItemName.toLowerCase()}`;
      const cached = this.selectionCache.get(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }

      const supabase = getSupabaseServiceClient();

      // Query database for historical selections
      const { data: selections, error } = await supabase
        .from('recipe_selection_history')
        .select('*')
        .eq('organization_id', orgId)
        .ilike('menu_item_name', menuItemName)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Table might not exist yet
        logger.debug('[RecipeMatchingEngine] Recipe selection history table not found', {
          menuItemName,
          error: error.message,
        });
        return [];
      }

      // Cache results
      const recipeSelections = (selections || []).map(s => ({
        menu_item_name: s.menu_item_name,
        selected_recipe_id: s.selected_recipe_id,
        selected_recipe_name: s.selected_recipe_name,
        match_score: s.match_score || 0,
        org_id: s.organization_id,
        user_id: s.user_id,
        created_at: s.created_at,
      }));

      this.selectionCache.set(cacheKey, recipeSelections);

      return recipeSelections;
    } catch (error) {
      logger.warn('[RecipeMatchingEngine] Error getting historical selections', {
        menuItemName,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Add synonym to dictionary (for expanding knowledge)
   */
  addSynonym(term: string, synonym: string): void {
    const normalizedTerm = term.toLowerCase().trim();
    const normalizedSynonym = synonym.toLowerCase().trim();

    if (!this.synonymDictionary.has(normalizedTerm)) {
      this.synonymDictionary.set(normalizedTerm, []);
    }

    const synonyms = this.synonymDictionary.get(normalizedTerm)!;
    if (!synonyms.includes(normalizedSynonym)) {
      synonyms.push(normalizedSynonym);
    }

    logger.info('[RecipeMatchingEngine] Synonym added', {
      term: normalizedTerm,
      synonym: normalizedSynonym,
    });
  }
}

export const recipeMatchingEngine = new RecipeMatchingEngine();
