import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileText,
  Bot,
  Wand2,
  Download,
  Eye,
  DollarSign,
  Users,
  Clock,
  ChefHat,
  Utensils,
  Wine,
  Coffee,
  Cake,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Zap,
  Target,
  Calendar,
  MapPin,
  Building2,
  Settings,
  Sparkles,
  Brain,
  TrendingUp,
  Save,
  Send,
  Plus,
  Minus,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Types for the menu-to-BEO system
interface ParsedMenuData {
  id: string;
  name: string;
  categories: MenuCategory[];
  metadata: {
    venue: string;
    cuisine: string[];
    serviceStyle: string[];
    dietaryOptions: string[];
    priceRange: { min: number; max: number };
  };
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
  serviceStyle?: 'buffet' | 'plated' | 'family_style' | 'action_station';
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  dietary: string[];
  allergens: string[];
  servingSize: string;
  preparationTime: number;
  kitchenNotes?: string;
  popularity: number;
  seasonalAvailability?: string[];
  upsellPotential: number;
}

interface EventDetails {
  name: string;
  guestCount: number;
  eventType: 'corporate' | 'wedding' | 'social' | 'conference';
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  budget?: number;
  dietaryRestrictions: string[];
  alcoholPolicy: 'none' | 'beer_wine' | 'full_bar' | 'signature_only';
  serviceStyle: 'buffet' | 'plated' | 'family_style' | 'cocktail_reception';
  specialRequests?: string;
}

interface BeoLineItem {
  id: string;
  category: 'food' | 'beverage' | 'service' | 'equipment' | 'labor';
  name: string;
  description: string;
  quantity: number;
  unit: 'per_person' | 'each' | 'hour' | 'package';
  unitPrice: number;
  totalPrice: number;
  kitchenNotes?: string;
  serviceNotes?: string;
  timing?: string;
  isOptional: boolean;
  alternatives?: BeoLineItem[];
}

interface GeneratedBeo {
  id: string;
  eventDetails: EventDetails;
  lineItems: BeoLineItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
  timeline: TimelineItem[];
  kitchenInstructions: string[];
  serviceInstructions: string[];
  setupRequirements: string[];
  aiRecommendations: AIRecommendation[];
  generatedAt: Date;
}

interface TimelineItem {
  time: string;
  action: string;
  department: 'kitchen' | 'service' | 'setup' | 'bar';
  notes?: string;
}

interface AIRecommendation {
  type: 'menu_optimization' | 'cost_savings' | 'upsell' | 'logistics' | 'compliance';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savings?: number;
  reasoning: string;
  actionRequired: boolean;
}

// AI Intelligence Engine for BEO Generation
class BeoAIEngine {
  static generateBeoFromMenu(
    parsedMenu: ParsedMenuData, 
    eventDetails: EventDetails,
    selectedItems: string[]
  ): GeneratedBeo {
    const lineItems: BeoLineItem[] = [];
    const aiRecommendations: AIRecommendation[] = [];
    
    // AI Logic: Filter menu items based on event type and context
    const contextualItems = this.applyEventContextLogic(parsedMenu, eventDetails, selectedItems);
    
    // Generate line items with AI pricing optimization
    contextualItems.forEach(item => {
      const lineItem = this.convertMenuItemToBeoLine(item, eventDetails);
      lineItems.push(lineItem);
    });

    // AI Compliance Checks
    const complianceChecks = this.performComplianceChecks(lineItems, eventDetails);
    aiRecommendations.push(...complianceChecks);

    // AI Cost Optimization
    const costOptimizations = this.generateCostOptimizations(lineItems, eventDetails);
    aiRecommendations.push(...costOptimizations);

    // AI Upsell Opportunities
    const upsellOpportunities = this.identifyUpsellOpportunities(lineItems, eventDetails);
    aiRecommendations.push(...upsellOpportunities);

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const serviceCharge = subtotal * 0.22; // 22% service charge
    const tax = (subtotal + serviceCharge) * 0.085; // 8.5% tax
    const total = subtotal + serviceCharge + tax;

    // Generate timeline
    const timeline = this.generateEventTimeline(lineItems, eventDetails);

    // Generate instructions
    const kitchenInstructions = this.generateKitchenInstructions(lineItems, eventDetails);
    const serviceInstructions = this.generateServiceInstructions(lineItems, eventDetails);
    const setupRequirements = this.generateSetupRequirements(lineItems, eventDetails);

    return {
      id: `BEO-${Date.now()}`,
      eventDetails,
      lineItems,
      subtotal,
      serviceCharge,
      tax,
      total,
      timeline,
      kitchenInstructions,
      serviceInstructions,
      setupRequirements,
      aiRecommendations,
      generatedAt: new Date()
    };
  }

