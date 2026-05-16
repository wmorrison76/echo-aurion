import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Upload, X } from "lucide-react";
import { type MenuItem } from "./BeoMenuPicker";
import { parseMenuFile } from "../lib/menu-import";
import { upsertMenuCatalogItems } from "../lib/menu-catalog-store";
import {
  importCulinaryRecipes,
  importPastryRecipes,
} from "../lib/culinary-menu-import";

interface MenuUploadProps {
  onMenuItemsLoaded: (items: MenuItem[]) => void;
}

interface ManualMenuItem {
  name: string;
  category: string;
  description: string;
  price: string;
}

export function MenuUpload({ onMenuItemsLoaded }: MenuUploadProps) {
  const [uploadMode, setUploadMode] = React.useState<
    "file" | "manual" | "culinary"
  >("manual");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [parseWarnings, setParseWarnings] = React.useState<string[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [manualItems, setManualItems] = React.useState<ManualMenuItem[]>([
    { name: "", category: "Entree", description: "", price: "" },
  ]);

  const handleFileUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // allow re-uploading same file
      try {
        event.target.value = "";
      } catch {
        // ignore
      }

      setIsLoading(true);
      setParseWarnings([]);
      setParseError(null);
      try {
        const res = await parseMenuFile(file);
        setParseWarnings(res.warnings || []);

        // Persist to catalog for reuse
        try {
          upsertMenuCatalogItems(res.items, {
            source: {
              kind: "import",
              fileName: file.name,
              fileType: file.type,
            },
          });
        } catch {
          // ignore (storage constraints)
        }

        onMenuItemsLoaded(res.items);
        setShowDialog(false);
      } catch (error) {
        console.error("Error parsing menu file:", error);
        setParseError(
          error instanceof Error ? error.message : "Failed to parse menu file",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [onMenuItemsLoaded],
  );

  const handleAddManualItem = React.useCallback(() => {
    setManualItems((prev) => [
      ...prev,
      { name: "", category: "Entree", description: "", price: "" },
    ]);
  }, []);

  const handleRemoveManualItem = React.useCallback((index: number) => {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleManualItemChange = React.useCallback(
    (index: number, field: keyof ManualMenuItem, value: string) => {
      setManualItems((prev) => {
        const next = prev.slice();
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const handleSubmitManualItems = React.useCallback(() => {
    const items: MenuItem[] = manualItems
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        id: `manual-${index}-${item.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")}`,
        name: item.name,
        category: item.category,
        description: item.description,
        price: Number.parseFloat(item.price) || 0,
        preparationTime: 20,
        servingSize: "per person",
        dietary: [],
        allergens: [],
        popularity: 0.75,
        upsellPotential: 0.6,
      }));

    if (items.length > 0) {
      try {
        upsertMenuCatalogItems(items, { source: { kind: "manual" } });
      } catch {
        // ignore
      }
      onMenuItemsLoaded(items);
      setShowDialog(false);
    }
  }, [manualItems, onMenuItemsLoaded]);

  const hasManual = manualItems.some((item) => item.name.trim());

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Upload className="h-4 w-4" /> Upload Menu
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload or Create Menu</DialogTitle>
          </DialogHeader>

          <Tabs
            value={uploadMode}
            onValueChange={(v) =>
              setUploadMode(v as "file" | "manual" | "culinary")
            }
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="culinary">Culinary/Pastry</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Upload Menu Document
                  </CardTitle>
                  <CardDescription>
                    Supports PDF, images, and text/CSV. We’ll extract menu items
                    and normalize them for selection.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF, PNG, JPG, TXT, CSV (Max 10MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {isLoading ? (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      <p className="text-sm">Parsing menu…</p>
                    </div>
                  ) : null}

                  {parseError ? (
                    <div className="mt-4 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">
                      {parseError}
                    </div>
                  ) : null}

                  {parseWarnings.length > 0 ? (
                    <div className="mt-4 p-3 rounded-md border border-amber-500/25 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300">
                      <div className="font-semibold mb-1">Review</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {parseWarnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Menu Items</CardTitle>
                  <CardDescription>
                    Manually enter items (fast), then reuse them from the
                    catalog.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {manualItems.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            Item {index + 1}
                          </span>
                          {manualItems.length > 1 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveManualItem(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`name-${index}`}
                              className="text-xs"
                            >
                              Item Name
                            </Label>
                            <Input
                              id={`name-${index}`}
                              placeholder="e.g., Pan-Seared Salmon"
                              value={item.name}
                              onChange={(e) =>
                                handleManualItemChange(
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label
                              htmlFor={`category-${index}`}
                              className="text-xs"
                            >
                              Category
                            </Label>
                            <select
                              id={`category-${index}`}
                              value={item.category}
                              onChange={(e) =>
                                handleManualItemChange(
                                  index,
                                  "category",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm border rounded px-2 py-1 bg-background"
                            >
                              <option value="Appetizer">Appetizer</option>
                              <option value="Entree">Entree</option>
                              <option value="Dessert">Dessert</option>
                              <option value="Beverage">Beverage</option>
                              <option value="Side">Side</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor={`description-${index}`}
                            className="text-xs"
                          >
                            Description
                          </Label>
                          <Textarea
                            id={`description-${index}`}
                            placeholder="Brief description of the item"
                            value={item.description}
                            onChange={(e) =>
                              handleManualItemChange(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            className="h-16 text-sm resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`price-${index}`} className="text-xs">
                            Price (per person)
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              id={`price-${index}`}
                              type="number"
                              placeholder="0.00"
                              value={item.price}
                              onChange={(e) =>
                                handleManualItemChange(
                                  index,
                                  "price",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm pl-7"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleAddManualItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Another Item
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="culinary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Import from Culinary/Pastry
                  </CardTitle>
                  <CardDescription>
                    Pull recipes from EchoRecipePro local library and add them
                    to the menu catalog.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const items = importCulinaryRecipes();
                      if (items.length === 0) return;
                      upsertMenuCatalogItems(items, {
                        source: { kind: "import" },
                      });
                      onMenuItemsLoaded(items);
                      setShowDialog(false);
                    }}
                  >
                    Import Culinary Recipes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const items = importPastryRecipes();
                      if (items.length === 0) return;
                      upsertMenuCatalogItems(items, {
                        source: { kind: "import" },
                      });
                      onMenuItemsLoaded(items);
                      setShowDialog(false);
                    }}
                  >
                    Import Pastry Recipes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            {uploadMode === "manual" ? (
              <Button
                onClick={handleSubmitManualItems}
                disabled={!hasManual}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                Add Items
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
