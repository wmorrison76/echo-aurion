/**
 * Benchmark Engine
 * Compares your performance against peers
 */

import { BenchmarkReport, PeerBenchmark } from '../../../../shared/types/network-intelligence';
import { dataAggregator } from '../aggregator/data-aggregator';
import { UUID } from '../../../../shared/types/base';

export class BenchmarkEngine {
  /**
   * Generate benchmark report for a restaurant
   */
  async generateReport(
    restaurantId: UUID,
    period: { start: string; end: string }
  ): Promise<BenchmarkReport> {
    // Get restaurant's data
    const yourData = await this.getRestaurantData(restaurantId, period);
    
    // Get peer data
    const peerData = await dataAggregator.getAggregatedData({
      region: yourData.region,
      category: yourData.category,
      startDate: period.start,
      endDate: period.end
    });
    
    // Calculate benchmarks
    const benchmarks = {
      revenue: this.calculateBenchmark('dailyRevenue', yourData.revenue, peerData.map(p => p.metrics.dailyRevenue)),
      foodCost: this.calculateBenchmark('foodCostPercent', yourData.foodCostPercent, peerData.map(p => p.metrics.foodCostPercent)),
      laborCost: this.calculateBenchmark('laborCostPercent', yourData.laborCostPercent, peerData.map(p => p.metrics.laborCostPercent)),
      averageCheck: this.calculateBenchmark('averageCheck', yourData.averageCheck, peerData.map(p => p.metrics.averageCheck)),
      tableTurn: this.calculateBenchmark('tableTurnTime', yourData.tableTurn, peerData.map(p => p.metrics.tableTurnTime)),
      wastePercent: this.calculateBenchmark('wastePercent', yourData.wastePercent, peerData.map(p => p.metrics.wastePercent))
    };
    
    // Generate insights
    const insights = this.generateInsights(benchmarks);
    const recommendations = this.generateRecommendations(benchmarks);
    
    return {
      restaurantId,
      generatedAt: new Date().toISOString(),
      period,
      peerGroup: {
        category: yourData.category,
        region: yourData.region,
        totalPeers: peerData.length
      },
      benchmarks,
      insights,
      recommendations
    };
  }
  
  /**
   * Calculate benchmark for a single metric
   */
  private calculateBenchmark(
    metric: string,
    yourValue: number,
    peerValues: number[]
  ): PeerBenchmark {
    const sorted = peerValues.sort((a, b) => a - b);
    
    const average = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const top10Index = Math.floor(sorted.length * 0.9);
    const top10 = sorted[top10Index];
    
    // Calculate percentile
    const belowYou = sorted.filter(v => v < yourValue).length;
    const percentile = (belowYou / sorted.length) * 100;
    
    // Determine trend (simplified - would use historical data)
    const trend = 'stable' as any;
    
    return {
      metric,
      yourValue,
      peerAverage: average,
      peerMedian: median,
      peerTop10: top10,
      percentile,
      trend
    };
  }
  
  /**
   * Generate insights from benchmarks
   */
  private generateInsights(benchmarks: any): string[] {
    const insights: string[] = [];
    
    if (benchmarks.revenue.percentile > 75) {
      insights.push('🎉 Your revenue is in the top 25% of peers!');
    } else if (benchmarks.revenue.percentile < 25) {
      insights.push('⚠️ Revenue is below 75% of similar restaurants');
    }
    
    if (benchmarks.foodCost.percentile < 50) {
      insights.push('✅ Food cost control is better than average');
    }
    
    if (benchmarks.laborCost.percentile > 75) {
      insights.push('⚠️ Labor costs are higher than most peers');
    }
    
    if (benchmarks.wastePercent.percentile < 25) {
      insights.push('🌟 Waste management is excellent');
    }
    
    return insights;
  }
  
  /**
   * Generate recommendations
   */
  private generateRecommendations(benchmarks: any): string[] {
    const recs: string[] = [];
    
    if (benchmarks.foodCost.percentile > 60) {
      recs.push('Consider yield-aware costing to reduce food cost');
    }
    
    if (benchmarks.tableTurn.percentile > 60) {
      recs.push('Optimize table turnover - peers average ' + Math.round(benchmarks.tableTurn.peerAverage) + ' min');
    }
    
    if (benchmarks.averageCheck.percentile < 40) {
      recs.push('Menu pricing opportunity - average check is $' + benchmarks.averageCheck.peerAverage.toFixed(2) + ' in your market');
    }
    
    return recs;
  }
  
  /**
   * Get restaurant data (placeholder)
   */
  private async getRestaurantData(id: UUID, period: any): Promise<any> {
    // TODO: Get actual data
    return {
      region: 'Northeast',
      category: 'casual_dining',
      revenue: 5000,
      foodCostPercent: 32,
      laborCostPercent: 28,
      averageCheck: 45,
      tableTurn: 75,
      wastePercent: 4
    };
  }
}

export const benchmarkEngine = new BenchmarkEngine();
