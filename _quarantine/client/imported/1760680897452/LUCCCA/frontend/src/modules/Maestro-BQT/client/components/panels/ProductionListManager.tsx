/**
 * Production List Manager - Maestro Banquets
 * Automated generation of daily production lists, pull lists, and prep schedules
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Clock, Users, CheckCircle, AlertCircle, Download,
  Printer, RefreshCw, Plus, Edit3, Trash2, Eye, Settings,
  ChefHat, Utensils, Scale, Timer, Target, BarChart3,
  ClipboardList, ShoppingCart, AlertTriangle, TrendingUp, Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { CartTrackerPanel } from './CartTrackerPanel';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { useBEOStore } from '../../stores/beoStore';
import type { 
  ProductionList, 
  ProductionItem, 
  PullList, 
  PullListItem,
  Recipe,
  ScaledIngredient,
  KitchenEvent
} from '../../types/chef-kitchen';

interface ProductionListManagerProps {
  venueId?: string;
  selectedDate?: Date;
  chefId?: string;
}

// Mock data for demonstration
const mockProductionList: ProductionList = {
  id: 'pl-001',
  date: '2024-09-04',
  shift: 'afternoon',
  venue: 'Arrabelle Ballrooms',
  chefResponsible: 'Chef Johnson',
  events: [],
  totalGuestCount: 237,
  generatedAt: '2024-09-04T08:00:00Z',
  status: 'approved',
  items: [
    {
      id: 'pi-001',
      menuItemName: 'Organic Greens Salad',
      recipe: {
        id: 'recipe-001',
        name: 'Organic Greens Salad with Lemon Olive Oil',
        baseYield: 10,
        category: 'salad',
        difficulty: 2,
        prepTimeMinutes: 45,
        cookTimeMinutes: 0,
        ingredients: [],
        instructions: [],
        costPerServing: 4.50,
        allergenInfo: [],
        dietaryTags: ['vegetarian', 'gluten-free'],
        equipment: ['salad_spinner', 'mixing_bowls'],
        techniques: ['washing', 'chopping', 'mixing'],
        qualityStandards: ['fresh_greens', 'proper_seasoning'],
        platingInstructions: 'Arrange greens in chilled bowls, drizzle dressing'
      },
      totalQuantity: 87,
      batchSize: 20,
      numberOfBatches: 5,
      ingredients: [
        {
          id: 'ing-001',
          name: 'Organic Mixed Greens',
          amount: 2,
          unit: 'lbs',
          scaledAmount: 17.4,
          scaledCost: 78.30,
          costPerUnit: 4.50,
          availableInventory: 20,
          needsToPurchase: 0,
          purchaseUrgency: 'normal',
          criticalIngredient: true
        }
      ],
      totalPrepTime: 195,
      totalCookTime: 0,
      station: {
        id: 'station-cold',
        name: 'Cold Station',
        type: 'cold',
        capacity: 40,
        equipment: ['salad_spinner', 'mixing_bowls'],
        currentLoad: 25
      },
      startTime: '14:00',
      targetCompletionTime: '17:15',
      actualCompletionTime: undefined
    },
    {
      id: 'pi-002',
      menuItemName: 'Rocky Mountain Taco Bar Setup',
      recipe: {
        id: 'recipe-002',
        name: 'Rocky Mountain Taco Bar',
        baseYield: 25,
        category: 'entree',
        difficulty: 4,
        prepTimeMinutes: 240,
        cookTimeMinutes: 180,
        ingredients: [],
        instructions: [],
        costPerServing: 18.75,
        allergenInfo: ['shellfish'],
        dietaryTags: ['gluten-free-option'],
        equipment: ['grill', 'food_processor', 'mixing_bowls'],
        techniques: ['grilling', 'marinating', 'chopping'],
        qualityStandards: ['proper_temperature', 'fresh_garnishes'],
        platingInstructions: 'Arrange station with proteins, tortillas, and garnishes'
      },
      totalQuantity: 150,
      batchSize: 50,
      numberOfBatches: 3,
      ingredients: [
        {
          id: 'ing-002',
          name: 'Duck Breast',
          amount: 8,
          unit: 'lbs',
          scaledAmount: 48,
          scaledCost: 576.00,
          costPerUnit: 12.00,
          availableInventory: 30,
          needsToPurchase: 18,
          purchaseUrgency: 'urgent',
          criticalIngredient: true
        }
      ],
      totalPrepTime: 720,
      totalCookTime: 540,
      station: {
        id: 'station-grill',
        name: 'Grill Station',
        type: 'grill',
        capacity: 60,
        equipment: ['grill', 'thermometer'],
        currentLoad: 45
      },
      startTime: '12:00',
      targetCompletionTime: '18:00',
      actualCompletionTime: undefined
    }
  ]
};

const mockPullList: PullList = {
  id: 'pull-001',
  date: '2024-09-04',
  venue: 'Arrabelle Ballrooms',
  shift: 'morning',
  generatedAt: '2024-09-04T06:00:00Z',
  totalCost: 654.30,
  status: 'pending',
  ingredients: [
    {
      ingredientId: 'ing-001',
      name: 'Organic Mixed Greens',
      totalAmount: 17.4,
      unit: 'lbs',
      storageLocation: 'Walk-in Cooler A',
      currentInventory: 20,
      costPerUnit: 4.50,
      totalCost: 78.30,
      supplier: 'Fresh Valley Farms',
      expirationDates: ['2024-09-06', '2024-09-07'],
      lotNumbers: ['LOT001', 'LOT002'],
      pulled: false
    },
    {
      ingredientId: 'ing-002',
      name: 'Duck Breast',
      totalAmount: 48,
      unit: 'lbs',
      storageLocation: 'Freezer B',
      currentInventory: 30,
      costPerUnit: 12.00,
      totalCost: 576.00,
      supplier: 'Premium Poultry Co.',
      expirationDates: ['2024-09-15'],
      lotNumbers: ['DP2024001'],
      pulled: false
    }
  ]
};

const ProductionItemCard: React.FC<{
  item: ProductionItem;
  onUpdateStatus: (id: string, status: string) => void;
  onChangeStation?: (id: string, type: ProductionItem['station']['type']) => void;
}> = ({ item, onUpdateStatus, onChangeStation }) => {
  const completionPercentage = item.actualCompletionTime ? 100 : 
    item.targetCompletionTime ? Math.min((Date.now() - new Date(`2024-09-04T${item.startTime}`).getTime()) / 
    (new Date(`2024-09-04T${item.targetCompletionTime}`).getTime() - new Date(`2024-09-04T${item.startTime}`).getTime()) * 100, 100) : 0;

  const isOverdue = !item.actualCompletionTime && 
    new Date() > new Date(`2024-09-04T${item.targetCompletionTime}`);

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-200",
      item.actualCompletionTime ? "border-l-green-500 bg-green-50 dark:bg-green-950/20" :
      isOverdue ? "border-l-red-500 bg-red-50 dark:bg-red-950/20" :
      "border-l-blue-500"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold">{item.menuItemName}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {item.totalQuantity} portions
              </div>
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {item.numberOfBatches} batches
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.ceil(item.totalPrepTime / 60)}h prep
              </div>
            </div>
            <Badge variant={item.recipe.difficulty >= 4 ? 'destructive' : 'outline'}>
              Difficulty: {item.recipe.difficulty}/5
            </Badge>
          </div>
          
          <div className="text-right space-y-2">
            <div className="text-sm">
              <div className="font-medium">{item.startTime} - {item.targetCompletionTime}</div>
              <div className="text-muted-foreground">{item.station.name}</div>
            </div>
            {onChangeStation && (
              <Select onValueChange={(v:any)=>onChangeStation(item.id, v)}>
                <SelectTrigger className="h-8 w-40 ml-auto">
                  <SelectValue placeholder="Move to station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prep">Production Kitchen</SelectItem>
                  <SelectItem value="saucier">Saucier</SelectItem>
                  <SelectItem value="garde_manger">Garde Manger</SelectItem>
                  <SelectItem value="hot_line">Hot Kitchen</SelectItem>
                  <SelectItem value="pastry">Pastry & Baking</SelectItem>
                </SelectContent>
              </Select>
            )}
            {item.actualCompletionTime ? (
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            ) : isOverdue ? (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            ) : (
              <Badge variant="outline">
                In Progress
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
          <Progress 
            value={completionPercentage} 
            className={cn(
              isOverdue ? "progress-error" : 
              completionPercentage === 100 ? "progress-success" : ""
            )}
          />
        </div>

        {/* Critical Ingredients Alert */}
        {item.ingredients.some(ing => ing.needsToPurchase > 0) && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Missing ingredients: {item.ingredients.filter(ing => ing.needsToPurchase > 0).map(ing => ing.name).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Recipe Details Summary */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <div className="text-sm font-medium">Dietary Tags</div>
            <div className="text-xs text-muted-foreground">
              {item.recipe.dietaryTags.join(', ') || 'None'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Allergens</div>
            <div className="text-xs text-muted-foreground">
              {item.recipe.allergenInfo.join(', ') || 'None'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Equipment</div>
            <div className="text-xs text-muted-foreground">
              {item.recipe.equipment.slice(0, 2).join(', ')}
              {item.recipe.equipment.length > 2 && ` +${item.recipe.equipment.length - 2} more`}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Cost per Serving</div>
            <div className="text-xs text-muted-foreground">
              ${item.recipe.costPerServing.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Eye className="h-3 w-3 mr-1" />
            Recipe
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <ClipboardList className="h-3 w-3 mr-1" />
            Checklist
          </Button>
          {!item.actualCompletionTime && (
            <Button 
              size="sm" 
              variant="default"
              onClick={() => onUpdateStatus(item.id, 'completed')}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PullListTable: React.FC<{ 
  pullList: PullList;
  onTogglePulled: (ingredientId: string) => void;
}> = ({ pullList, onTogglePulled }) => {
  const pulledCount = pullList.ingredients.filter(item => item.pulled).length;
  const totalCount = pullList.ingredients.length;
  const completionPercentage = (pulledCount / totalCount) * 100;

  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ingredient Pull List</CardTitle>
            <p className="text-sm text-muted-foreground">
              {pullList.date} • {pullList.shift} shift • ${pullList.totalCost.toFixed(2)} total
            </p>
          </div>
          <div className="text-right space-y-2">
            <Badge variant={pullList.status === 'verified' ? 'default' : 'outline'}>
              {pullList.status.replace('_', ' ')}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {pulledCount}/{totalCount} pulled ({Math.round(completionPercentage)}%)
            </div>
          </div>
        </div>
        <Progress value={completionPercentage} />
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">✓</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pullList.ingredients.map((item) => (
                <TableRow 
                  key={item.ingredientId}
                  className={cn(
                    item.pulled ? "bg-green-50 dark:bg-green-950/20" : "",
                    item.currentInventory < item.totalAmount ? "border-l-4 border-l-red-500" : ""
                  )}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTogglePulled(item.ingredientId)}
                      className={cn(
                        "w-8 h-8 p-0",
                        item.pulled ? "text-green-600" : "text-muted-foreground"
                      )}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.supplier}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.totalAmount} {item.unit}</div>
                    {item.pulled && item.pulledAmount && (
                      <div className="text-xs text-green-600">
                        Pulled: {item.pulledAmount} {item.unit}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{item.storageLocation}</TableCell>
                  <TableCell>
                    <div className={cn(
                      "font-medium",
                      item.currentInventory < item.totalAmount ? "text-red-600" : "text-green-600"
                    )}>
                      {item.currentInventory} {item.unit}
                    </div>
                    {item.currentInventory < item.totalAmount && (
                      <div className="text-xs text-red-600">
                        Short: {item.totalAmount - item.currentInventory} {item.unit}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>${item.totalCost.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {item.expirationDates.length > 0 && (
                        <div>Exp: {item.expirationDates[0]}</div>
                      )}
                      {item.lotNumbers.length > 0 && (
                        <div>Lot: {item.lotNumbers[0]}</div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print List
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="default" disabled={completionPercentage < 100}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Complete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProductionListManager: React.FC<ProductionListManagerProps> = ({
  venueId,
  selectedDate = new Date(),
  chefId
}) => {
  const [productionList, setProductionList] = useState<ProductionList>(mockProductionList);
  const [pullList, setPullList] = useState<PullList>(mockPullList);
  const [activeTab, setActiveTab] = useState('production');
  const [isGenerating, setIsGenerating] = useState(false);
  const [groupByStation, setGroupByStation] = useState(true);
  const [customStations, setCustomStations] = useState<string[]>([]);
  const [newStationName, setNewStationName] = useState('');
  const { events, beos } = useBEOStore();
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const handleUpdateItemStatus = (itemId: string, status: string) => {
    setProductionList(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, actualCompletionTime: status === 'completed' ? new Date().toISOString() : undefined }
          : item
      )
    }));
  };

  const handleTogglePulled = (ingredientId: string) => {
    setPullList(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(item =>
        item.ingredientId === ingredientId
          ? { 
              ...item, 
              pulled: !item.pulled,
              pulledAmount: !item.pulled ? item.totalAmount : undefined,
              pulledAt: !item.pulled ? new Date().toISOString() : undefined
            }
          : item
      )
    }));
  };

  const handleGenerateProductionList = async () => {
    if (selectedEventIds.length > 0) {
      await generateFromSelectedEvents();
      return;
    }
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsGenerating(false);
  };

  const completedItems = productionList.items.filter(item => item.actualCompletionTime).length;
  const totalItems = productionList.items.length;
  const productionProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const todayBanner = useMemo(() => {
    if (totalItems === 0) return null;
    const isComplete = productionProgress >= 100;
    return (
      <Alert className={cn(
        isComplete ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
      )}>
        {isComplete ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription className={cn(isComplete ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200')}>
          {isComplete ? 'All prep complete for today.' : `${totalItems - completedItems} item(s) remaining for today.`}
        </AlertDescription>
      </Alert>
    );
  }, [totalItems, completedItems, productionProgress]);

  const stationLabel = (type: ProductionItem['station']['type']) => {
    switch (type) {
      case 'prep': return 'Production Kitchen';
      case 'saucier': return 'Saucier';
      case 'garde_manger': return 'Garde Manger';
      case 'hot_line': return 'Hot Kitchen';
      case 'pastry': return 'Pastry & Baking';
      default: return 'Other';
    }
  };

  const assignStationForCategory = (category: string): { id: string; name: string; type: any } => {
    const map: Record<string, { id: string; name: string; type: any }> = {
      salad: { id: 'station-gm', name: 'Garde Manger', type: 'garde_manger' },
      appetizer: { id: 'station-prep', name: 'Production Kitchen', type: 'prep' },
      entree: { id: 'station-hot', name: 'Hot Kitchen', type: 'hot_line' },
      side: { id: 'station-hot', name: 'Hot Kitchen', type: 'hot_line' },
      dessert: { id: 'station-pastry', name: 'Pastry & Baking', type: 'pastry' },
      sauce: { id: 'station-saucier', name: 'Saucier', type: 'saucier' },
      station: { id: 'station-prep', name: 'Production Kitchen', type: 'prep' }
    };
    return map[category] || { id: 'station-prep', name: 'Production Kitchen', type: 'prep' };
  };

  const convertBeoRecipe = (r?: import('../../types/beo').Recipe): Recipe | undefined => {
    if (!r) return undefined;
    return {
      id: r.id,
      name: r.name,
      baseYield: r.yield,
      category: 'custom',
      difficulty: r.complexity as any,
      prepTimeMinutes: r.prepTimeMinutes,
      cookTimeMinutes: r.cookTimeMinutes,
      ingredients: [],
      instructions: [],
      costPerServing: 0,
      allergenInfo: [],
      dietaryTags: [],
      equipment: r.equipment,
      techniques: [],
      qualityStandards: [],
      platingInstructions: ''
    };
  };

  const eventsForSelection = useMemo(() => {
    const dayStr = selectedDate.toISOString().split('T')[0];
    return events.filter(e => e.date === dayStr);
  }, [events, selectedDate]);

  const generateFromSelectedEvents = async () => {
    setIsGenerating(true);
    const selected = eventsForSelection.filter(e => selectedEventIds.includes(e.id));
    const newItems: ProductionItem[] = [];

    for (const ev of selected) {
      let menuItems: import('../../types/beo').BEOMenuItem[] = [];
      if ((ev as any).beoId && (beos as any)[(ev as any).beoId]) {
        menuItems = (beos as any)[(ev as any).beoId].menu.items || [];
      }
      if (menuItems.length === 0) {
        if (ev.type === 'wedding') {
          menuItems = [
            { id: 'organic-greens-salad', name: 'Organic Greens Salad', category: 'salad', course: 2, quantity: ev.guestCount } as any,
            { id: 'rocky-mountain-taco-bar', name: 'Rocky Mountain Taco Bar', category: 'entree', course: 3, quantity: ev.guestCount } as any
          ];
        } else if (ev.type === 'corporate') {
          menuItems = [
            { id: 'organic-greens-salad', name: 'Organic Greens Salad', category: 'salad', course: 2, quantity: ev.guestCount } as any
          ];
        } else {
          menuItems = [
            { id: 'organic-greens-salad', name: 'Organic Greens Salad', category: 'salad', course: 2, quantity: ev.guestCount } as any
          ];
        }
      }

      for (const mi of menuItems) {
        const recipe = convertBeoRecipe(mi.recipe) || {
          id: mi.id,
          name: mi.name,
          baseYield: mi.category === 'entree' ? 25 : 10,
          category: mi.category as any,
          difficulty: 3,
          prepTimeMinutes: mi.category === 'entree' ? 240 : 45,
          cookTimeMinutes: mi.category === 'entree' ? 180 : 0,
          ingredients: [],
          instructions: [],
          costPerServing: 0,
          allergenInfo: [],
          dietaryTags: [],
          equipment: [],
          techniques: [],
          qualityStandards: [],
          platingInstructions: ''
        } as Recipe;

        const totalQty = (mi as any).quantity || ev.guestCount;
        const batchSize = recipe.baseYield || 10;
        const numberOfBatches = Math.max(1, Math.ceil(totalQty / batchSize));
        const station = assignStationForCategory(mi.category as any);

        newItems.push({
          id: `${ev.id}-${mi.id}`,
          menuItemName: mi.name,
          recipe,
          totalQuantity: totalQty,
          batchSize,
          numberOfBatches,
          ingredients: [],
          totalPrepTime: recipe.prepTimeMinutes * numberOfBatches,
          totalCookTime: recipe.cookTimeMinutes * numberOfBatches,
          station: {
            id: station.id,
            name: station.name,
            type: station.type,
            capacity: 40,
            equipment: [],
            currentLoad: 0
          },
          startTime: '12:00',
          targetCompletionTime: '17:00'
        });
      }
    }

    setProductionList(prev => ({
      ...prev,
      items: newItems,
      totalGuestCount: selected.reduce((sum, e) => sum + e.guestCount, 0),
      date: selectedDate.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      status: 'in_progress'
    }));
    setIsGenerating(false);
  };

  const groupedByStation = useMemo(() => {
    const groups: Record<string, ProductionItem[]> = {};
    for (const item of productionList.items) {
      const key = item.station.type as string;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [productionList.items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Production Management</h1>
          <p className="text-muted-foreground">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} • {productionList.venue}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Select BEOs
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-2">
                <div className="text-sm font-medium">Today's Events</div>
                <div className="max-h-60 overflow-auto space-y-2">
                  {eventsForSelection.map(ev => (
                    <label key={ev.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedEventIds.includes(ev.id)}
                        onCheckedChange={(v:any)=>{
                          setSelectedEventIds(prev => v ? [...prev, ev.id] : prev.filter(id=>id!==ev.id));
                        }}
                      />
                      <span className="flex-1">
                        <span className="font-medium">{ev.title}</span>
                        <span className="text-muted-foreground"> • {ev.time}</span>
                      </span>
                      {!ev.acknowledged && <Badge variant="destructive">Unacked</Badge>}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" size="sm" onClick={generateFromSelectedEvents} disabled={isGenerating || selectedEventIds.length===0}>
                    <Target className="h-4 w-4 mr-2" /> Generate Lists
                  </Button>
                  <Button variant="outline" size="sm" onClick={()=>setSelectedEventIds([])}>Clear</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={handleGenerateProductionList}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Regenerate Lists'}
          </Button>

          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print All
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Daily Notification */}
      {todayBanner}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <ClipboardList className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalItems}</div>
                <div className="text-sm text-muted-foreground">Production Items</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedItems}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{productionList.totalGuestCount}</div>
                <div className="text-sm text-muted-foreground">Total Guests</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">${pullList.totalCost.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Ingredient Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Progress */}
      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Overall Production Progress</h3>
            <span className="text-sm text-muted-foreground">
              {completedItems}/{totalItems} items ({Math.round(productionProgress)}%)
            </span>
          </div>
          <Progress value={productionProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Station grouping and custom stations */}
      <Card className="glass-panel">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="text-sm font-medium mr-2">Group by Station</div>
          <Button size="sm" variant={groupByStation ? 'default' : 'outline'} onClick={()=>setGroupByStation(!groupByStation)}>
            {groupByStation ? 'On' : 'Off'}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Input placeholder="Add station" value={newStationName} onChange={(e)=>setNewStationName(e.target.value)} className="h-8 w-48" />
            <Button size="sm" variant="outline" onClick={()=>{
              if(!newStationName.trim()) return;
              setCustomStations(prev=>[...prev, newStationName.trim()]);
              setNewStationName('');
            }}>Add</Button>
            {customStations.length>0 && (
              <div className="text-xs text-muted-foreground">Custom: {customStations.join(', ')}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="production">Production Lists</TabsTrigger>
          <TabsTrigger value="pull">Pull Lists</TabsTrigger>
          <TabsTrigger value="carts">Cart Tracker</TabsTrigger>
          <TabsTrigger value="costing">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-6">
          {!groupByStation && (
            <div className="grid gap-6">
              {productionList.items.map(item => (
                <ProductionItemCard
                  key={item.id}
                  item={item}
                  onUpdateStatus={handleUpdateItemStatus}
                  onChangeStation={(id, type)=>{
                    setProductionList(prev=>({
                      ...prev,
                      items: prev.items.map(it => it.id===id ? { ...it, station: { ...it.station, type, name: type==='prep'?'Production Kitchen': type==='saucier'?'Saucier': type==='garde_manger'?'Garde Manger': type==='hot_line'?'Hot Kitchen': type==='pastry'?'Pastry & Baking': it.station.name } } : it)
                    }));
                  }}
                />
              ))}
            </div>
          )}

          {groupByStation && (
            <div className="space-y-6">
              {Object.entries(groupedByStation).map(([type, items]) => (
                <div key={type} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{stationLabel(type as any)}</h4>
                    <Badge variant="outline" className="text-xs">{items.length} items</Badge>
                  </div>
                  <div className="grid gap-4">
                    {items.map(item => (
                      <ProductionItemCard
                        key={item.id}
                        item={item}
                        onUpdateStatus={handleUpdateItemStatus}
                        onChangeStation={(id, type)=>{
                          setProductionList(prev=>({
                            ...prev,
                            items: prev.items.map(it => it.id===id ? { ...it, station: { ...it.station, type, name: type==='prep'?'Production Kitchen': type==='saucier'?'Saucier': type==='garde_manger'?'Garde Manger': type==='hot_line'?'Hot Kitchen': type==='pastry'?'Pastry & Baking': it.station.name } } : it)
                          }));
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {productionList.items.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Production Items</h3>
              <p className="text-muted-foreground mb-4">
                Generate production lists from scheduled events.
              </p>
              <Button onClick={handleGenerateProductionList} disabled={isGenerating}>
                <Target className="h-4 w-4 mr-2" />
                Generate Production Lists
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pull" className="space-y-6">
          <PullListTable
            pullList={pullList}
            onTogglePulled={handleTogglePulled}
          />
        </TabsContent>

        <TabsContent value="carts" className="space-y-6">
          <CartTrackerPanel />
        </TabsContent>

        <TabsContent value="costing" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Cost Analysis</h3>
                <p className="text-muted-foreground">
                  Detailed cost breakdown and variance analysis coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionListManager;
