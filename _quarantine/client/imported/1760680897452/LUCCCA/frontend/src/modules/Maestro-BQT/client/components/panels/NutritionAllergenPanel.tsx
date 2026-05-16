import React, { useState, useMemo } from 'react';
import { useEventStore, MenuItem, Guest } from '../../stores/eventStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';

interface AllergenInfo {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  icon: string;
  description: string;
  commonSources: string[];
}

const allergenDatabase: Record<string, AllergenInfo> = {
  'Dairy': {
    name: 'Dairy',
    severity: 'moderate',
    icon: '🥛',
    description: 'Milk and milk products',
    commonSources: ['Cheese', 'Butter', 'Cream', 'Yogurt', 'Ice Cream']
  },
  'Eggs': {
    name: 'Eggs',
    severity: 'moderate',
    icon: '🥚',
    description: 'Eggs and egg products',
    commonSources: ['Mayonnaise', 'Pasta', 'Baked Goods', 'Sauces']
  },
  'Fish': {
    name: 'Fish',
    severity: 'severe',
    icon: '🐟',
    description: 'Fish and fish products',
    commonSources: ['Salmon', 'Tuna', 'Cod', 'Fish Sauce', 'Worcestershire']
  },
  'Shellfish': {
    name: 'Shellfish',
    severity: 'severe',
    icon: '🦐',
    description: 'Crustaceans and mollusks',
    commonSources: ['Shrimp', 'Crab', 'Lobster', 'Oysters', 'Mussels']
  },
  'Nuts': {
    name: 'Tree Nuts',
    severity: 'severe',
    icon: '🥜',
    description: 'Tree nuts and nut products',
    commonSources: ['Almonds', 'Walnuts', 'Pecans', 'Nut Oils', 'Marzipan']
  },
  'Peanuts': {
    name: 'Peanuts',
    severity: 'severe',
    icon: '🥜',
    description: 'Peanuts and peanut products',
    commonSources: ['Peanut Butter', 'Peanut Oil', 'Satay Sauce']
  },
  'Soy': {
    name: 'Soy',
    severity: 'moderate',
    icon: '🫘',
    description: 'Soybeans and soy products',
    commonSources: ['Soy Sauce', 'Tofu', 'Edamame', 'Soy Oil']
  },
  'Gluten': {
    name: 'Gluten',
    severity: 'mild',
    icon: '🌾',
    description: 'Wheat, barley, rye proteins',
    commonSources: ['Bread', 'Pasta', 'Beer', 'Soy Sauce', 'Flour']
  },
  'Sulfites': {
    name: 'Sulfites',
    severity: 'mild',
    icon: '🍷',
    description: 'Sulfur dioxide and sulfites',
    commonSources: ['Wine', 'Dried Fruits', 'Vinegar', 'Pickled Foods']
  }
};