  private static applyEventContextLogic(
    menu: ParsedMenuData, 
    event: EventDetails, 
    selectedItems: string[]
  ): MenuItem[] {
    let items = menu.categories
      .flatMap(cat => cat.items)
      .filter(item => selectedItems.includes(item.id));

    // AI Context Logic
    if (event.eventType === 'corporate') {
      // Remove alcohol if policy doesn't allow
      if (event.alcoholPolicy === 'none') {
        items = items.filter(item => !this.isAlcoholicItem(item));
      }
      
      // Prioritize professional, efficient items
      items = items.filter(item => item.name.toLowerCase().includes('professional') || 
                                  item.preparationTime <= 30 ||
                                  item.popularity >= 7);
    }

    if (event.eventType === 'wedding') {
      // Prioritize elegant, memorable items
      items = items.filter(item => item.upsellPotential >= 6 || 
                                  item.name.toLowerCase().includes('premium') ||
                                  item.popularity >= 8);
    }

    // Filter by dietary restrictions
    if (event.dietaryRestrictions.length > 0) {
      // Ensure adequate options for dietary restrictions
      event.dietaryRestrictions.forEach(restriction => {
        const restrictionItems = items.filter(item => 
          item.dietary.includes(restriction.toLowerCase())
        );
        if (restrictionItems.length < 2) {
          // AI suggests adding more options
          // This would be implemented with real menu data
        }
      });
    }

    return items;
  }

  private static convertMenuItemToBeoLine(item: MenuItem, event: EventDetails): BeoLineItem {
    const quantity = event.guestCount;
    const unitPrice = this.calculateOptimalPricing(item, event);
    
    return {
      id: `line-${item.id}`,
      category: this.getCategoryFromMenuItem(item),
      name: item.name,
      description: item.description,
      quantity,
      unit: 'per_person',
      unitPrice,
      totalPrice: quantity * unitPrice,
      kitchenNotes: item.kitchenNotes,
      timing: this.calculateServiceTiming(item, event),
      isOptional: false,
      alternatives: []
    };
  }

  private static calculateOptimalPricing(item: MenuItem, event: EventDetails): number {
    let price = item.price;
    
    // AI Dynamic Pricing Logic
    if (event.eventType === 'corporate' && event.guestCount > 100) {
      price *= 0.95; // Volume discount for large corporate events
    }
    
    if (event.eventType === 'wedding') {
      price *= 1.1; // Premium pricing for weddings
    }
    
    // Time-based pricing
    const eventHour = parseInt(event.startTime.split(':')[0]);
    if (eventHour >= 18) { // Evening events
      price *= 1.05;
    }
    
    return Math.round(price * 100) / 100;
  }

  private static performComplianceChecks(items: BeoLineItem[], event: EventDetails): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Alcohol compliance check
    if (event.eventType === 'corporate') {
      const alcoholItems = items.filter(item => 
        item.name.toLowerCase().includes('wine') || 
        item.name.toLowerCase().includes('beer') ||
        item.name.toLowerCase().includes('alcohol')
      );
      
      if (alcoholItems.length > 0 && event.alcoholPolicy === 'none') {
        recommendations.push({
          type: 'compliance',
          title: 'Corporate Alcohol Policy Violation',
          description: 'Alcohol items detected for corporate event with no-alcohol policy. Consider premium beverage alternatives.',
          impact: 'high',
          reasoning: 'Many corporations have strict no-alcohol policies for business events',
          actionRequired: true
        });
      }
    }

