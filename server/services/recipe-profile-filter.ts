/**
 * Recipe Profile Filter Service
 * 
 * Filter recipes by profile/restaurant, department, and global recipes
 * - Filter recipes by profile name (e.g., "Elate")
 * - Filter recipes by department (e.g., "pastry", "kitchen")
 * - Global recipe support (all outlets)
 * - Access control based on user profile
 */

import { logger } from '../lib/logger';
import { getSupabaseServiceClient } from '../lib/supabase-service-client';

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients?: any[];
  instructions?: string[];
  servings?: number;
  prep_time?: number;
  cook_time?: number;
  course?: string;
  cuisine?: string;
  profile_name?: string;
  department_filter?: string[];
  is_global?: boolean;
  organization_id: string;
  outlet_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeFilterOptions {
  profileName?: string;
  department?: string;
  includeGlobal?: boolean; // Default true
  outletId?: string;
  courseType?: string;
  cuisineType?: string;
}

class RecipeProfileFilter {
  /**
   * Get recipes for user's profile
   */
  async getRecipesForProfile(
    userId: string,
    orgId: string,
    options: RecipeFilterOptions = {}
  ): Promise<Recipe[]> {
    try {
      const supabase = getSupabaseServiceClient();
      const {
        profileName,
        department,
        includeGlobal = true,
        outletId,
        courseType,
        cuisineType,
      } = options;

      logger.info('[RecipeProfileFilter] Getting recipes for profile', {
        userId,
        orgId,
        profileName,
        department,
        includeGlobal,
        outletId,
      });

      // Get user's profile information
      const userProfile = await this.getUserProfile(userId, orgId);

      // Build query
      let query = supabase
        .from('user_recipes')
        .select('*')
        .eq('organization_id', orgId);

      // Filter by profile name (if specified, or use user's profile)
      const filterProfileName = profileName || userProfile?.profile_name;
      if (filterProfileName) {
        // Include recipes matching profile OR global recipes (if includeGlobal)
        if (includeGlobal) {
          query = query.or(
            `profile_name.eq.${filterProfileName},is_global.eq.true,profile_name.is.null`
          );
        } else {
          query = query.eq('profile_name', filterProfileName);
        }
      } else if (includeGlobal) {
        // If no profile specified, include global recipes
        query = query.or('is_global.eq.true,profile_name.is.null');
      }

      // Filter by department (if specified, or use user's department)
      const filterDepartment = department || userProfile?.department;
      if (filterDepartment) {
        query = query.contains('department_filter', [filterDepartment]);
      }

      // Filter by outlet (if specified)
      if (outletId) {
        // Include recipes for this outlet OR global recipes (if includeGlobal)
        if (includeGlobal) {
          query = query.or(`outlet_id.eq.${outletId},outlet_id.is.null,is_global.eq.true`);
        } else {
          query = query.or(`outlet_id.eq.${outletId},outlet_id.is.null`);
        }
      }

      // Filter by course type (if specified)
      if (courseType) {
        query = query.eq('course', courseType);
      }

      // Filter by cuisine type (if specified)
      if (cuisineType) {
        query = query.eq('cuisine', cuisineType);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data: recipes, error } = await query;

      if (error) {
        throw error;
      }

      logger.info('[RecipeProfileFilter] Recipes found', {
        userId,
        orgId,
        count: recipes?.length || 0,
      });

      return (recipes || []) as Recipe[];
    } catch (error) {
      logger.error('[RecipeProfileFilter] Error getting recipes for profile', {
        userId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Filter recipes by department
   */
  async filterRecipesByDepartment(
    recipes: Recipe[],
    department: string
  ): Promise<Recipe[]> {
    try {
      return recipes.filter(recipe => {
        // Include if recipe has no department filter (accessible to all)
        if (!recipe.department_filter || recipe.department_filter.length === 0) {
          return true;
        }

        // Include if recipe's department filter contains the department
        return recipe.department_filter.includes(department);
      });
    } catch (error) {
      logger.error('[RecipeProfileFilter] Error filtering recipes by department', {
        department,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get global recipes (all outlets)
   */
  async getGlobalRecipes(
    orgId: string,
    department?: string,
    courseType?: string
  ): Promise<Recipe[]> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[RecipeProfileFilter] Getting global recipes', {
        orgId,
        department,
        courseType,
      });

      let query = supabase
        .from('user_recipes')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_global', true);

      // Filter by department (if specified)
      if (department) {
        query = query.contains('department_filter', [department]);
      }

      // Filter by course type (if specified)
      if (courseType) {
        query = query.eq('course', courseType);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data: recipes, error } = await query;

      if (error) {
        throw error;
      }

      logger.info('[RecipeProfileFilter] Global recipes found', {
        orgId,
        count: recipes?.length || 0,
      });

      return (recipes || []) as Recipe[];
    } catch (error) {
      logger.error('[RecipeProfileFilter] Error getting global recipes', {
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark recipe as global
   */
  async markRecipeAsGlobal(
    recipeId: string,
    orgId: string,
    userId: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[RecipeProfileFilter] Marking recipe as global', {
        recipeId,
        orgId,
        userId,
      });

      const { error } = await supabase
        .from('user_recipes')
        .update({
          is_global: true,
          global_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipeId)
        .eq('organization_id', orgId);

      if (error) {
        throw error;
      }

      logger.info('[RecipeProfileFilter] Recipe marked as global', {
        recipeId,
        orgId,
      });
    } catch (error) {
      logger.error('[RecipeProfileFilter] Error marking recipe as global', {
        recipeId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unmark recipe as global
   */
  async unmarkRecipeAsGlobal(
    recipeId: string,
    orgId: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[RecipeProfileFilter] Unmarking recipe as global', {
        recipeId,
        orgId,
      });

      const { error } = await supabase
        .from('user_recipes')
        .update({
          is_global: false,
          global_approved_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipeId)
        .eq('organization_id', orgId);

      if (error) {
        throw error;
      }

      logger.info('[RecipeProfileFilter] Recipe unmarked as global', {
        recipeId,
        orgId,
      });
    } catch (error) {
      logger.error('[RecipeProfileFilter] Error unmarking recipe as global', {
        recipeId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get user's profile information
   */
  private async getUserProfile(
    userId: string,
    orgId: string
  ): Promise<{ profile_name?: string; department?: string } | null> {
    try {
      const supabase = getSupabaseServiceClient();

      // Query user profile (assuming there's a user_profiles table or users table with profile info)
      // For now, placeholder - would need to query actual user profile table
      // This is a placeholder implementation

      // Check if there's a user_profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('profile_name, department')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single();

      if (error) {
        // Table might not exist, return null
        logger.debug('[RecipeProfileFilter] User profile not found', {
          userId,
          orgId,
          error: error.message,
        });
        return null;
      }

      return profile as { profile_name?: string; department?: string } | null;
    } catch (error) {
      logger.warn('[RecipeProfileFilter] Error getting user profile', {
        userId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set recipe profile name
   */
  async setRecipeProfile(
    recipeId: string,
    profileName: string,
    orgId: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[RecipeProfileFilter] Setting recipe profile', {
        recipeId,
        profileName,
        orgId,
      });

      const { error } = await supabase
        .from('user_recipes')
        .update({
          profile_name: profileName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipeId)
        .eq('organization_id', orgId);

      if (error) {
        throw error;
      }

      logger.info('[RecipeProfileFilter] Recipe profile set', {
        recipeId,
        profileName,
      });
    } catch (error) {
      logger.error('[RecipeProfileFilter] Error setting recipe profile', {
        recipeId,
        profileName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set recipe department filter
   */
  async setRecipeDepartmentFilter(
    recipeId: string,
    departments: string[],
    orgId: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[RecipeProfileFilter] Setting recipe department filter', {
        recipeId,
        departments,
        orgId,
      });

      const { error } = await supabase
        .from('user_recipes')
        .update({
          department_filter: departments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipeId)
        .eq('organization_id', orgId);

      if (error) {
        throw error;
      }

      logger.info('[RecipeProfileFilter] Recipe department filter set', {
        recipeId,
        departments,
      });
    } catch (error) {
      logger.error('[RecipeProfileFilter] Error setting recipe department filter', {
        recipeId,
        departments,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const recipeProfileFilter = new RecipeProfileFilter();
