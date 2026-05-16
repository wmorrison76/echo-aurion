import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ChefHat, Edit, Link2, Plus, Search, Trash2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  recipeId?: string;
  recipeName?: string;
  connected: boolean;
}

const CATEGORIES = ["Appetizers", "Salads", "Entrees", "Desserts"] as const;

export default function BanquetMenuManager() {
  const { toast } = useToast();

  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const loadMenuItems = React.useCallback(async () => {
    /* Replace with API/store wiring. Keeping deterministic local list for now. */
    const initial: MenuItem[] = [
      {
        id: "item-1",
        name: "Filet Mignon",
        category: "Entrees",
        price: 45,
        recipeId: "recipe-1",
        recipeName: "Filet Mignon Recipe",
        connected: true,
      },
      {
        id: "item-2",
        name: "Caesar Salad",
        category: "Salads",
        price: 12,
        connected: false,
      },
    ];
    setMenuItems(initial);
  }, []);

  React.useEffect(() => {
    void loadMenuItems();
  }, [loadMenuItems]);

  const filteredItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesSearch = !q || item.name.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const handleConnectRecipe = React.useCallback(
    async (itemId: string) => {
      const item = menuItems.find((m) => m.id === itemId);
      toast({
        title: "Connect Recipe",
        description: item
          ? `Select an EchoRecipePro recipe for “${item.name}”.`
          : "Select an EchoRecipePro recipe.",
      });
    },
    [menuItems, toast],
  );

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Banquet Menu Manager</CardTitle>
              <CardDescription>
                Manage banquet menu items and their EchoRecipePro links
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                const id = `item-${Date.now()}`;
                setMenuItems((prev) => [
                  ...prev,
                  {
                    id,
                    name: "New menu item",
                    category: "Entrees",
                    price: 0,
                    connected: false,
                  },
                ]);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Recipe Connection</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    {item.connected ? (
                      <Badge
                        variant="default"
                        className="flex items-center gap-1 w-fit"
                      >
                        <Link2 className="h-3 w-3" />
                        {item.recipeName || "Connected"}
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectRecipe(item.id)}
                      >
                        <ChefHat className="h-4 w-4 mr-2" />
                        Connect Recipe
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toast({
                            title: "Edit",
                            description:
                              "Edit flow will be wired to persisted menu catalog.",
                          })
                        }
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setMenuItems((prev) =>
                            prev.filter((x) => x.id !== item.id),
                          )
                        }
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No menu items match your filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
