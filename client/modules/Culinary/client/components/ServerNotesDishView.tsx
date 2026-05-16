import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Edit2 } from "lucide-react";

export interface DishComponent {
  qty: string;
  component: string;
  notes?: string;
}

export interface DishAllergen {
  itemName: string;
  allergen: string;
  modify: boolean;
  alternative?: string;
}

export interface DishWinePairing {
  itemName: string;
  year?: string;
  location?: string;
  country?: string;
}

export interface ServerNotesDishViewProps {
  dishName: string;
  description?: string;
  menuDescription?: string;
  serverNotes?: string;
  serviceware?: string;
  components: DishComponent[];
  allergens: DishAllergen[];
  winePairings: DishWinePairing[];
  imageSrc?: string;
  onUpdate?: (updates: Partial<ServerNotesDishViewProps>) => void;
  editable?: boolean;
}

export const ServerNotesDishView: React.FC<ServerNotesDishViewProps> = ({
  dishName,
  description,
  menuDescription,
  serverNotes,
  serviceware,
  components,
  allergens,
  winePairings,
  imageSrc,
  onUpdate,
  editable = false,
}) => {
  const [editingComponent, setEditingComponent] = useState<number | null>(null);
  const [editingAllergen, setEditingAllergen] = useState<number | null>(null);
  const [editingWinePairing, setEditingWinePairing] = useState<number | null>(null);
  const [newComponent, setNewComponent] = useState<DishComponent>({ qty: "", component: "", notes: "" });
  const [newAllergen, setNewAllergen] = useState<DishAllergen>({ itemName: "", allergen: "", modify: false });
  const [newWinePairing, setNewWinePairing] = useState<DishWinePairing>({ itemName: "" });

  const handleAddComponent = () => {
    if (newComponent.qty && newComponent.component) {
      onUpdate?.({
        components: [...components, newComponent],
      });
      setNewComponent({ qty: "", component: "", notes: "" });
    }
  };

  const handleRemoveComponent = (index: number) => {
    onUpdate?.({
      components: components.filter((_, i) => i !== index),
    });
  };

  const handleAddAllergen = () => {
    if (newAllergen.itemName && newAllergen.allergen) {
      onUpdate?.({
        allergens: [...allergens, newAllergen],
      });
      setNewAllergen({ itemName: "", allergen: "", modify: false });
    }
  };

  const handleRemoveAllergen = (index: number) => {
    onUpdate?.({
      allergens: allergens.filter((_, i) => i !== index),
    });
  };

  const handleAddWinePairing = () => {
    if (newWinePairing.itemName) {
      onUpdate?.({
        winePairings: [...winePairings, newWinePairing],
      });
      setNewWinePairing({ itemName: "" });
    }
  };

  const handleRemoveWinePairing = (index: number) => {
    onUpdate?.({
      winePairings: winePairings.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Dish Hero Section */}
      {imageSrc && (
        <div className="relative w-full overflow-hidden rounded-lg bg-muted">
          <img
            src={imageSrc}
            alt={dishName}
            className="h-64 w-full object-cover"
          />
        </div>
      )}

      {/* Dish Name & Subtitle */}
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-3xl font-bold">{dishName}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Menu Description */}
      {menuDescription && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base">Menu Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{menuDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* Server Notes */}
      {serverNotes && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base">Server Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{serverNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Dish Components Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dish Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-sm font-semibold">QTY</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Component</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Notes</th>
                  {editable && (
                    <th className="px-3 py-2 text-left text-sm font-semibold w-12">Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {components.map((comp, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 text-sm">{comp.qty}</td>
                    <td className="px-3 py-2 text-sm font-medium">{comp.component}</td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{comp.notes || "—"}</td>
                    {editable && (
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveComponent(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editable && (
            <div className="pt-4 border-t space-y-3">
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Qty"
                  value={newComponent.qty}
                  onChange={(e) => setNewComponent({ ...newComponent, qty: e.target.value })}
                  className="col-span-2 rounded border border-input px-2 py-1 text-sm"
                />
                <AutocompleteInput
                  suggestionType="components"
                  placeholder="Component name"
                  value={newComponent.component}
                  onChange={(e) => setNewComponent({ ...newComponent, component: e.target.value })}
                  className="col-span-5"
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={newComponent.notes || ""}
                  onChange={(e) => setNewComponent({ ...newComponent, notes: e.target.value })}
                  className="col-span-3 rounded border border-input px-2 py-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddComponent}
                  className="col-span-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergens Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allergens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-sm font-semibold">Item Name</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Allergen</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Modify</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Alternative</th>
                  {editable && (
                    <th className="px-3 py-2 text-left text-sm font-semibold w-12">Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {allergens.map((allergen, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 text-sm">{allergen.itemName}</td>
                    <td className="px-3 py-2 text-sm">
                      <Badge variant="outline">{allergen.allergen}</Badge>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <Badge variant={allergen.modify ? "default" : "secondary"}>
                        {allergen.modify ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{allergen.alternative || "—"}</td>
                    {editable && (
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAllergen(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editable && (
            <div className="pt-4 border-t space-y-3">
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Item"
                  value={newAllergen.itemName}
                  onChange={(e) => setNewAllergen({ ...newAllergen, itemName: e.target.value })}
                  className="col-span-3 rounded border border-input px-2 py-1 text-sm"
                />
                <AutocompleteInput
                  suggestionType="allergens"
                  placeholder="Allergen"
                  value={newAllergen.allergen}
                  onChange={(e) => setNewAllergen({ ...newAllergen, allergen: e.target.value })}
                  className="col-span-3"
                />
                <input
                  type="checkbox"
                  checked={newAllergen.modify}
                  onChange={(e) => setNewAllergen({ ...newAllergen, modify: e.target.checked })}
                  className="col-span-1 h-9 px-2"
                />
                <input
                  type="text"
                  placeholder="Alternative"
                  value={newAllergen.alternative || ""}
                  onChange={(e) => setNewAllergen({ ...newAllergen, alternative: e.target.value })}
                  className="col-span-3 rounded border border-input px-2 py-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddAllergen}
                  className="col-span-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wine Pairings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wine Pairings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-sm font-semibold">Item Name</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Year</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Location</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold">Country</th>
                  {editable && (
                    <th className="px-3 py-2 text-left text-sm font-semibold w-12">Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {winePairings.map((pairing, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 text-sm font-medium">{pairing.itemName}</td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{pairing.year || "—"}</td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{pairing.location || "—"}</td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{pairing.country || "—"}</td>
                    {editable && (
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveWinePairing(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editable && (
            <div className="pt-4 border-t space-y-3">
              <div className="grid grid-cols-12 gap-2">
                <AutocompleteInput
                  suggestionType="recipes"
                  placeholder="Wine/Item Name"
                  value={newWinePairing.itemName}
                  onChange={(e) => setNewWinePairing({ ...newWinePairing, itemName: e.target.value })}
                  className="col-span-3"
                />
                <input
                  type="text"
                  placeholder="Year"
                  value={newWinePairing.year || ""}
                  onChange={(e) => setNewWinePairing({ ...newWinePairing, year: e.target.value })}
                  className="col-span-3 rounded border border-input px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={newWinePairing.location || ""}
                  onChange={(e) => setNewWinePairing({ ...newWinePairing, location: e.target.value })}
                  className="col-span-2 rounded border border-input px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={newWinePairing.country || ""}
                  onChange={(e) => setNewWinePairing({ ...newWinePairing, country: e.target.value })}
                  className="col-span-2 rounded border border-input px-2 py-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddWinePairing}
                  className="col-span-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Serviceware Info */}
      {serviceware && (
        <Card className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Serviceware</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{serviceware}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServerNotesDishView;