    // Dietary restriction compliance
    if (event.dietaryRestrictions.length > 0) {
      const vegetarianOptions = items.filter(item => 
        item.name.toLowerCase().includes('vegetarian') ||
        item.description.toLowerCase().includes('vegetarian')
      ).length;
      
      if (vegetarianOptions < 2 && event.dietaryRestrictions.includes('vegetarian')) {
        recommendations.push({
          type: 'compliance',
          title: 'Insufficient Vegetarian Options',
          description: 'Add more vegetarian menu items to meet dietary requirements',
          impact: 'medium',
          reasoning: 'Recommended minimum 2-3 vegetarian options for events with dietary restrictions',
          actionRequired: true
        });
      }
    }

    return recommendations;
  }

  private static generateCostOptimizations(items: BeoLineItem[], event: EventDetails): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const perPersonCost = total / event.guestCount;

    // Budget optimization
    if (event.budget && total > event.budget * 0.9) {
      recommendations.push({
        type: 'cost_savings',
        title: 'Budget Optimization Opportunity',
        description: 'Current selection exceeds 90% of budget. Consider alternative items or service styles.',
        impact: 'high',
        savings: total - event.budget,
        reasoning: 'Staying within budget ensures client satisfaction and repeat business',
        actionRequired: true
      });
    }

    // Efficiency recommendations
    if (perPersonCost > 75 && event.eventType === 'corporate') {
      recommendations.push({
        type: 'cost_savings',
        title: 'Corporate Cost Efficiency',
        description: 'Consider buffet service or lunch options to reduce per-person costs while maintaining quality',
        impact: 'medium',
        savings: perPersonCost * 0.2 * event.guestCount,
        reasoning: 'Corporate events often prioritize efficiency and cost-effectiveness',
        actionRequired: false
      });
    }

    return recommendations;
  }

  private static identifyUpsellOpportunities(items: BeoLineItem[], event: EventDetails): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Service upgrades
    if (event.serviceStyle === 'buffet' && event.eventType === 'wedding') {
      recommendations.push({
        type: 'upsell',
        title: 'Premium Plated Service Upgrade',
        description: 'Enhance the wedding experience with elegant plated service',
        impact: 'high',
        reasoning: 'Weddings benefit from personalized, elegant service presentation',
        actionRequired: false
      });
    }

    // Add-on services
    const hasBar = items.some(item => item.category === 'beverage' && item.name.toLowerCase().includes('bar'));
    if (!hasBar && event.alcoholPolicy !== 'none') {
      recommendations.push({
        type: 'upsell',
        title: 'Signature Cocktail Service',
        description: 'Add personalized cocktail service to enhance guest experience',
        impact: 'medium',
        reasoning: 'Signature cocktails create memorable experiences and increase revenue per guest',
        actionRequired: false
      });
    }

    return recommendations;
  }

  private static generateEventTimeline(items: BeoLineItem[], event: EventDetails): TimelineItem[] {
    const timeline: TimelineItem[] = [];
    const startTime = event.startTime;
    const eventStart = new Date(`2024-01-01T${startTime}:00`);
    
    // Setup timeline
    const setupStart = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
    timeline.push({
      time: setupStart.toTimeString().slice(0, 5),
      action: 'Begin venue setup and equipment placement',
      department: 'setup'
    });

    // Kitchen timeline
    const kitchenStart = new Date(eventStart.getTime() - 90 * 60 * 1000); // 1.5 hours before
    timeline.push({
      time: kitchenStart.toTimeString().slice(0, 5),
      action: 'Begin food preparation and cooking',
      department: 'kitchen'
    });

    // Service timeline
    timeline.push({
      time: startTime,
      action: 'Guest arrival and service begins',
      department: 'service'
    });

    return timeline.sort((a, b) => a.time.localeCompare(b.time));
  }

  private static generateKitchenInstructions(items: BeoLineItem[], event: EventDetails): string[] {
    const instructions: string[] = [];
    
    instructions.push(`Prepare for ${event.guestCount} guests`);
    instructions.push(`Event type: ${event.eventType} - adjust presentation accordingly`);
    
    if (event.dietaryRestrictions.length > 0) {
      instructions.push(`Special dietary requirements: ${event.dietaryRestrictions.join(', ')}`);
    }
    
    // Add item-specific instructions
    items.forEach(item => {
      if (item.kitchenNotes) {
        instructions.push(`${item.name}: ${item.kitchenNotes}`);
      }
    });

    return instructions;
  }

  private static generateServiceInstructions(items: BeoLineItem[], event: EventDetails): string[] {
    const instructions: string[] = [];
    
    instructions.push(`Service style: ${event.serviceStyle}`);
    instructions.push(`Guest count: ${event.guestCount}`);
    
    if (event.eventType === 'corporate') {
      instructions.push('Professional service - efficient and unobtrusive');
    } else if (event.eventType === 'wedding') {
      instructions.push('Premium service - elegant and attentive');
    }

    return instructions;
  }

  private static generateSetupRequirements(items: BeoLineItem[], event: EventDetails): string[] {
    const requirements: string[] = [];
    
    requirements.push(`Tables for ${event.guestCount} guests`);
    requirements.push(`${event.serviceStyle} setup configuration`);
    
    const hasBar = items.some(item => item.category === 'beverage');
    if (hasBar) {
      requirements.push('Bar setup with appropriate glassware');
    }

    return requirements;
  }

  // Helper methods
  private static isAlcoholicItem(item: MenuItem): boolean {
    const alcoholKeywords = ['wine', 'beer', 'cocktail', 'spirits', 'alcohol', 'bar', 'champagne'];
    return alcoholKeywords.some(keyword => 
      item.name.toLowerCase().includes(keyword) || 
      item.description.toLowerCase().includes(keyword)
    );
  }

  private static getCategoryFromMenuItem(item: MenuItem): BeoLineItem['category'] {
    if (this.isAlcoholicItem(item) || item.category.toLowerCase().includes('beverage')) {
      return 'beverage';
    }
    return 'food';
  }

  private static calculateServiceTiming(item: MenuItem, event: EventDetails): string {
    const startTime = event.startTime;
    const eventStart = new Date(`2024-01-01T${startTime}:00`);
    
    // Calculate service timing based on item type and preparation time
    const serviceTime = new Date(eventStart.getTime() + 30 * 60 * 1000); // 30 min after start
    return serviceTime.toTimeString().slice(0, 5);
  }
}

