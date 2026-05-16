/**
 * Menu Versioning Service
 * 
 * Enhanced version comparison and management
 * All text is i18n-ready with translation keys
 */

import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';

export interface MenuVersion {
  id: string;
  menuId: string;
  orgId: string;
  versionNumber: number;
  changeLog?: string;
  changeLogKey?: string; // i18n key
  menuState: any; // Complete menu snapshot
  performanceMetrics?: Record<string, any>;
  createdBy: string;
  createdAt: string;
}

export interface VersionComparison {
  version1: MenuVersion;
  version2: MenuVersion;
  differences: VersionDifference[];
  summary: {
    itemsAdded: number;
    itemsRemoved: number;
    itemsModified: number;
    categoriesAdded: number;
    categoriesRemoved: number;
    categoriesModified: number;
    priceChanges: number;
    totalChanges: number;
  };
  impactAnalysis?: {
    estimatedRevenueImpact: number;
    estimatedCostImpact: number;
    performanceImpact: 'positive' | 'neutral' | 'negative';
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface VersionDifference {
  type: 'added' | 'removed' | 'modified' | 'price_changed' | 'category_changed';
  path: string; // JSON path to changed item
  field?: string; // Specific field that changed
  oldValue?: any;
  newValue?: any;
  description: string;
  descriptionKey?: string; // i18n key
}

class MenuVersioningService {
  /**
   * Get all versions for a menu
   */
  async getMenuVersions(menuId: string, orgId: string): Promise<MenuVersion[]> {
    try {
      const { data, error } = await supabase
        .from('menu_versions')
        .select('*')
        .eq('menu_id', menuId)
        .eq('org_id', orgId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => this.mapRowToVersion(row));
    } catch (error) {
      logger.error('[MenuVersioning] Error getting menu versions:', error);
      throw error;
    }
  }

  /**
   * Get specific version
   */
  async getVersion(menuId: string, versionNumber: number, orgId: string): Promise<MenuVersion | null> {
    try {
      const { data, error } = await supabase
        .from('menu_versions')
        .select('*')
        .eq('menu_id', menuId)
        .eq('version_number', versionNumber)
        .eq('org_id', orgId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapRowToVersion(data) : null;
    } catch (error) {
      logger.error('[MenuVersioning] Error getting version:', error);
      throw error;
    }
  }

  /**
   * Create new version
   */
  async createVersion(
    menuId: string,
    menuState: any,
    createdBy: string,
    orgId: string,
    changeLog?: string,
    changeLogKey?: string
  ): Promise<MenuVersion> {
    try {
      // Get latest version number
      const { data: latestVersion } = await supabase
        .from('menu_versions')
        .select('version_number')
        .eq('menu_id', menuId)
        .eq('org_id', orgId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

      // Create version
      const { data, error } = await supabase
        .from('menu_versions')
        .insert({
          menu_id: menuId,
          org_id: orgId,
          user_id: createdBy,
          version_number: versionNumber,
          change_log: changeLog,
          change_log_key: changeLogKey, // i18n key
          menu_state: menuState,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapRowToVersion(data);
    } catch (error) {
      logger.error('[MenuVersioning] Error creating version:', error);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    menuId: string,
    version1Number: number,
    version2Number: number,
    orgId: string
  ): Promise<VersionComparison> {
    try {
      const version1 = await this.getVersion(menuId, version1Number, orgId);
      const version2 = await this.getVersion(menuId, version2Number, orgId);

      if (!version1 || !version2) {
        throw new Error('One or both versions not found');
      }

      // Compare menu states
      const differences = this.compareMenuStates(version1.menuState, version2.menuState);

      // Calculate summary
      const summary = this.calculateSummary(differences);

      // Perform impact analysis
      const impactAnalysis = await this.analyzeImpact(version1, version2, differences);

      return {
        version1,
        version2,
        differences,
        summary,
        impactAnalysis,
      };
    } catch (error) {
      logger.error('[MenuVersioning] Error comparing versions:', error);
      throw error;
    }
  }

  /**
   * Compare menu states and find differences
   */
  private compareMenuStates(state1: any, state2: any): VersionDifference[] {
    const differences: VersionDifference[] = [];

    // Compare items
    const items1 = state1.items || [];
    const items2 = state2.items || [];
    const items1Map = new Map(items1.map((item: any) => [item.id, item]));
    const items2Map = new Map(items2.map((item: any) => [item.id, item]));

    // Find added items
    for (const [id, item] of items2Map.entries()) {
      if (!items1Map.has(id)) {
        differences.push({
          type: 'added',
          path: `items[${id}]`,
          newValue: item,
          description: `Item added: ${item.name || item.id}`,
          descriptionKey: 'menu.versioning.item.added', // i18n key
        });
      }
    }

    // Find removed items
    for (const [id, item] of items1Map.entries()) {
      if (!items2Map.has(id)) {
        differences.push({
          type: 'removed',
          path: `items[${id}]`,
          oldValue: item,
          description: `Item removed: ${item.name || item.id}`,
          descriptionKey: 'menu.versioning.item.removed', // i18n key
        });
      }
    }

    // Find modified items
    for (const [id, item2] of items2Map.entries()) {
      const item1 = items1Map.get(id);
      if (item1) {
        const itemDifferences = this.compareObjects(item1, item2, `items[${id}]`, item2.name || id);
        differences.push(...itemDifferences);
      }
    }

    // Compare categories
    const categories1 = state1.categories || [];
    const categories2 = state2.categories || [];
    const categories1Map = new Map(categories1.map((cat: any) => [cat.id, cat]));
    const categories2Map = new Map(categories2.map((cat: any) => [cat.id, cat]));

    // Find added categories
    for (const [id, category] of categories2Map.entries()) {
      if (!categories1Map.has(id)) {
        differences.push({
          type: 'added',
          path: `categories[${id}]`,
          newValue: category,
          description: `Category added: ${category.name || id}`,
          descriptionKey: 'menu.versioning.category.added', // i18n key
        });
      }
    }

    // Find removed categories
    for (const [id, category] of categories1Map.entries()) {
      if (!categories2Map.has(id)) {
        differences.push({
          type: 'removed',
          path: `categories[${id}]`,
          oldValue: category,
          description: `Category removed: ${category.name || id}`,
          descriptionKey: 'menu.versioning.category.removed', // i18n key
        });
      }
    }

    // Find modified categories
    for (const [id, category2] of categories2Map.entries()) {
      const category1 = categories1Map.get(id);
      if (category1) {
        const catDifferences = this.compareObjects(category1, category2, `categories[${id}]`, category2.name || id);
        differences.push(...catDifferences);
      }
    }

    return differences;
  }

  /**
   * Compare two objects and find field differences
   */
  private compareObjects(
    obj1: any,
    obj2: any,
    path: string,
    name: string
  ): VersionDifference[] {
    const differences: VersionDifference[] = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (val1 === undefined && val2 !== undefined) {
        differences.push({
          type: 'added',
          path: `${path}.${key}`,
          field: key,
          newValue: val2,
          description: `${name}: ${key} added`,
          descriptionKey: 'menu.versioning.field.added', // i18n key
        });
      } else if (val1 !== undefined && val2 === undefined) {
        differences.push({
          type: 'removed',
          path: `${path}.${key}`,
          field: key,
          oldValue: val1,
          description: `${name}: ${key} removed`,
          descriptionKey: 'menu.versioning.field.removed', // i18n key
        });
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        const diffType = key === 'price' ? 'price_changed' : 'modified';
        differences.push({
          type: diffType,
          path: `${path}.${key}`,
          field: key,
          oldValue: val1,
          newValue: val2,
          description: `${name}: ${key} changed from ${val1} to ${val2}`,
          descriptionKey: diffType === 'price_changed'
            ? 'menu.versioning.price.changed' // i18n key
            : 'menu.versioning.field.modified', // i18n key
        });
      }
    }

    return differences;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(differences: VersionDifference[]): VersionComparison['summary'] {
    const itemsAdded = differences.filter(d => d.path.startsWith('items[') && d.type === 'added').length;
    const itemsRemoved = differences.filter(d => d.path.startsWith('items[') && d.type === 'removed').length;
    const itemsModified = differences.filter(d => d.path.startsWith('items[') && d.type === 'modified').length;
    const categoriesAdded = differences.filter(d => d.path.startsWith('categories[') && d.type === 'added').length;
    const categoriesRemoved = differences.filter(d => d.path.startsWith('categories[') && d.type === 'removed').length;
    const categoriesModified = differences.filter(d => d.path.startsWith('categories[') && d.type === 'modified').length;
    const priceChanges = differences.filter(d => d.type === 'price_changed').length;

    return {
      itemsAdded,
      itemsRemoved,
      itemsModified,
      categoriesAdded,
      categoriesRemoved,
      categoriesModified,
      priceChanges,
      totalChanges: differences.length,
    };
  }

  /**
   * Analyze impact of changes with comprehensive revenue, cost, and performance analysis
   */
  private async analyzeImpact(
    version1: MenuVersion,
    version2: MenuVersion,
    differences: VersionDifference[]
  ): Promise<VersionComparison['impactAnalysis']> {
    // Calculate estimated revenue impact
    const priceChanges = differences.filter(d => d.type === 'price_changed');
    let estimatedRevenueImpact = 0;

    // Get menu performance data if available
    const menuId = version1.menuId;
    const { data: menuPerformance } = await supabase
      .from('menu_performance')
      .select('item_performance, total_revenue, total_items_sold')
      .eq('menu_id', menuId)
      .order('data_to', { ascending: false })
      .limit(1)
      .maybeSingle();

    const itemPerformance = menuPerformance?.item_performance || {};
    const avgDailySales = menuPerformance?.total_items_sold ? menuPerformance.total_items_sold / 30 : 0; // Assume 30-day period
    const avgDailyRevenue = menuPerformance?.total_revenue ? menuPerformance.total_revenue / 30 : 0;

    for (const change of priceChanges) {
      const oldPrice = parseFloat(change.oldValue || 0);
      const newPrice = parseFloat(change.newValue || 0);
      const priceDiff = newPrice - oldPrice;

      // Extract item ID from path (e.g., "items[item-123].price" -> "item-123")
      const itemIdMatch = change.path.match(/items\[([^\]]+)\]/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;

      if (itemId && itemPerformance[itemId]) {
        // Use actual historical sales data
        const itemSales = itemPerformance[itemId].sold || 0;
        const monthlySales = itemSales;
        estimatedRevenueImpact += priceDiff * monthlySales;
      } else {
        // Estimate using average sales per item
        const estimatedMonthlySales = avgDailySales / (version1.menuState?.items?.length || 1) * 30;
        estimatedRevenueImpact += priceDiff * estimatedMonthlySales;
      }
    }

    // Calculate estimated cost impact from added/removed/modified items
    const itemsRemoved = differences.filter(d => d.path.startsWith('items[') && d.type === 'removed');
    const itemsAdded = differences.filter(d => d.path.startsWith('items[') && d.type === 'added');
    const itemsModified = differences.filter(d => d.path.startsWith('items[') && d.type === 'modified');
    
    let estimatedCostImpact = 0;

    // Calculate cost for removed items (loss of COGS)
    for (const removed of itemsRemoved) {
      const item = removed.oldValue;
      if (item && item.cost) {
        // Estimate monthly cost impact based on historical sales
        const itemIdMatch = removed.path.match(/items\[([^\]]+)\]/);
        const itemId = itemIdMatch ? itemIdMatch[1] : null;
        
        if (itemId && itemPerformance[itemId]) {
          const monthlySales = itemPerformance[itemId].sold || 0;
          estimatedCostImpact -= item.cost * monthlySales; // Negative because we're removing costs
        } else {
          // Estimate average monthly sales
          const estimatedMonthlySales = avgDailySales / (version1.menuState?.items?.length || 1) * 30;
          estimatedCostImpact -= item.cost * estimatedMonthlySales;
        }
      }
    }

    // Calculate cost for added items (additional COGS)
    for (const added of itemsAdded) {
      const item = added.newValue;
      if (item && item.cost) {
        // Estimate monthly cost based on similar items' sales
        const estimatedMonthlySales = avgDailySales / (version2.menuState?.items?.length || 1) * 30;
        estimatedCostImpact += item.cost * estimatedMonthlySales;
      }
    }

    // Calculate cost changes from modified items (recipe cost changes)
    for (const modified of itemsModified) {
      if (modified.field === 'cost' || modified.field === 'recipe_id') {
        const oldCost = parseFloat(modified.oldValue || 0);
        const newCost = parseFloat(modified.newValue || 0);
        const costDiff = newCost - oldCost;

        const itemIdMatch = modified.path.match(/items\[([^\]]+)\]/);
        const itemId = itemIdMatch ? itemIdMatch[1] : null;

        if (itemId && itemPerformance[itemId]) {
          const monthlySales = itemPerformance[itemId].sold || 0;
          estimatedCostImpact += costDiff * monthlySales;
        } else {
          const estimatedMonthlySales = avgDailySales / (version1.menuState?.items?.length || 1) * 30;
          estimatedCostImpact += costDiff * estimatedMonthlySales;
        }
      }
    }

    // Calculate performance impact based on items added/removed
    // Positive impact: Adding high-performing items, removing low-performing items
    // Negative impact: Removing high-performing items, adding low-performing items
    let performanceScore = 0;
    
    for (const removed of itemsRemoved) {
      const itemIdMatch = removed.path.match(/items\[([^\]]+)\]/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;
      
      if (itemId && itemPerformance[itemId]) {
        const popularityScore = itemPerformance[itemId].popularity_score || 0;
        performanceScore -= popularityScore; // Negative because removing items
      }
    }

    for (const added of itemsAdded) {
      // Assume new items have neutral performance until tracked
      // Could be enhanced with AI predictions based on similar items
      performanceScore += 0.5; // Slight positive for new items (innovation)
    }

    // Determine performance impact
    let performanceImpact: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (estimatedRevenueImpact > avgDailyRevenue * 0.1 || performanceScore > 5) {
      performanceImpact = 'positive';
    } else if (estimatedRevenueImpact < -avgDailyRevenue * 0.1 || performanceScore < -5) {
      performanceImpact = 'negative';
    }

    // Determine risk level with more sophisticated logic
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const criticalChangeCount = priceChanges.length + itemsRemoved.length;
    const totalItemCount = version1.menuState?.items?.length || 0;
    const changePercentage = totalItemCount > 0 ? (criticalChangeCount / totalItemCount) * 100 : 0;

    if (
      differences.length > 20 ||
      priceChanges.length > 10 ||
      itemsRemoved.length > 5 ||
      changePercentage > 30 ||
      Math.abs(estimatedRevenueImpact) > avgDailyRevenue * 2
    ) {
      riskLevel = 'high';
    } else if (
      differences.length > 10 ||
      priceChanges.length > 5 ||
      itemsRemoved.length > 2 ||
      changePercentage > 15 ||
      Math.abs(estimatedRevenueImpact) > avgDailyRevenue * 0.5
    ) {
      riskLevel = 'medium';
    }

    return {
      estimatedRevenueImpact,
      estimatedCostImpact,
      performanceImpact,
      riskLevel,
    };
  }

  /**
   * Restore to version
   */
  async restoreToVersion(
    menuId: string,
    versionNumber: number,
    restoredBy: string,
    orgId: string
  ): Promise<MenuVersion> {
    try {
      const version = await this.getVersion(menuId, versionNumber, orgId);
      if (!version) {
        throw new Error('Version not found');
      }

      // Create new version from restored state
      const restoredVersion = await this.createVersion(
        menuId,
        version.menuState,
        restoredBy,
        orgId,
        `Restored from version ${versionNumber}`,
        'menu.versioning.restored' // i18n key
      );

      // Update menu to restored state
      const { error } = await supabase
        .from('menus')
        .update({
          menu_data: version.menuState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', menuId)
        .eq('org_id', orgId);

      if (error) throw error;

      logger.info(`[MenuVersioning] Menu ${menuId} restored to version ${versionNumber}`);

      return restoredVersion;
    } catch (error) {
      logger.error('[MenuVersioning] Error restoring version:', error);
      throw error;
    }
  }

  /**
   * Get version history timeline
   */
  async getVersionHistory(menuId: string, orgId: string): Promise<Array<{
    version: MenuVersion;
    changes: number;
    performance?: Record<string, any>;
  }>> {
    try {
      const versions = await this.getMenuVersions(menuId, orgId);
      const history = [];

      for (let i = 0; i < versions.length; i++) {
        const version = versions[i];
        let changes = 0;

        if (i < versions.length - 1) {
          const comparison = await this.compareVersions(menuId, versions[i + 1].versionNumber, version.versionNumber, orgId);
          changes = comparison.summary.totalChanges;
        }

        history.push({
          version,
          changes,
          performance: version.performanceMetrics,
        });
      }

      return history;
    } catch (error) {
      logger.error('[MenuVersioning] Error getting version history:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private mapRowToVersion(row: any): MenuVersion {
    return {
      id: row.id,
      menuId: row.menu_id,
      orgId: row.org_id,
      versionNumber: row.version_number,
      changeLog: row.change_log,
      changeLogKey: row.change_log_key, // i18n key
      menuState: row.menu_state,
      performanceMetrics: row.performance_metrics || {},
      createdBy: row.user_id,
      createdAt: row.created_at,
    };
  }
}

export const menuVersioningService = new MenuVersioningService();
