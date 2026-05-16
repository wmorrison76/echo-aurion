import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Brain, Lightbulb, Sparkles } from "lucide-react";

import type { MenuItem, SelectedMenuItem } from "./BeoMenuPicker";

interface MenuSuggestion {
  id: string;
  name: string;
  description: string;
  items: MenuItem[];
  totalCostPerPerson: number;
  totalCostForEvent: number;
  confidence: number;
  reasoning: string;
  servingStyle: string;
}

interface BeoAiSuggestionsProps {
  eventDetails: {
    title: string;
    guestCount: number;
    date: string;
    eventType: string;
  };
  onApplySuggestion: (items: SelectedMenuItem[]) => void;
}

const SUGGESTIONS_BASE: Omit<MenuSuggestion, "totalCostForEvent">[] = [
  {
    id: "suggestion-1",
    name: "Classic Elegance",
    description: "Traditional multi-course dinner with cocktail reception",
    items: [
      {
        id: "appetizer-1",
        name: "Shrimp Canapé",
        category: "Appetizer",
        description: "Grilled shrimp on crispy rye with lemon aioli",
        price: 4.5,
        preparationTime: 15,
        servingSize: "per person",
        dietary: ["gluten-free available"],
        allergens: ["shellfish", "soy"],
        popularity: 0.9,
        upsellPotential: 0.7,
      },
      {
        id: "entree-2",
        name: "Filet Mignon",
        category: "Entree",
        description:
          "Prime beef tenderloin with truffle jus and roasted potatoes",
        price: 45.0,
        preparationTime: 30,
        servingSize: "per person",
        dietary: ["gluten-free"],
        allergens: [],
        popularity: 0.95,
        upsellPotential: 0.9,
      },
      {
        id: "dessert-1",
        name: "Chocolate Mousse",
        category: "Dessert",
        description:
          "Dark chocolate mousse with fresh berries and whipped cream",
        price: 8.0,
        preparationTime: 5,
        servingSize: "per person",
        dietary: ["vegetarian"],
        allergens: ["dairy", "chocolate"],
        popularity: 0.88,
        upsellPotential: 0.7,
      },
    ],
    totalCostPerPerson: 57.5,
    confidence: 0.95,
    reasoning:
      "Good fit for formal events: premium protein + sophisticated appetizer + decadent dessert.",
    servingStyle: "plated",
  },
  {
    id: "suggestion-2",
    name: "Modern Casual",
    description: "Contemporary buffet with interactive stations",
    items: [
      {
        id: "appetizer-2",
        name: "Cheese & Charcuterie Board",
        category: "Appetizer",
        description: "Selection of artisan cheeses, cured meats, and crackers",
        price: 8.0,
        preparationTime: 10,
        servingSize: "per person",
        dietary: ["vegetarian available"],
        allergens: ["dairy", "gluten"],
        popularity: 0.85,
        upsellPotential: 0.8,
      },
      {
        id: "entree-1",
        name: "Pan-Seared Salmon",
        category: "Entree",
        description: "Atlantic salmon with herb butter and seasonal vegetables",
        price: 28.0,
        preparationTime: 25,
        servingSize: "per person",
        dietary: ["gluten-free"],
        allergens: ["fish"],
        popularity: 0.92,
        upsellPotential: 0.75,
      },
      {
        id: "dessert-2",
        name: "Vanilla Panna Cotta",
        category: "Dessert",
        description: "Silky vanilla panna cotta with berry compote",
        price: 7.5,
        preparationTime: 5,
        servingSize: "per person",
        dietary: ["vegetarian"],
        allergens: ["dairy"],
        popularity: 0.8,
        upsellPotential: 0.65,
      },
    ],
    totalCostPerPerson: 43.5,
    confidence: 0.87,
    reasoning:
      "Good for business events: flexible service, approachable mains, refined dessert.",
    servingStyle: "buffet",
  },
  {
    id: "suggestion-3",
    name: "Healthy Conscious",
    description: "Vegetarian-focused menu with dietary accommodations",
    items: [
      {
        id: "appetizer-3",
        name: "Vegetable Crudités",
        category: "Appetizer",
        description: "Fresh seasonal vegetables with herb dip",
        price: 3.5,
        preparationTime: 5,
        servingSize: "per person",
        dietary: ["vegan", "vegetarian", "gluten-free"],
        allergens: [],
        popularity: 0.7,
        upsellPotential: 0.4,
      },
      {
        id: "entree-3",
        name: "Vegetable Risotto",
        category: "Entree",
        description:
          "Creamy Arborio rice with seasonal vegetables and parmigiano",
        price: 22.0,
        preparationTime: 20,
        servingSize: "per person",
        dietary: ["vegetarian", "gluten-free"],
        allergens: ["dairy"],
        popularity: 0.75,
        upsellPotential: 0.6,
      },
      {
        id: "dessert-1",
        name: "Chocolate Mousse",
        category: "Dessert",
        description:
          "Dark chocolate mousse with fresh berries and whipped cream",
        price: 8.0,
        preparationTime: 5,
        servingSize: "per person",
        dietary: ["vegetarian"],
        allergens: ["dairy", "chocolate"],
        popularity: 0.88,
        upsellPotential: 0.7,
      },
    ],
    totalCostPerPerson: 33.5,
    confidence: 0.82,
    reasoning:
      "Supports dietary needs while staying elevated and event-appropriate.",
    servingStyle: "plated",
  },
];