interface MenuToBeoGeneratorProps {
  onBeoGenerated?: (beo: GeneratedBeo) => void;
}

export default function MenuToBeoGenerator({ onBeoGenerated }: MenuToBeoGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'select' | 'details' | 'generate' | 'review'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedMenu, setParsedMenu] = useState<ParsedMenuData | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [eventDetails, setEventDetails] = useState<Partial<EventDetails>>({
    dietaryRestrictions: [],
    alcoholPolicy: 'beer_wine',
    serviceStyle: 'buffet'
  });
  const [generatedBeo, setGeneratedBeo] = useState<GeneratedBeo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Simulate menu upload and parsing
  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          
          // Mock parsed menu data
          const mockParsedMenu: ParsedMenuData = {
            id: 'menu-' + Date.now(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            categories: [
              {
                id: 'appetizers',
                name: 'Appetizers',
                items: [
                  {
                    id: 'app-1',
                    name: 'Seasonal Bruschetta Trio',
                    description: 'Artisanal bread with tomato basil, mushroom truffle, and goat cheese',
                    price: 14.50,
                    category: 'appetizers',
                    dietary: ['vegetarian'],
                    allergens: ['gluten', 'dairy'],
                    servingSize: '3 pieces',
                    preparationTime: 20,
                    popularity: 8,
                    upsellPotential: 7
                  },
                  {
                    id: 'app-2',
                    name: 'Smoked Salmon Canapés',
                    description: 'Norwegian smoked salmon on cucumber rounds with dill cream',
                    price: 18.75,
                    category: 'appetizers',
                    dietary: ['gluten-free'],
                    allergens: ['fish', 'dairy'],
                    servingSize: '4 pieces',
                    preparationTime: 15,
                    popularity: 9,
                    upsellPotential: 8
                  }
                ]
              },
              {
                id: 'entrees',
                name: 'Main Courses',
                items: [
                  {
                    id: 'ent-1',
                    name: 'Herb-Crusted Beef Tenderloin',
                    description: 'Premium beef with rosemary and thyme, red wine reduction',
                    price: 45.00,
                    category: 'entrees',
                    dietary: ['gluten-free'],
                    allergens: [],
                    servingSize: '8 oz',
                    preparationTime: 45,
                    popularity: 9,
                    upsellPotential: 9
                  },
                  {
                    id: 'ent-2',
                    name: 'Pan-Seared Salmon',
                    description: 'Atlantic salmon with lemon herb butter and seasonal vegetables',
                    price: 32.00,
                    category: 'entrees',
                    dietary: ['gluten-free'],
                    allergens: ['fish'],
                    servingSize: '6 oz',
                    preparationTime: 25,
                    popularity: 8,
                    upsellPotential: 7
                  },
                  {
                    id: 'ent-3',
                    name: 'Vegetarian Wellington',
                    description: 'Mushroom and spinach Wellington with roasted red pepper coulis',
                    price: 28.00,
                    category: 'entrees',
                    dietary: ['vegetarian'],
                    allergens: ['gluten', 'dairy'],
                    servingSize: '1 slice',
                    preparationTime: 40,
                    popularity: 7,
                    upsellPotential: 6
                  }
                ]
              },
              {
                id: 'beverages',
                name: 'Beverages',
                items: [
                  {
                    id: 'bev-1',
                    name: 'Premium Coffee Service',
                    description: 'Freshly brewed Colombian coffee with cream and sugar service',
                    price: 5.50,
                    category: 'beverages',
                    dietary: ['vegan-option'],
                    allergens: ['dairy'],
                    servingSize: 'per person',
                    preparationTime: 10,
                    popularity: 9,
                    upsellPotential: 4
                  },
                  {
                    id: 'bev-2',
                    name: 'House Wine Selection',
                    description: 'Curated selection of red and white wines',
                    price: 12.00,
                    category: 'beverages',
                    dietary: [],
                    allergens: ['sulfites'],
                    servingSize: 'per glass',
                    preparationTime: 5,
                    popularity: 8,
                    upsellPotential: 7
                  }
                ]
              }
            ],
            metadata: {
              venue: 'Grand Ballroom',
              cuisine: ['American', 'Mediterranean'],
              serviceStyle: ['buffet', 'plated'],
              dietaryOptions: ['vegetarian', 'gluten-free', 'vegan-option'],
              priceRange: { min: 5.50, max: 45.00 }
            }
          };

          setParsedMenu(mockParsedMenu);
          setCurrentStep('select');
          toast({
            title: "Menu Parsed Successfully",
            description: `Found ${mockParsedMenu.categories.length} categories with ${mockParsedMenu.categories.reduce((sum, cat) => sum + cat.items.length, 0)} items`,
          });
          
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);
  }, [toast]);

  const handleItemSelection = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => 
      selected 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleGenerateBeo = useCallback(async () => {
    if (!parsedMenu || selectedItems.length === 0 || !eventDetails.name) {
      toast({
        title: "Missing Information",
        description: "Please ensure all required fields are completed",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setCurrentStep('generate');

    // Simulate BEO generation with AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const beo = BeoAIEngine.generateBeoFromMenu(
      parsedMenu,
      eventDetails as EventDetails,
      selectedItems
    );

    setGeneratedBeo(beo);
    setIsGenerating(false);
    setCurrentStep('review');
    
    onBeoGenerated?.(beo);
    
    toast({
      title: "BEO Generated Successfully",
      description: `AI generated comprehensive BEO with ${beo.aiRecommendations.length} intelligent recommendations`,
    });
  }, [parsedMenu, selectedItems, eventDetails, onBeoGenerated, toast]);

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload Menu Document</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Upload a PDF, image, or text file containing your menu. Our AI will extract and analyze all items.
        </p>
      </div>

      <div
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById('menu-file-upload')?.click()}
      >
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          PDF, JPG, PNG, DOC up to 10MB
        </p>
        <input
          id="menu-file-upload"
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="h-5 w-5 animate-pulse text-primary" />
              <span className="font-medium">AI Processing Menu...</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Extracting items, analyzing prices, detecting dietary options...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span className="font-medium">Menu Parsed Successfully</span>
        <Badge>{parsedMenu?.categories.reduce((sum, cat) => sum + cat.items.length, 0)} items found</Badge>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-4">
          {parsedMenu?.categories.map(category => (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.items.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <Badge variant="outline">${item.price}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            Popularity: {item.popularity}/10
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.dietary.map(diet => (
                            <Badge key={diet} variant="outline" className="text-xs">
                              {diet}
                            </Badge>
                          ))}
                          {item.allergens.map(allergen => (
                            <Badge key={allergen} variant="destructive" className="text-xs">
                              {allergen}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="text-sm text-muted-foreground">
        Selected items: {selectedItems.length} | 
        Estimated total: ${parsedMenu?.categories
          .flatMap(cat => cat.items)
          .filter(item => selectedItems.includes(item.id))
          .reduce((sum, item) => sum + item.price, 0)
          .toFixed(2)
        } per person
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              value={eventDetails.name || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Corporate Annual Meeting"
            />
          </div>

          <div>
            <Label htmlFor="guest-count">Guest Count *</Label>
            <Input
              id="guest-count"
              type="number"
              value={eventDetails.guestCount || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, guestCount: parseInt(e.target.value) }))}
              placeholder="150"
            />
          </div>

          <div>
            <Label htmlFor="event-type">Event Type *</Label>
            <Select 
              value={eventDetails.eventType} 
              onValueChange={(value) => setEventDetails(prev => ({ ...prev, eventType: value as EventDetails['eventType'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corporate">Corporate Event</SelectItem>
                <SelectItem value="wedding">Wedding Reception</SelectItem>
                <SelectItem value="social">Social Event</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="alcohol-policy">Alcohol Policy</Label>
            <Select 
              value={eventDetails.alcoholPolicy} 
              onValueChange={(value) => setEventDetails(prev => ({ ...prev, alcoholPolicy: value as EventDetails['alcoholPolicy'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Alcohol</SelectItem>
                <SelectItem value="beer_wine">Beer & Wine Only</SelectItem>
                <SelectItem value="full_bar">Full Bar Service</SelectItem>
                <SelectItem value="signature_only">Signature Cocktails Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="event-date">Event Date *</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDetails.date || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="start-time">Start Time *</Label>
            <Input
              id="start-time"
              type="time"
              value={eventDetails.startTime || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, startTime: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="service-style">Service Style</Label>
            <Select 
              value={eventDetails.serviceStyle} 
              onValueChange={(value) => setEventDetails(prev => ({ ...prev, serviceStyle: value as EventDetails['serviceStyle'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buffet">Buffet Service</SelectItem>
                <SelectItem value="plated">Plated Service</SelectItem>
                <SelectItem value="family_style">Family Style</SelectItem>
                <SelectItem value="cocktail_reception">Cocktail Reception</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="budget">Budget (Optional)</Label>
            <Input
              id="budget"
              type="number"
              value={eventDetails.budget || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, budget: parseFloat(e.target.value) }))}
              placeholder="15000"
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Special Requests</Label>
        <Textarea
          value={eventDetails.specialRequests || ''}
          onChange={(e) => setEventDetails(prev => ({ ...prev, specialRequests: e.target.value }))}
          placeholder="Any special dietary requirements, setup requests, or other notes..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderGenerateStep = () => (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center">
        <div className="relative">
          <Brain className="h-16 w-16 text-primary animate-pulse" />
          <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
        </div>
        <h3 className="text-lg font-semibold mt-4 mb-2">AI Generating Your BEO</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Our intelligent system is analyzing your menu selections, optimizing pricing, 
          checking compliance, and generating comprehensive event instructions...
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Menu items analyzed and priced</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Event compliance verified</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Timeline and logistics calculated</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Generating recommendations...</span>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {generatedBeo && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Generated BEO: {generatedBeo.eventDetails.name}</h3>
              <p className="text-sm text-muted-foreground">
                {generatedBeo.eventDetails.guestCount} guests • {generatedBeo.eventDetails.eventType} • {generatedBeo.eventDetails.date}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${generatedBeo.total.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">${(generatedBeo.total / generatedBeo.eventDetails.guestCount).toFixed(2)} per person</div>
            </div>
          </div>

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="items">Line Items</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="ai-recommendations">
                AI Insights ({generatedBeo.aiRecommendations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedBeo.lineItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>${item.totalPrice.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${generatedBeo.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge (22%):</span>
                  <span>${generatedBeo.serviceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8.5%):</span>
                  <span>${generatedBeo.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${generatedBeo.total.toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-3">
                {generatedBeo.timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="font-mono text-sm font-medium bg-muted px-2 py-1 rounded">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.action}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {item.department}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4" />
                      Kitchen Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {generatedBeo.kitchenInstructions.map((instruction, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Service Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {generatedBeo.serviceInstructions.map((instruction, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Setup Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {generatedBeo.setupRequirements.map((requirement, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-recommendations" className="space-y-4">
              <div className="space-y-4">
                {generatedBeo.aiRecommendations.map((rec, index) => (
                  <Card key={index} className={cn(
                    "border-l-4",
                    rec.impact === 'high' ? "border-l-red-500" :
                    rec.impact === 'medium' ? "border-l-yellow-500" : "border-l-blue-500"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{rec.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {rec.type}
                            </Badge>
                            <Badge 
                              variant={rec.impact === 'high' ? 'destructive' : rec.impact === 'medium' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {rec.impact} impact
                            </Badge>
                            {rec.actionRequired && (
                              <Badge variant="outline" className="text-xs">
                                Action Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        {rec.savings && (
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              ${rec.savings.toFixed(2)} savings
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-2">{rec.description}</p>
                      <p className="text-xs text-muted-foreground italic">{rec.reasoning}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );

  const getStepContent = () => {
    switch (currentStep) {
      case 'upload': return renderUploadStep();
      case 'select': return renderSelectStep();
      case 'details': return renderDetailsStep();
      case 'generate': return renderGenerateStep();
      case 'review': return renderReviewStep();
      default: return renderUploadStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'upload': return parsedMenu !== null;
      case 'select': return selectedItems.length > 0;
      case 'details': return eventDetails.name && eventDetails.guestCount && eventDetails.eventType;
      case 'generate': return false; // Auto-proceeds
      case 'review': return true;
      default: return false;
    }
  };

  const getNextStep = () => {
    switch (currentStep) {
      case 'upload': return 'select';
      case 'select': return 'details';
      case 'details': return 'generate';
      case 'generate': return 'review';
      default: return 'upload';
    }
  };

  const handleNext = () => {
    if (currentStep === 'details') {
      handleGenerateBeo();
    } else {
      setCurrentStep(getNextStep());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Import Menu & Generate BEO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            AI-Powered Menu to BEO Generator
            <Badge className="bg-green-100 text-green-700">
              <Sparkles className="h-3 w-3 mr-1" />
              Intelligent
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Upload any menu document and our AI will generate a complete, optimized BEO with pricing, timelines, and intelligent recommendations.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6">
          {['upload', 'select', 'details', 'generate', 'review'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === step ? "bg-primary text-primary-foreground" :
                ['upload', 'select', 'details', 'generate', 'review'].indexOf(currentStep) > index ? "bg-green-500 text-white" :
                "bg-muted text-muted-foreground"
              )}>
                {['upload', 'select', 'details', 'generate', 'review'].indexOf(currentStep) > index ? 
                  <CheckCircle className="h-4 w-4" /> : 
                  index + 1
                }
              </div>
              {index < 4 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  ['upload', 'select', 'details', 'generate', 'review'].indexOf(currentStep) > index ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[500px]">
          {getStepContent()}
        </div>

        <DialogFooter className="mt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {currentStep === 'select' && (
                <span>{selectedItems.length} items selected</span>
              )}
              {currentStep === 'review' && generatedBeo && (
                <span>Generated: {generatedBeo.generatedAt.toLocaleString()}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              
              {currentStep !== 'upload' && currentStep !== 'generate' && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    const steps = ['upload', 'select', 'details', 'generate', 'review'];
                    const currentIndex = steps.indexOf(currentStep);
                    if (currentIndex > 0) {
                      setCurrentStep(steps[currentIndex - 1] as any);
                    }
                  }}
                >
                  Back
                </Button>
              )}
              
              {currentStep === 'review' ? (
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Save BEO
                  </Button>
                </div>
              ) : currentStep !== 'generate' && (
                <Button 
                  onClick={handleNext}
                  disabled={!canProceed() || isGenerating}
                >
                  {currentStep === 'details' ? (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate BEO
                    </>
                  ) : (
                    'Next'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
