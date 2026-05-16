/**
 * Data Aggregator
 * Collects and anonymizes data from all restaurants
 */

import { AnonymizedRestaurantData } from '../../../../shared/types/network-intelligence';
import { UUID } from '../../../../shared/types/base';

export class DataAggregator {
  /**
   * Anonymize and submit restaurant data
   */
  async submitData(restaurantId: UUID, rawData: any): Promise<void> {
    const anonymized = this.anonymize(restaurantId, rawData);
    await this.store(anonymized);
    console.log(`✅ Data submitted for ${restaurantId}`);
  }
  
  /**
   * Anonymize restaurant data
   */
  private anonymize(restaurantId: UUID, data: any): AnonymizedRestaurantData {
    // Generate anonymous ID (one-way hash)
    const anonymousId = this.hashId(restaurantId);
    
    return {
      id: anonymousId,
      timestamp: new Date().toISOString(),
      
      category: this.categorizeRestaurant(data),
      location: {
        region: this.getRegion(data.zipCode),
        marketSize: this.getMarketSize(data.zipCode),
        zipPrefix: data.zipCode?.substring(0, 3) || '000'
      },
      
      metrics: {
        dailyRevenue: data.revenue,
        coversServed: data.covers,
        averageCheck: data.revenue / (data.covers || 1),
        
        foodCostPercent: (data.foodCost / data.revenue) * 100,
        laborCostPercent: (data.laborCost / data.revenue) * 100,
        
        tableTurnTime: data.avgTableTurn || 60,
        ticketTime: data.avgTicketTime || 15,
        
        inventoryTurnover: data.inventoryTurnover || 12,
        wastePercent: (data.waste / data.totalFood) * 100
      },
      
      topSellingItems: data.topItems || []
    };
  }
  
  /**
   * One-way hash for anonymization
   */
  private hashId(id: UUID): UUID {
    // Simple hash - in production use crypto
    return `anon-${id.split('-')[0]}` as UUID;
  }
  
  /**
   * Categorize restaurant type
   */
  private categorizeRestaurant(data: any): any {
    const avgCheck = data.revenue / (data.covers || 1);
    
    if (avgCheck > 75) return 'fine_dining';
    if (avgCheck > 30) return 'casual_dining';
    if (avgCheck > 15) return 'fast_casual';
    return 'quick_service';
  }
  
  /**
   * Get region from zip code
   */
  private getRegion(zipCode: string): string {
    if (!zipCode) return 'Unknown';
    
    const prefix = parseInt(zipCode.substring(0, 2));
    
    if (prefix >= 0 && prefix <= 9) return 'Northeast';
    if (prefix >= 10 && prefix <= 27) return 'Mid-Atlantic';
    if (prefix >= 28 && prefix <= 39) return 'Southeast';
    if (prefix >= 40 && prefix <= 56) return 'Midwest';
    if (prefix >= 57 && prefix <= 69) return 'Central';
    if (prefix >= 70 && prefix <= 79) return 'South';
    if (prefix >= 80 && prefix <= 84) return 'Mountain';
    if (prefix >= 85 && prefix <= 99) return 'West';
    
    return 'Unknown';
  }
  
  /**
   * Get market size
   */
  private getMarketSize(zipCode: string): any {
    // Simplified - in production use actual data
    return 'suburban';
  }
  
  /**
   * Store anonymized data
   */
  private async store(data: AnonymizedRestaurantData): Promise<void> {
    // TODO: Store in database
    // For now, just log
    console.log('Storing anonymized data:', data.id);
  }
  
  /**
   * Retrieve aggregated data for analysis
   */
  async getAggregatedData(filters: {
    region?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AnonymizedRestaurantData[]> {
    // TODO: Retrieve from database
    return [];
  }
}

export const dataAggregator = new DataAggregator();