export function BeoAiSuggestions({
  eventDetails,
  onApplySuggestion,
}: BeoAiSuggestionsProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<MenuSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const handleGenerateSuggestions = React.useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const withTotals: MenuSuggestion[] = SUGGESTIONS_BASE.map((s) => ({
        ...s,
        totalCostForEvent: s.totalCostPerPerson * eventDetails.guestCount,
      }));
      setSuggestions(withTotals);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [eventDetails.guestCount]);

  const handleApply = React.useCallback(
    (suggestion: MenuSuggestion) => {
      const selectedItems: SelectedMenuItem[] = suggestion.items.map(
        (item, index) => ({ ...item, order: index }),
      );
      onApplySuggestion(selectedItems);
    },
    [onApplySuggestion],
  );

  if (showSuggestions && suggestions.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-cyan-500" />
              Menu Suggestions
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Recommendations based on event details and guest count.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSuggestions(false)}
          >
            Generate New
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.map((suggestion) => (
            <Card
              key={suggestion.id}
              className="flex flex-col hover:shadow-lg transition-all"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{suggestion.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {suggestion.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      suggestion.confidence > 0.9
                        ? "bg-green-50 text-green-700 border-green-300"
                        : suggestion.confidence > 0.8
                          ? "bg-blue-50 text-blue-700 border-primary"
                          : "bg-surface text-foreground border-border"
                    }
                  >
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Menu Items</h4>
                  <div className="space-y-1">
                    {suggestion.items.map((item) => (
                      <div
                        key={item.id}
                        className="text-sm flex justify-between items-center p-2 bg-muted rounded"
                      >
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/30 rounded text-sm text-cyan-900 flex gap-2">
                  <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{suggestion.reasoning}</p>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Per Person</span>
                    <span className="font-medium">
                      ${suggestion.totalCostPerPerson.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-primary">
                    <span>Total ({eventDetails.guestCount} guests)</span>
                    <span>${suggestion.totalCostForEvent.toFixed(2)}</span>
                  </div>

                  <Button
                    className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600"
                    onClick={() => handleApply(suggestion)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Apply This Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-cyan-200 bg-cyan-50/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            <div>
              <h3 className="font-semibold">Get Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                Generate menu suggestions based on your event.
              </p>
            </div>
          </div>
          <Button
            onClick={handleGenerateSuggestions}
            disabled={isLoading}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {isLoading ? "Analyzing..." : "Generate Suggestions"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
