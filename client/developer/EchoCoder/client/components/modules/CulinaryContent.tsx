import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  category: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Array<{ name: string; amount: string }>;
}

const defaultRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Grilled Salmon',
    category: 'Main Course',
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    ingredients: [
      { name: 'Salmon Fillets', amount: '4 x 6oz' },
      { name: 'Lemon', amount: '2' },
      { name: 'Olive Oil', amount: '3 tbsp' },
    ],
  },
  {
    id: '2',
    name: 'Caesar Salad',
    category: 'Appetizer',
    prepTime: 10,
    cookTime: 0,
    servings: 2,
    ingredients: [
      { name: 'Romaine Lettuce', amount: '1 head' },
      { name: 'Parmesan Cheese', amount: '1/2 cup' },
      { name: 'Caesar Dressing', amount: '1/2 cup' },
    ],
  },
  {
    id: '3',
    name: 'Chocolate Mousse',
    category: 'Dessert',
    prepTime: 20,
    cookTime: 0,
    servings: 6,
    ingredients: [
      { name: 'Dark Chocolate', amount: '8oz' },
      { name: 'Heavy Cream', amount: '2 cups' },
      { name: 'Eggs', amount: '3' },
    ],
  },
];

export default function CulinaryContent() {
  const [recipes, setRecipes] = useState<Recipe[]>(defaultRecipes);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">EchoRecipePro</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage recipes, ingredients, and cooking techniques</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Recipe
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipe List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Recipes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedRecipe?.id === recipe.id
                        ? 'bg-primary/20 border border-primary/30 text-primary'
                        : 'hover:bg-muted border border-border/0'
                    }`}
                  >
                    <div className="font-medium text-sm">{recipe.name}</div>
                    <div className="text-xs text-muted-foreground">{recipe.category}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe Details */}
        <div className="lg:col-span-2">
          {selectedRecipe ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedRecipe.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Prep Time</div>
                    <div className="text-lg font-bold">{selectedRecipe.prepTime} min</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Cook Time</div>
                    <div className="text-lg font-bold">{selectedRecipe.cookTime} min</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Servings</div>
                    <div className="text-lg font-bold">{selectedRecipe.servings}</div>
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <h3 className="font-semibold mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span>{ing.name}</span>
                        <span className="text-muted-foreground">{ing.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button>Edit Recipe</Button>
                  <Button variant="outline">Duplicate</Button>
                  <Button variant="outline">Scale</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-muted-foreground">Select a recipe to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['Main Course', 'Appetizer', 'Dessert'].map((category) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recipes.filter((r) => r.category === category).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">recipes</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
