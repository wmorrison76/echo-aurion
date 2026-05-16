import React, { useState, useCallback, useMemo } from "react";
import {
  Search,
  ArrowRight,
  Star,
  TrendingUp,
  ChefHat,
  Clock,
  DollarSign,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface DishItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  components: string[];
  allergens: string[];
  popularity: number;
  foodCost: number;
  engineeringClass: string;
  lastModified: Date;
  tags: string[];
}

interface CompletedDishesGalleryProps {
  dishes: DishItem[];
  onGenerateDesign: (dish: DishItem) => void;
  onSelectDish: (dish: DishItem) => void;
}

type SortBy = "recent" | "popular" | "price" | "costanalysis";
type FilterBy = "all" | "star" | "plow" | "plowbuster" | "puzzle";

const engineeringClassColor = (classification: string): string => {
  switch (classification?.toLowerCase()) {
    case "star":
      return "bg-yellow-100 text-yellow-800";
    case "plow horse":
      return "bg-blue-100 text-blue-800";
    case "puzzle":
      return "bg-purple-100 text-purple-800";
    case "dog":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getDishesFromStorage = (): DishItem[] => {
  try {
    const stored = localStorage.getItem("designStudio:completedDishes");
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

const saveDishToStorage = (dishes: DishItem[]) => {
  try {
    localStorage.setItem("designStudio:completedDishes", JSON.stringify(dishes));
  } catch {
    console.warn("Could not save dishes to storage");
  }
};

export const CompletedDishesGallery: React.FC<CompletedDishesGalleryProps> = ({
  dishes: externalDishes,
  onGenerateDesign,
  onSelectDish,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");
  const [selectedDish, setSelectedDish] = useState<DishItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Use external dishes if provided, otherwise load from storage
  const dishes = useMemo(
    () => (externalDishes.length > 0 ? externalDishes : getDishesFromStorage()),
    [externalDishes],
  );

  const filteredDishes = useMemo(() => {
    let filtered = [...dishes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (dish) =>
          dish.name.toLowerCase().includes(query) ||
          dish.description.toLowerCase().includes(query) ||
          dish.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Apply engineering class filter
    if (filterBy !== "all") {
      filtered = filtered.filter((dish) =>
        dish.engineeringClass.toLowerCase().includes(filterBy),
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "recent":
        filtered.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        break;
      case "popular":
        filtered.sort((a, b) => b.popularity - a.popularity);
        break;
      case "price":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "costanalysis":
        filtered.sort((a, b) => {
          const aMargin = a.price - a.foodCost;
          const bMargin = b.price - b.foodCost;
          return bMargin - aMargin;
        });
        break;
    }

    return filtered;
  }, [dishes, searchQuery, sortBy, filterBy]);

  const stats = useMemo(
    () => ({
      totalDishes: dishes.length,
      averagePrice:
        dishes.length > 0 ? (dishes.reduce((sum, d) => sum + d.price, 0) / dishes.length).toFixed(2) : 0,
      stars: dishes.filter((d) => d.engineeringClass.toLowerCase() === "star").length,
      plows: dishes.filter(
        (d) => d.engineeringClass.toLowerCase() === "plow" ||
               d.engineeringClass.toLowerCase() === "plow horse",
      ).length,
    }),
    [dishes],
  );

  const handleGenerateDesign = useCallback(() => {
    if (selectedDish) {
      onGenerateDesign(selectedDish);
      setSelectedDish(null);
    }
  }, [selectedDish, onGenerateDesign]);

  const DishGridCard: React.FC<{ dish: DishItem }> = ({ dish }) => (
    <Card
      className="group cursor-pointer border-primary/20 bg-background/80 hover:border-primary/50 hover:shadow-lg transition-all overflow-hidden"
      onClick={() => setSelectedDish(dish)}
    >
      <AspectRatio ratio={4 / 3} className="overflow-hidden bg-muted">
        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <ChefHat className="h-12 w-12 text-primary/30" />
          </div>
        )}
      </AspectRatio>
      <CardContent className="p-3 space-y-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground">{dish.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{dish.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={`text-xs ${engineeringClassColor(dish.engineeringClass)}`}
          >
            {dish.engineeringClass}
          </Badge>
          <span className="text-sm font-semibold text-foreground">
            {dish.currency} {dish.price.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          {dish.popularity}% popular
        </div>
      </CardContent>
    </Card>
  );

  const DishListRow: React.FC<{ dish: DishItem }> = ({ dish }) => (
    <Card
      className="group cursor-pointer border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
      onClick={() => setSelectedDish(dish)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <AspectRatio ratio={1} className="h-16 w-16 overflow-hidden rounded-lg bg-muted flex-shrink-0">
            {dish.image ? (
              <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <ChefHat className="h-6 w-6 text-primary/30" />
              </div>
            )}
          </AspectRatio>

          <div className="flex-1 space-y-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{dish.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{dish.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={`text-xs ${engineeringClassColor(dish.engineeringClass)}`}
              >
                {dish.engineeringClass}
              </Badge>
              {dish.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">
                {dish.currency} {dish.price.toFixed(2)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {Math.round(dish.popularity)}% popular
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {Math.round(dish.foodCost * 100)}% food cost
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDish(dish);
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const hasNoDishes = dishes.length === 0;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">
            Completed Dishes Gallery
          </h3>
        </div>

        {!hasNoDishes && (
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center">
              <div className="font-semibold text-foreground">{stats.totalDishes}</div>
              <div className="text-muted-foreground">Total Dishes</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center">
              <div className="font-semibold text-foreground">
                {typeof stats.averagePrice === "number"
                  ? `$${parseFloat(stats.averagePrice as string).toFixed(2)}`
                  : stats.averagePrice}
              </div>
              <div className="text-muted-foreground">Avg Price</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-yellow-100/50 p-2 text-center">
              <div className="font-semibold text-yellow-900">{stats.stars}</div>
              <div className="text-yellow-700 text-[9px]">Stars</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-blue-100/50 p-2 text-center">
              <div className="font-semibold text-blue-900">{stats.plows}</div>
              <div className="text-blue-700 text-[9px]">Plows</div>
            </div>
          </div>
        )}
      </div>

      {hasNoDishes ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <ChefHat className="h-12 w-12 text-primary/30 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">No Completed Dishes Yet</p>
              <p className="text-xs text-muted-foreground">
                Create and save dishes from Dish Assembly to see them here
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="px-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="pl-9 border-primary/30 bg-background/80 text-sm h-9"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Sort
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full mt-1 text-sm border border-primary/30 rounded-lg bg-background/80 px-2 py-1.5 text-foreground"
                >
                  <option value="recent">Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="price">Highest Price</option>
                  <option value="costanalysis">Best Margin</option>
                </select>
              </div>

              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Menu Engineering
                </label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterBy)}
                  className="w-full mt-1 text-sm border border-primary/30 rounded-lg bg-background/80 px-2 py-1.5 text-foreground"
                >
                  <option value="all">All Classes</option>
                  <option value="star">Stars</option>
                  <option value="plow">Plow Horses</option>
                  <option value="puzzle">Puzzles</option>
                </select>
              </div>

              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                  View
                </label>
                <div className="flex gap-1 mt-1">
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                    className="flex-1 text-xs h-8"
                  >
                    Grid
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    className="flex-1 text-xs h-8"
                  >
                    List
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-4">
            {filteredDishes.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">No dishes match your filters</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 pr-4">
                {filteredDishes.map((dish) => (
                  <DishGridCard key={dish.id} dish={dish} />
                ))}
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredDishes.map((dish) => (
                  <DishListRow key={dish.id} dish={dish} />
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}

      {/* Dish Details Dialog */}
      <Dialog open={selectedDish !== null} onOpenChange={(open) => !open && setSelectedDish(null)}>
        <DialogContent className="max-w-2xl border-primary/40 bg-background/95">
          {selectedDish && (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl">{selectedDish.name}</DialogTitle>
                <DialogDescription className="text-sm">{selectedDish.description}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-6">
                {/* Image */}
                {selectedDish.image && (
                  <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border border-primary/30">
                    <img
                      src={selectedDish.image}
                      alt={selectedDish.name}
                      className="h-full w-full object-cover"
                    />
                  </AspectRatio>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center space-y-1">
                      <DollarSign className="h-4 w-4 text-primary mx-auto" />
                      <div className="text-sm font-semibold text-foreground">
                        {selectedDish.currency} {selectedDish.price.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Price</div>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center space-y-1">
                      <TrendingUp className="h-4 w-4 text-primary mx-auto" />
                      <div className="text-sm font-semibold text-foreground">
                        {Math.round(selectedDish.popularity)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">Popular</div>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center space-y-1">
                      <DollarSign className="h-4 w-4 text-primary mx-auto" />
                      <div className="text-sm font-semibold text-foreground">
                        {Math.round(selectedDish.foodCost * 100)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">Food Cost</div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`border-primary/30 ${engineeringClassColor(selectedDish.engineeringClass)}`}
                  >
                    <CardContent className="p-3 text-center space-y-1">
                      <Star className="h-4 w-4 mx-auto" />
                      <div className="text-sm font-semibold">{selectedDish.engineeringClass}</div>
                      <div className="text-[10px]">Classification</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Components & Allergens */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Components</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedDish.components.map((component) => (
                        <Badge key={component} variant="secondary" className="text-xs">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Allergens</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedDish.allergens.length > 0 ? (
                        selectedDish.allergens.map((allergen) => (
                          <Badge key={allergen} variant="destructive" className="text-xs">
                            {allergen}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Allergen-free</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {selectedDish.tags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedDish.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onSelectDish(selectedDish);
                    setSelectedDish(null);
                  }}
                >
                  View Full Details
                </Button>
                <Button
                  onClick={handleGenerateDesign}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Menu Design
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompletedDishesGallery;
