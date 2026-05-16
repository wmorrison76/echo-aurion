/**
 * Menu & Recipe Panel - LUCCCA Chef Module
 * 
 * Features from manifest:
 * - Link recipes to menu items
 * - Scale recipes based on guest count  
 * - Buffer percentage management
 * - Missing recipe flag alerts
 * 
 * Integrates with Nova Lab Event Planner via Echo AI
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';
import type { 
  Recipe, 
  MenuCollection, 
  MenuItemLink, 
  ScaledRecipe, 
  ProductionPlan,
  EventMenuConnection,
  EchoAiMenuAnalysis,
  MenuSection,
  RecipeIngredient,
  ScalingRule
} from '../../types/menu';

interface MenuRecipePanelProps {
  eventId?: string;
  menuCollectionId?: string;
  mode?: 'browse' | 'plan' | 'production';
}

const MissingRecipeAlert: React.FC<{ item: MenuItemLink }> = ({ item }) => {
  if (!item.missingRecipeFlag) return null;
  
  return (
    <div className="bg-err/10 border border-err/20 rounded-lg p-3 mb-3">
      <div className="flex items-start gap-2">
        <span className="text-err text-lg">⚠️</span>
        <div className="flex-1">
          <div className="font-medium text-err">Missing Recipe: {item.name}</div>
          <div className="text-sm text-muted mt-1">
            {item.missingRecipeReason || 'Recipe not linked to menu item'}
          </div>
          {item.temporaryRecipe && (
            <div className="text-xs text-warn mt-1">
              Using temporary placeholder - needs chef approval
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90">
              Link Recipe
            </button>
            <button className="px-2 py-1 text-xs bg-warn text-white rounded hover:bg-warn/90">
              Create Recipe
            </button>
            <button className="px-2 py-1 text-xs bg-panel border border-default rounded hover:bg-muted/10">
              Mark as Temp OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecipeScaler: React.FC<{
  recipe: Recipe;
  targetServings: number;
  bufferPercentage: number;
  onScaleChange: (scaledRecipe: ScaledRecipe) => void;
}> = ({ recipe, targetServings, bufferPercentage, onScaleChange }) => {
  const [customBuffer, setCustomBuffer] = useState(bufferPercentage);
  const [scalingNotes, setScalingNotes] = useState<string[]>([]);

  const scalingMultiplier = targetServings / recipe.servings;
  const bufferedServings = Math.ceil(targetServings * (1 + customBuffer / 100));
  const finalMultiplier = bufferedServings / recipe.servings;

  const scaledRecipe = useMemo((): ScaledRecipe => {
    const scaledIngredients = recipe.ingredients.map(ingredient => {
      let scaledAmount = ingredient.amount * finalMultiplier;
      
      // Apply scaling behavior
      switch (ingredient.scalingBehavior) {
        case 'logarithmic':
          scaledAmount = ingredient.amount * Math.log(finalMultiplier + 1);
          break;
        case 'threshold':
          scaledAmount = finalMultiplier > 2 ? ingredient.amount * 2 : ingredient.amount * finalMultiplier;
          break;
        case 'fixed':
          scaledAmount = ingredient.amount;
          break;
        // 'linear' is default
      }

      return {
        ingredientId: ingredient.id,
        name: ingredient.name,
        originalAmount: ingredient.amount,
        scaledAmount: Number(scaledAmount.toFixed(3)),
        unit: ingredient.unit,
        scaledCost: (ingredient.unitCost || 0) * scaledAmount,
        purchaseQuantity: Math.ceil(scaledAmount), // simplified
        purchaseUnit: ingredient.unit,
        vendor: ingredient.vendor
      };
    });

    return {
      recipeId: recipe.id,
      originalServings: recipe.servings,
      targetServings: bufferedServings,
      scalingMultiplier: finalMultiplier,
      bufferPercentage: customBuffer,
      finalQuantity: bufferedServings,
      scaledIngredients,
      scaledCost: recipe.baseCost * finalMultiplier,
      scaledPrepTime: Math.ceil(recipe.prepTime * Math.sqrt(finalMultiplier)), // time doesn't scale linearly
      scaledCookTime: Math.ceil(recipe.cookTime * Math.sqrt(finalMultiplier)),
      scalingNotes,
      criticalAdjustments: finalMultiplier > recipe.maxScale ? ['Exceeds maximum recommended scale'] : [],
      qualityConsiderations: finalMultiplier > 5 ? ['Consider batch cooking'] : []
    };
  }, [recipe, finalMultiplier, customBuffer, scalingNotes]);

  useEffect(() => {
    onScaleChange(scaledRecipe);
  }, [scaledRecipe, onScaleChange]);

  const isOverScaled = finalMultiplier > recipe.maxScale;
  const isUnderScaled = finalMultiplier < recipe.minScale;

  return (
    <div className="glass-panel p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-primary">{recipe.name}</h4>
          <div className="text-sm text-muted">Base: {recipe.servings} servings</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-accent">
            {bufferedServings} servings
          </div>
          <div className="text-xs text-muted">
            {scalingMultiplier.toFixed(2)}x scale + {customBuffer}% buffer
          </div>
        </div>
      </div>

      {/* Scaling Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-primary">Buffer Percentage</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="0"
              max="50"
              value={customBuffer}
              onChange={(e) => setCustomBuffer(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium min-w-[3rem]">{customBuffer}%</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-primary">Final Cost</label>
          <div className="text-lg font-bold text-accent mt-1">
            ${scaledRecipe.scaledCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Scaling Warnings */}
      {(isOverScaled || isUnderScaled) && (
        <div className="mb-4">
          {isOverScaled && (
            <div className="bg-err/10 border border-err/20 rounded p-2 mb-2">
              <div className="text-sm text-err">
                ⚠️ Scaling beyond recommended maximum ({recipe.maxScale}x)
              </div>
            </div>
          )}
          {isUnderScaled && (
            <div className="bg-warn/10 border border-warn/20 rounded p-2">
              <div className="text-sm text-warn">
                ⚠️ Scaling below recommended minimum ({recipe.minScale}x)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Time Estimates */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <div className="text-center">
          <div className="text-muted">Prep Time</div>
          <div className="font-medium">{scaledRecipe.scaledPrepTime}m</div>
        </div>
        <div className="text-center">
          <div className="text-muted">Cook Time</div>
          <div className="font-medium">{scaledRecipe.scaledCookTime}m</div>
        </div>
        <div className="text-center">
          <div className="text-muted">Total</div>
          <div className="font-medium">{scaledRecipe.scaledPrepTime + scaledRecipe.scaledCookTime}m</div>
        </div>
      </div>

      {/* Key Ingredients Preview */}
      <div className="border-t border-default/20 pt-3">
        <div className="text-sm font-medium text-primary mb-2">Key Ingredients</div>
        <div className="space-y-1">
          {scaledRecipe.scaledIngredients.slice(0, 3).map(ingredient => (
            <div key={ingredient.ingredientId} className="flex justify-between text-xs">
              <span className="text-primary">{ingredient.name}</span>
              <span className="text-muted">
                {ingredient.scaledAmount} {ingredient.unit}
              </span>
            </div>
          ))}
          {scaledRecipe.scaledIngredients.length > 3 && (
            <div className="text-xs text-muted">
              + {scaledRecipe.scaledIngredients.length - 3} more ingredients...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MenuItemCard: React.FC<{
  item: MenuItemLink;
  recipe?: Recipe;
  eventConnection?: EventMenuConnection;
  onLinkRecipe: (itemId: string, recipeId: string) => void;
  onUpdateBuffer: (itemId: string, buffer: number) => void;
}> = ({ item, recipe, eventConnection, onLinkRecipe, onUpdateBuffer }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="glass-panel p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-primary">{item.name}</h4>
            {item.featured && (
              <span className="px-2 py-0.5 text-xs bg-accent text-white rounded">Featured</span>
            )}
            {!item.available && (
              <span className="px-2 py-0.5 text-xs bg-err text-white rounded">Unavailable</span>
            )}
          </div>
          <div className="text-sm text-muted">{item.description}</div>
          {item.clientVisible && (
            <div className="text-xs text-ok mt-1">✓ Visible to Event Planner</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-accent">${item.price.toFixed(2)}</div>
          <div className="text-xs text-muted">
            Buffer: {item.bufferPercentage}%
          </div>
        </div>
      </div>

      {/* Missing Recipe Alert */}
      <MissingRecipeAlert item={item} />

      {/* Recipe Link Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {item.hasLinkedRecipe ? (
            <>
              <span className="text-ok">✓</span>
              <span className="text-sm text-primary">
                Linked to: {recipe?.name || 'Recipe Loading...'}
              </span>
            </>
          ) : (
            <>
              <span className="text-err">⚠️</span>
              <span className="text-sm text-err">No recipe linked</span>
            </>
          )}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-2 py-1 text-xs bg-panel border border-default rounded hover:bg-muted/10"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Buffer Control */}
      <div className="mb-3">
        <label className="text-sm font-medium text-primary">Buffer Percentage</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min="0"
            max="30"
            value={item.bufferPercentage}
            onChange={(e) => onUpdateBuffer(item.id, Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium min-w-[3rem]">{item.bufferPercentage}%</span>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && recipe && (
        <div className="border-t border-default/20 pt-3 mt-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-primary mb-2">Recipe Info</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Base Servings:</span>
                  <span className="text-primary">{recipe.servings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Prep Time:</span>
                  <span className="text-primary">{recipe.prepTime}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Cost per Serving:</span>
                  <span className="text-primary">${recipe.costPerServing.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Difficulty:</span>
                  <span className="text-primary capitalize">{recipe.difficulty}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-primary mb-2">Dietary & Allergens</div>
              <div className="space-y-1">
                {recipe.allergens.length > 0 && (
                  <div>
                    <div className="text-xs text-warn">Allergens:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.allergens.map(allergen => (
                        <span key={allergen} className="px-1 py-0.5 text-xs bg-warn/20 text-warn rounded">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {recipe.dietaryTags.length > 0 && (
                  <div>
                    <div className="text-xs text-ok">Dietary:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.dietaryTags.map(tag => (
                        <span key={tag} className="px-1 py-0.5 text-xs bg-ok/20 text-ok rounded">
                          {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EchoAiInsights: React.FC<{ analysis?: EchoAiMenuAnalysis }> = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <div className="glass-panel p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold text-accent">Echo AI Menu Analysis</h3>
        <span className={`px-2 py-0.5 text-xs rounded ${
          analysis.overallScore >= 80 ? 'bg-ok text-white' :
          analysis.overallScore >= 60 ? 'bg-warn text-white' :
          'bg-err text-white'
        }`}>
          Score: {analysis.overallScore}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-primary mb-2">💰 Cost Optimizations</h4>
          <div className="space-y-1">
            {analysis.costOptimizations.slice(0, 3).map((optimization, idx) => (
              <div key={idx} className="text-sm text-primary">• {optimization}</div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-primary mb-2">📈 Trending Ingredients</h4>
          <div className="space-y-1">
            {analysis.trendingIngredients.slice(0, 3).map((ingredient, idx) => (
              <div key={idx} className="text-sm text-primary">• {ingredient}</div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-primary mb-2">🌿 Seasonal Recommendations</h4>
          <div className="space-y-1">
            {analysis.seasonalRecommendations.slice(0, 3).map((rec, idx) => (
              <div key={idx} className="text-sm text-primary">• {rec}</div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-primary mb-2">📊 Demand Forecast</h4>
          <div className="space-y-1">
            {Object.entries(analysis.demandForecast).slice(0, 3).map(([recipeId, demand]) => (
              <div key={recipeId} className="text-sm text-primary">
                • Recipe {recipeId.slice(-3)}: {(demand * 100).toFixed(0)}% demand
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MenuRecipePanel: React.FC<MenuRecipePanelProps> = ({
  eventId,
  menuCollectionId,
  mode = 'browse'
}) => {
  const [menuCollection, setMenuCollection] = useState<MenuCollection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [eventConnection, setEventConnection] = useState<EventMenuConnection | null>(null);
  const [echoAnalysis, setEchoAnalysis] = useState<EchoAiMenuAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockRecipes: Recipe[] = [
        {
          id: 'recipe-1',
          name: 'Pan-Seared Salmon',
          description: 'Fresh Atlantic salmon with seasonal vegetables',
          category: 'entree',
          cuisine: 'Contemporary American',
          servings: 10,
          yield: { amount: 10, unit: 'portions' },
          prepTime: 25,
          cookTime: 15,
          totalTime: 40,
          difficulty: 'medium',
          ingredients: [
            {
              id: 'ing-1',
              name: 'Salmon fillets',
              amount: 2.5,
              unit: 'lbs',
              preparation: '6oz portions',
              optional: false,
              scalingBehavior: 'linear',
              unitCost: 24.00,
              vendor: 'Pacific Fresh',
              availability: 'always',
              allergens: ['fish'],
              dietaryFlags: []
            }
          ],
          instructions: [],
          equipment: [],
          nutrition: {
            calories: 340,
            protein: 32,
            carbohydrates: 8,
            fat: 18,
            fiber: 2,
            sodium: 650,
            sugar: 4,
            caloriesFromFat: 162,
            macroBalance: 'high_protein'
          },
          allergens: ['fish'],
          dietaryTags: ['gluten_free'],
          createdBy: 'chef-1',
          lastModified: new Date().toISOString(),
          version: 1,
          baseCost: 60.00,
          costPerServing: 6.00,
          minScale: 0.5,
          maxScale: 10,
          aiOptimized: true,
          popularityScore: 85,
          eventPlannerVisible: true,
          clientApproved: true,
          marketingDescription: 'Sustainably sourced Atlantic salmon, expertly prepared'
        }
      ];
      
      const mockMenu: MenuCollection = {
        id: menuCollectionId || 'menu-1',
        name: 'Summer Wedding Menu',
        description: 'Elegant summer celebration menu',
        type: 'prix_fixe',
        season: 'summer',
        sections: [
          {
            id: 'entrees',
            name: 'Main Courses',
            order: 1,
            category: 'entree',
            items: [
              {
                id: 'item-1',
                recipeId: 'recipe-1',
                name: 'Pan-Seared Salmon',
                price: 48.00,
                available: true,
                featured: true,
                seasonalOnly: false,
                defaultPortions: 1,
                bufferPercentage: 15,
                scalingRules: [],
                hasLinkedRecipe: true,
                missingRecipeFlag: false,
                clientVisible: true,
                dietaryIconsShow: true,
                allergenWarningsShow: true
              },
              {
                id: 'item-2',
                recipeId: 'recipe-missing',
                name: 'Vegetarian Wellington',
                price: 42.00,
                available: true,
                featured: false,
                seasonalOnly: false,
                defaultPortions: 1,
                bufferPercentage: 20,
                scalingRules: [],
                hasLinkedRecipe: false,
                missingRecipeFlag: true,
                missingRecipeReason: 'New menu item - recipe in development',
                temporaryRecipe: true,
                clientVisible: true,
                dietaryIconsShow: true,
                allergenWarningsShow: true
              }
            ],
            required: true,
            multipleChoice: true,
            maxSelections: 1,
            displayStyle: 'list',
            showPricing: true
          }
        ],
        totalItems: 2,
        averageCostPerPerson: 45.00,
        profitMargin: 65,
        priceRange: { min: 42, max: 48 },
        eventTypes: ['wedding', 'anniversary'],
        guestCountRange: { min: 50, max: 300 },
        prepComplexity: 7,
        staffRequirement: 3,
        equipmentRequirement: ['grill', 'oven', 'prep station'],
        status: 'approved',
        approvedBy: 'exec-chef-1',
        approvedAt: new Date().toISOString(),
        performanceMetrics: {
          orderFrequency: 12,
          guestSatisfaction: 92,
          profitability: 78,
          preparationTime: 180,
          complexityScore: 7,
          seasonalPerformance: [],
          popularItems: ['recipe-1'],
          problematicItems: []
        }
      };

      const mockEchoAnalysis: EchoAiMenuAnalysis = {
        menuCollectionId: mockMenu.id,
        analysisDate: new Date().toISOString(),
        overallScore: 84,
        profitabilityAnalysis: [
          'Salmon pricing optimal for current market',
          'Consider seasonal pricing adjustments',
          'Vegetarian options showing strong demand'
        ],
        seasonalRecommendations: [
          'Add summer stone fruit dessert',
          'Feature local corn in side dishes',
          'Highlight sustainable seafood options'
        ],
        trendingIngredients: [
          'Heirloom tomatoes',
          'Wild mushrooms', 
          'Local honey'
        ],
        costOptimizations: [
          'Source salmon directly from supplier',
          'Negotiate bulk pricing for vegetables',
          'Consider prep-ahead options for efficiency'
        ],
        demandForecast: {
          'recipe-1': 0.75,
          'recipe-missing': 0.25
        },
        seasonalAdjustments: {},
        pricingRecommendations: {},
        qualityPredictions: {},
        satisfactionPredictions: {},
        riskAssessments: {}
      };

      setRecipes(mockRecipes);
      setMenuCollection(mockMenu);
      setEchoAnalysis(mockEchoAnalysis);
      
      if (eventId) {
        setEventConnection({
          eventId,
          menuCollectionId: mockMenu.id,
          customizations: [],
          guestPreferences: [],
          dietaryRestrictions: [],
          lastSyncedAt: new Date().toISOString(),
          syncStatus: 'synced'
        });
      }
      
      setIsLoading(false);
    };

    loadData();
  }, [eventId, menuCollectionId]);

  const handleLinkRecipe = useCallback((itemId: string, recipeId: string) => {
    if (!menuCollection) return;
    
    const updatedSections = menuCollection.sections.map(section => ({
      ...section,
      items: section.items.map(item => 
        item.id === itemId 
          ? { ...item, recipeId, hasLinkedRecipe: true, missingRecipeFlag: false }
          : item
      )
    }));
    
    setMenuCollection({ ...menuCollection, sections: updatedSections });
  }, [menuCollection]);

  const handleUpdateBuffer = useCallback((itemId: string, buffer: number) => {
    if (!menuCollection) return;
    
    const updatedSections = menuCollection.sections.map(section => ({
      ...section,
      items: section.items.map(item => 
        item.id === itemId 
          ? { ...item, bufferPercentage: buffer }
          : item
      )
    }));
    
    setMenuCollection({ ...menuCollection, sections: updatedSections });
  }, [menuCollection]);

  const filteredItems = useMemo(() => {
    if (!menuCollection) return [];
    
    let items: MenuItemLink[] = [];
    
    if (selectedSection === 'all') {
      items = menuCollection.sections.flatMap(section => section.items);
    } else {
      const section = menuCollection.sections.find(s => s.id === selectedSection);
      items = section?.items || [];
    }
    
    if (showOnlyMissing) {
      items = items.filter(item => item.missingRecipeFlag);
    }
    
    return items;
  }, [menuCollection, selectedSection, showOnlyMissing]);

  const missingRecipeCount = useMemo(() => {
    if (!menuCollection) return 0;
    return menuCollection.sections
      .flatMap(section => section.items)
      .filter(item => item.missingRecipeFlag).length;
  }, [menuCollection]);

  const toolbarRight = (
    <div className="flex items-center gap-3">
      {eventConnection && (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            eventConnection.syncStatus === 'synced' ? 'bg-ok' :
            eventConnection.syncStatus === 'pending' ? 'bg-warn' :
            'bg-err'
          }`} />
          <span className="text-sm text-muted">
            Nova Lab: {eventConnection.syncStatus}
          </span>
        </div>
      )}
      
      <button
        onClick={() => {/* Sync with Nova Lab */}}
        className="px-3 py-1.5 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors"
      >
        🔄 Sync Event Planner
      </button>
      
      <button
        onClick={() => {/* Production planning */}}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        📋 Plan Production
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <PanelShell title="Menu & Recipes" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="animate-pulse text-muted">Loading menu data...</div>
        </div>
      </PanelShell>
    );
  }

  if (!menuCollection) {
    return (
      <PanelShell title="Menu & Recipes" toolbarRight={toolbarRight}>
        <div className="glass-panel p-8 text-center">
          <div className="text-err">Menu collection not found</div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title={`Menu & Recipes — ${menuCollection.name}`} toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Menu Overview */}
        <div className="glass-panel p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-muted">Status</div>
              <div className={`text-lg font-bold capitalize ${
                menuCollection.status === 'approved' ? 'text-ok' : 'text-warn'
              }`}>
                {menuCollection.status}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Items</div>
              <div className="text-lg font-bold text-primary">{menuCollection.totalItems}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Avg Cost/Person</div>
              <div className="text-lg font-bold text-accent">${menuCollection.averageCostPerPerson.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted">Missing Recipes</div>
              <div className={`text-lg font-bold ${missingRecipeCount > 0 ? 'text-err' : 'text-ok'}`}>
                {missingRecipeCount}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted">{menuCollection.description}</div>
        </div>

        {/* Echo AI Analysis */}
        <EchoAiInsights analysis={echoAnalysis} />

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="p-2 bg-panel border border-default rounded-lg text-sm"
            >
              <option value="all">All Sections</option>
              {menuCollection.sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name} ({section.items.length})
                </option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyMissing}
                onChange={(e) => setShowOnlyMissing(e.target.checked)}
                className="rounded"
              />
              Show only missing recipes
            </label>
          </div>
          
          <button
            onClick={() => {/* Add new item */}}
            className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            + Add Menu Item
          </button>
        </div>

        {/* Menu Items */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <div className="text-muted">
                {showOnlyMissing ? 'No missing recipes found' : 'No menu items found'}
              </div>
            </div>
          ) : (
            filteredItems.map(item => {
              const recipe = recipes.find(r => r.id === item.recipeId);
              return (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  recipe={recipe}
                  eventConnection={eventConnection}
                  onLinkRecipe={handleLinkRecipe}
                  onUpdateBuffer={handleUpdateBuffer}
                />
              );
            })
          )}
        </div>
      </div>
    </PanelShell>
  );
};

export default MenuRecipePanel;