const NutritionalAnalysis: React.FC<{
  menu: Record<string, MenuItem[]>;
  guestCount: number;
}> = ({ menu, guestCount }) => {
  const allItems = Object.values(menu).flat();
  
  const totals = allItems.reduce((acc, item) => {
    acc.calories += item.nutritionalInfo.calories;
    acc.protein += item.nutritionalInfo.protein;
    acc.carbs += item.nutritionalInfo.carbs;
    acc.fat += item.nutritionalInfo.fat;
    acc.cost += item.cost;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });

  const caloriesFromProtein = totals.protein * 4;
  const caloriesFromCarbs = totals.carbs * 4;
  const caloriesFromFat = totals.fat * 9;
  const totalCaloriesFromMacros = caloriesFromProtein + caloriesFromCarbs + caloriesFromFat;

  const macroPercentages = {
    protein: (caloriesFromProtein / totalCaloriesFromMacros) * 100,
    carbs: (caloriesFromCarbs / totalCaloriesFromMacros) * 100,
    fat: (caloriesFromFat / totalCaloriesFromMacros) * 100
  };

  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">Nutritional Analysis</h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{totals.calories}</div>
          <div className="text-sm text-muted">Calories</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-accent">{totals.protein}g</div>
          <div className="text-sm text-muted">Protein</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-warn">{totals.carbs}g</div>
          <div className="text-sm text-muted">Carbs</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-err">{totals.fat}g</div>
          <div className="text-sm text-muted">Fat</div>
        </div>
      </div>

      {/* Macro Breakdown Chart */}
      <div className="space-y-3">
        <h5 className="font-medium text-primary">Macronutrient Breakdown</h5>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary">Protein</span>
            <span className="font-medium text-accent">{macroPercentages.protein.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-500"
              style={{ width: `${macroPercentages.protein}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary">Carbohydrates</span>
            <span className="font-medium text-warn">{macroPercentages.carbs.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-warn h-2 rounded-full transition-all duration-500"
              style={{ width: `${macroPercentages.carbs}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary">Fat</span>
            <span className="font-medium text-err">{macroPercentages.fat.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-err h-2 rounded-full transition-all duration-500"
              style={{ width: `${macroPercentages.fat}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-default text-sm text-muted">
        <div className="flex justify-between">
          <span>Total Menu Cost:</span>
          <span className="font-medium text-primary">${totals.cost.toFixed(2)} per guest</span>
        </div>
        <div className="flex justify-between">
          <span>Event Total:</span>
          <span className="font-medium text-accent">${(totals.cost * guestCount).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const AllergenMatrix: React.FC<{
  menu: Record<string, MenuItem[]>;
  guests: Guest[];
}> = ({ menu, guests }) => {
  const allItems = Object.values(menu).flat();
  const allAllergens = Array.from(new Set(allItems.flatMap(item => item.allergens)));
  
  // Get unique dietary restrictions from guests
  const guestRestrictions = Array.from(new Set(guests.flatMap(guest => guest.dietaryRestrictions)));
  
  const conflictAnalysis = allItems.map(item => {
    const conflictingGuests = guests.filter(guest => 
      guest.dietaryRestrictions.some(restriction => 
        item.allergens.includes(restriction) || 
        (restriction === 'Vegetarian' && item.ingredients.some(ing => 
          ['Beef', 'Chicken', 'Pork', 'Fish', 'Seafood'].some(meat => 
            ing.toLowerCase().includes(meat.toLowerCase())
          )
        ))
      )
    );
    
    return {
      item,
      conflictingGuests: conflictingGuests.length,
      guestNames: conflictingGuests.map(g => g.name)
    };
  });

  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">Allergen & Dietary Matrix</h4>
      
      {/* Allergen Summary */}
      <div className="mb-6">
        <h5 className="font-medium text-primary mb-3">Allergens Present in Menu</h5>
        <div className="flex flex-wrap gap-2">
          {allAllergens.map(allergen => {
            const info = allergenDatabase[allergen];
            const severity = info?.severity || 'mild';
            const severityColors = {
              mild: 'bg-yellow-100 border-yellow-300 text-yellow-800',
              moderate: 'bg-orange-100 border-orange-300 text-orange-800',
              severe: 'bg-red-100 border-red-300 text-red-800'
            };
            
            return (
              <div 
                key={allergen}
                className={`px-3 py-1 rounded-full border text-sm font-medium ${severityColors[severity]}`}
                title={info?.description}
              >
                <span className="mr-1">{info?.icon}</span>
                {allergen}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guest Restrictions */}
      <div className="mb-6">
        <h5 className="font-medium text-primary mb-3">Guest Dietary Restrictions</h5>
        <div className="space-y-2">
          {guestRestrictions.map(restriction => {
            const affectedGuests = guests.filter(g => g.dietaryRestrictions.includes(restriction));
            return (
              <div key={restriction} className="flex justify-between items-center">
                <span className="text-primary">{restriction}:</span>
                <span className="font-medium text-muted">
                  {affectedGuests.length} guest{affectedGuests.length !== 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conflict Analysis */}
      <div>
        <h5 className="font-medium text-primary mb-3">Menu Item Conflicts</h5>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {conflictAnalysis
            .filter(analysis => analysis.conflictingGuests > 0)
            .map(analysis => (
              <div key={analysis.item.id} className="p-3 bg-warn/10 border border-warn/20 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-primary">{analysis.item.name}</div>
                    <div className="text-sm text-muted">
                      Allergens: {analysis.item.allergens.join(', ') || 'None'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-warn font-bold">{analysis.conflictingGuests}</div>
                    <div className="text-xs text-muted">conflicts</div>
                  </div>
                </div>
                {analysis.guestNames.length > 0 && (
                  <div className="mt-2 text-xs text-muted">
                    Affected: {analysis.guestNames.join(', ')}
                  </div>
                )}
              </div>
            ))}
          
          {conflictAnalysis.every(analysis => analysis.conflictingGuests === 0) && (
            <div className="text-center py-4 text-ok">
              ✅ No dietary conflicts detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AlternativeMenu: React.FC<{
  restrictions: string[];
}> = ({ restrictions }) => {
  const alternativeItems = [
    {
      category: 'Vegetarian Options',
      items: ['Roasted Vegetable Stack', 'Quinoa Stuffed Portobello', 'Wild Rice Risotto']
    },
    {
      category: 'Gluten-Free Options',
      items: ['Grilled Salmon (GF)', 'Herb-Crusted Chicken (GF)', 'Vegetable Quinoa Bowl']
    },
    {
      category: 'Dairy-Free Options',
      items: ['Vegan Pasta Primavera', 'Coconut Curry Vegetables', 'Herb-Roasted Vegetables']
    },
    {
      category: 'Nut-Free Options',
      items: ['Simple Grilled Proteins', 'Steamed Vegetables', 'Rice Pilaf']
    }
  ];

  const relevantAlternatives = alternativeItems.filter(category =>
    restrictions.some(restriction => 
      category.category.toLowerCase().includes(restriction.toLowerCase()) ||
      (restriction === 'Vegetarian' && category.category.includes('Vegetarian'))
    )
  );

  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">Suggested Alternatives</h4>
      
      {relevantAlternatives.length > 0 ? (
        <div className="space-y-4">
          {relevantAlternatives.map((category, index) => (
            <div key={index}>
              <h5 className="font-medium text-primary mb-2">{category.category}</h5>
              <div className="space-y-1">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="p-2 bg-panel rounded border border-default text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted">
          No specific alternatives needed for current restrictions
        </div>
      )}
    </div>
  );
};

export const NutritionAllergenPanel: React.FC<{
  eventId?: string;
}> = ({ eventId }) => {
  const { currentEvent } = useEventStore();
  const [activeTab, setActiveTab] = useState<'nutrition' | 'allergens' | 'alternatives'>('nutrition');

  const analysis = useMemo(() => {
    if (!currentEvent) return null;

    const { menu, guests } = currentEvent;
    const allRestrictions = Array.from(new Set(guests.flatMap(g => g.dietaryRestrictions)));
    const conflictCount = Object.values(menu).flat().filter(item =>
      guests.some(guest => guest.dietaryRestrictions.some(restriction =>
        item.allergens.includes(restriction)
      ))
    ).length;

    return {
      totalAllergens: Array.from(new Set(Object.values(menu).flat().flatMap(item => item.allergens))).length,
      guestsWithRestrictions: guests.filter(g => g.dietaryRestrictions.length > 0).length,
      conflictingItems: conflictCount,
      riskLevel: conflictCount > 3 ? 'high' : conflictCount > 1 ? 'medium' : 'low'
    };
  }, [currentEvent]);

  if (!currentEvent) {
    return (
      <PanelShell title="Nutrition & Allergen">
        <div className="text-center text-muted">No event selected</div>
      </PanelShell>
    );
  }

  const { menu, guests, guestCount } = currentEvent;
  const allRestrictions = Array.from(new Set(guests.flatMap(g => g.dietaryRestrictions)));

  const riskColors = {
    low: 'text-ok',
    medium: 'text-warn',
    high: 'text-err'
  };

  const toolbarRight = (
    <div className="flex gap-1 bg-panel rounded-lg p-1">
      {[
        { id: 'nutrition', label: '📊 Nutrition' },
        { id: 'allergens', label: '⚠️ Allergens' },
        { id: 'alternatives', label: '🔄 Alternatives' }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            activeTab === tab.id
              ? 'bg-accent text-white'
              : 'text-muted hover:text-primary hover:bg-muted/10'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <PanelShell title="Nutrition & Allergen Analysis" toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Allergens in Menu</div>
            <div className="text-2xl font-bold text-accent">{analysis?.totalAllergens || 0}</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Guests w/ Restrictions</div>
            <div className="text-2xl font-bold text-primary">{analysis?.guestsWithRestrictions || 0}</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Conflicting Items</div>
            <div className={`text-2xl font-bold ${riskColors[analysis?.riskLevel || 'low']}`}>
              {analysis?.conflictingItems || 0}
            </div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Risk Level</div>
            <div className={`text-lg font-bold ${riskColors[analysis?.riskLevel || 'low']} capitalize`}>
              {analysis?.riskLevel || 'Low'}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'nutrition' && (
          <NutritionalAnalysis menu={menu} guestCount={guestCount} />
        )}

        {activeTab === 'allergens' && (
          <AllergenMatrix menu={menu} guests={guests} />
        )}

        {activeTab === 'alternatives' && (
          <AlternativeMenu restrictions={allRestrictions} />
        )}

        {/* Risk Alerts */}
        {analysis?.riskLevel === 'high' && (
          <div className="glass-panel p-4 border-l-4 border-err">
            <div className="flex items-start gap-3">
              <span className="text-err text-xl">🚨</span>
              <div>
                <h4 className="font-semibold text-err">High Risk Alert</h4>
                <p className="text-sm text-muted mt-1">
                  Multiple menu items conflict with guest dietary restrictions. 
                  Consider reviewing the menu or providing alternative options.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
};

export default NutritionAllergenPanel;
