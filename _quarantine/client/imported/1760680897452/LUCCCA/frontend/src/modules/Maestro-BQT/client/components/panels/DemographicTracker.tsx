/**
 * Demographic Tracker Component - Live Guest Pattern Analysis
 * 
 * Real-time tracking of guest behavior patterns including:
 * - Age, dietary, and preference distributions
 * - Service pacing and consumption patterns
 * - Operational insights for service optimization
 * - Learning algorithms for future event planning
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useCaptainStore } from '../../stores/captainStore';
import type { DemographicPattern, CaptainTable, Seat, MealChoice } from '../../types';

interface LiveDemographicData {
  totalGuests: number;
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  dietaryDistribution: Record<string, number>;
  mealPreferences: Record<MealChoice, number>;
  averageEatingPace: number;
  servicePacingTrend: 'ahead' | 'on_time' | 'behind';
  currentConsumptionRate: number;
  predictedWaste: number;
}

const DemographicMetric: React.FC<{
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}> = ({ label, value, trend, description }) => (
  <div className="glass-panel p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium text-primary">{label}</span>
      {trend && (
        <span className={`text-xs ${
          trend === 'up' ? 'text-ok' :
          trend === 'down' ? 'text-err' :
          'text-muted'
        }`}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
        </span>
      )}
    </div>
    <div className="text-lg font-bold text-accent">{value}</div>
    {description && (
      <div className="text-xs text-muted mt-1">{description}</div>
    )}
  </div>
);

const DistributionChart: React.FC<{
  title: string;
  data: Record<string, number>;
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange';
}> = ({ title, data, colorScheme = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500', 
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };
  
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  
  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-3">{title}</h4>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          const percentage = total > 0 ? (value / total) * 100 : 0;
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-primary min-w-0 flex-1">{key}</span>
                <div className="w-24 h-2 bg-panel rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClasses[colorScheme]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted ml-2 min-w-[3rem] text-right">
                {percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LivePacingAnalysis: React.FC<{
  data: LiveDemographicData;
  expectedDuration: number;
}> = ({ data, expectedDuration }) => {
  const pacingStatus = data.servicePacingTrend;
  const statusColors = {
    ahead: 'text-ok',
    on_time: 'text-accent',
    behind: 'text-warn'
  };
  
  const statusIcons = {
    ahead: '⚡',
    on_time: '✅',
    behind: '⏰'
  };
  
  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-3">Live Service Pacing</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-xs text-muted mb-1">Current Pace</div>
          <div className={`text-lg font-bold ${statusColors[pacingStatus]} flex items-center justify-center gap-1`}>
            <span>{statusIcons[pacingStatus]}</span>
            <span className="capitalize">{pacingStatus.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted mb-1">Avg Eating Time</div>
          <div className="text-lg font-bold text-primary">
            {data.averageEatingPace.toFixed(1)}m
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-default/20">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted">Consumption Rate:</span>
            <span className="ml-2 font-medium text-primary">
              {(data.currentConsumptionRate * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-muted">Predicted Waste:</span>
            <span className="ml-2 font-medium text-warn">
              {(data.predictedWaste * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DemographicTracker: React.FC<{
  eventId?: string;
  captainId?: string;
  className?: string;
}> = ({ eventId, captainId, className = '' }) => {
  const {
    tables,
    courseFires,
    currentCourse,
    demographicPatterns,
    recordDemographicPattern,
    updateDemographicPattern
  } = useCaptainStore();

  const [updateInterval, setUpdateInterval] = useState(30); // seconds
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate live demographic data from current tables and seats
  const liveData = useMemo((): LiveDemographicData => {
    const relevantTables = captainId 
      ? tables.filter(t => t.captainId === captainId)
      : tables;

    let totalGuests = 0;
    const ageGroups: Record<string, number> = {};
    const genders: Record<string, number> = {};
    const dietary: Record<string, number> = {};
    const meals: Record<MealChoice, number> = {
      beef: 0, fish: 0, chicken: 0, pork: 0, veg: 0, vegan: 0,
      kosher: 0, halal: 0, custom: 0
    };

    relevantTables.forEach(table => {
      table.seats.forEach(seat => {
        if (seat.name) {
          totalGuests++;
          
          // Age distribution (simplified example)
          const ageGroup = seat.specialNotes?.includes('senior') ? 'Senior (65+)' :
                          seat.specialNotes?.includes('child') ? 'Child (0-17)' :
                          seat.specialNotes?.includes('young') ? 'Young Adult (18-35)' :
                          'Adult (36-64)';
          ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
          
          // Gender distribution (would come from guest data in real implementation)
          const gender = Math.random() > 0.5 ? 'Female' : 'Male'; // Placeholder
          genders[gender] = (genders[gender] || 0) + 1;
          
          // Dietary restrictions
          if (seat.allergens) {
            seat.allergens.forEach(allergen => {
              dietary[allergen] = (dietary[allergen] || 0) + 1;
            });
          }
          
          // Meal preferences
          if (seat.mealChoice && meals.hasOwnProperty(seat.mealChoice)) {
            meals[seat.mealChoice]++;
          }
        }
      });
    });

    // Calculate pacing metrics
    const firedTables = courseFires.filter(f => f.course === currentCourse);
    const averageServiceTime = firedTables.length > 0 
      ? firedTables.reduce((sum, fire) => {
          const firedTime = new Date(fire.firedAt).getTime();
          const readyTime = fire.actualReadyAt ? new Date(fire.actualReadyAt).getTime() : Date.now();
          return sum + (readyTime - firedTime) / (1000 * 60); // Convert to minutes
        }, 0) / firedTables.length
      : 0;

    // Determine pacing trend (simplified logic)
    const expectedServiceTime = 15; // Expected 15 minutes per course
    const pacingTrend = averageServiceTime < expectedServiceTime * 0.9 ? 'ahead' :
                       averageServiceTime > expectedServiceTime * 1.1 ? 'behind' : 'on_time';

    return {
      totalGuests,
      ageDistribution: ageGroups,
      genderDistribution: genders,
      dietaryDistribution: dietary,
      mealPreferences: meals,
      averageEatingPace: averageServiceTime,
      servicePacingTrend: pacingTrend,
      currentConsumptionRate: 0.85, // Placeholder - would track actual consumption
      predictedWaste: 0.12 // Placeholder - would predict based on patterns
    };
  }, [tables, courseFires, currentCourse, captainId]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-calculation by updating a timestamp
      // In real implementation, this would trigger fresh data fetching
    }, updateInterval * 1000);

    return () => clearInterval(interval);
  }, [updateInterval]);

  // Save demographic pattern periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (liveData.totalGuests > 0 && eventId) {
        const patternId = `live-${eventId}`;
        const existingPattern = demographicPatterns.find(p => p.id === patternId);

        const patternData: Partial<DemographicPattern> = {
          eventType: 'wedding', // Would be determined from event data
          ageDistribution: liveData.ageDistribution,
          genderDistribution: liveData.genderDistribution,
          dietaryDistribution: liveData.dietaryDistribution,
          mealPreferences: liveData.mealPreferences,
          averageConsumption: {}, // Would be calculated from actual consumption
          wastePatterns: { predicted: liveData.predictedWaste },
          timingPatterns: {
            arrivalVariance: 0,
            eatingPace: liveData.averageEatingPace,
            lingering: 0
          },
          servicePreferences: {
            pacingPreference: liveData.servicePacingTrend === 'ahead' ? 'fast' :
                            liveData.servicePacingTrend === 'behind' ? 'leisurely' : 'moderate',
            interactionLevel: 'friendly', // Would be determined from service data
            attentionNeeds: 'medium' // Would be determined from service requests
          },
          sampleSize: liveData.totalGuests,
          confidence: Math.min(90, liveData.totalGuests * 2), // More guests = higher confidence
          lastUpdated: new Date().toISOString(),
          dataQuality: liveData.totalGuests > 50 ? 'high' :
                      liveData.totalGuests > 20 ? 'medium' : 'low'
        };

        if (existingPattern) {
          updateDemographicPattern(patternId, patternData);
        } else {
          const newPattern: DemographicPattern = {
            id: patternId,
            ...patternData as Required<Omit<DemographicPattern, 'id'>>
          };
          recordDemographicPattern(newPattern);
        }
      }
    }, 300000); // Save every 5 minutes

    return () => clearInterval(saveInterval);
  }, [liveData, eventId, demographicPatterns, recordDemographicPattern, updateDemographicPattern]);

  if (liveData.totalGuests === 0) {
    return (
      <div className={`glass-panel p-6 text-center ${className}`}>
        <div className="text-muted">No guest data available for demographic tracking</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-accent">Live Demographic Tracking</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-2 py-1 text-xs bg-panel border border-default rounded hover:bg-muted/10 transition-colors"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          <select
            value={updateInterval}
            onChange={(e) => setUpdateInterval(Number(e.target.value))}
            className="text-xs p-1 bg-panel border border-default rounded"
          >
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
          </select>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DemographicMetric 
          label="Total Guests" 
          value={liveData.totalGuests}
          description="Currently being tracked"
        />
        <DemographicMetric 
          label="Meal Choices" 
          value={Object.keys(liveData.mealPreferences).filter(k => liveData.mealPreferences[k as MealChoice] > 0).length}
          description="Different selections"
        />
        <DemographicMetric 
          label="Dietary Needs" 
          value={Object.keys(liveData.dietaryDistribution).length}
          description="Restrictions identified"
        />
        <DemographicMetric 
          label="Service Pace" 
          value={liveData.averageEatingPace.toFixed(1) + 'm'}
          trend={liveData.servicePacingTrend === 'ahead' ? 'up' : 
                 liveData.servicePacingTrend === 'behind' ? 'down' : 'stable'}
          description="Avg per course"
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(liveData.ageDistribution).length > 0 && (
          <DistributionChart 
            title="Age Distribution" 
            data={liveData.ageDistribution}
            colorScheme="blue"
          />
        )}
        
        {Object.keys(liveData.mealPreferences).filter(k => liveData.mealPreferences[k as MealChoice] > 0).length > 0 && (
          <DistributionChart 
            title="Meal Preferences" 
            data={Object.fromEntries(
              Object.entries(liveData.mealPreferences)
                .filter(([_, count]) => count > 0)
                .map(([meal, count]) => [meal.charAt(0).toUpperCase() + meal.slice(1), count])
            )}
            colorScheme="green"
          />
        )}
      </div>

      {/* Advanced Analysis */}
      {showAdvanced && (
        <>
          <LivePacingAnalysis data={liveData} expectedDuration={90} />
          
          {Object.keys(liveData.dietaryDistribution).length > 0 && (
            <DistributionChart 
              title="Dietary Restrictions" 
              data={liveData.dietaryDistribution}
              colorScheme="orange"
            />
          )}
          
          {Object.keys(liveData.genderDistribution).length > 0 && (
            <DistributionChart 
              title="Gender Distribution" 
              data={liveData.genderDistribution}
              colorScheme="purple"
            />
          )}
        </>
      )}

      {/* Live Insights */}
      <div className="glass-panel p-4">
        <h4 className="font-semibold text-accent mb-3">Live Insights</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-ok">•</span>
            <span className="text-primary">
              Service is currently <strong>{liveData.servicePacingTrend.replace('_', ' ')}</strong> compared to expected timing
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent">•</span>
            <span className="text-primary">
              Most popular meal choice: <strong>
                {Object.entries(liveData.mealPreferences)
                  .sort(([,a], [,b]) => b - a)[0]?.[0]?.charAt(0).toUpperCase() + 
                 Object.entries(liveData.mealPreferences)
                  .sort(([,a], [,b]) => b - a)[0]?.[0]?.slice(1) || 'None'}
              </strong>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-warn">•</span>
            <span className="text-primary">
              {Object.keys(liveData.dietaryDistribution).length > 0 
                ? `${Object.keys(liveData.dietaryDistribution).length} different dietary restrictions to monitor`
                : 'No special dietary restrictions identified'
              }
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted">•</span>
            <span className="text-primary">
              Data quality: <strong>{liveData.totalGuests > 50 ? 'High' : liveData.totalGuests > 20 ? 'Medium' : 'Low'}</strong> 
              ({liveData.totalGuests} guests tracked)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicTracker;
