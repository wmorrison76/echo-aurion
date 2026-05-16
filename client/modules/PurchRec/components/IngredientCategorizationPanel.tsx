import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ProteinCategory,
  PortionType,
  PackagingType,
  CostBasis,
  IngredientCategory,
  calculatePricePerPound,
  calculatePortionsPerCase,
  extractCategoryFromName,
} from "../data/categorization";
import type { Ingredient } from "../data/schemas";

interface IngredientCategorizationPanelProps {
  ingredient: Ingredient;
  onUpdate: (updated: Ingredient & { category?: IngredientCategory }) => void;
  onCancel: () => void;
}

const PROTEIN_CATEGORIES = [
  "beef",
  "pork",
  "chicken",
  "poultry_other",
  "fish",
  "shellfish",
  "seafood_other",
  "lamb",
  "veal",
  "game",
  "processed_meat",
];

const PORTION_TYPES = [
  "whole",
  "half",
  "quarter",
  "eighth",
  "trim",
  "boneless",
  "bone_in",
  "skinless",
  "skin_on",
  "breast",
  "thigh",
  "drumstick",
  "wing",
  "leg",
  "loin",
  "rib",
  "chuck",
  "round",
  "ground",
  "filet",
  "steak",
  "chop",
];

const PRIMARY_CATEGORIES = [
  "protein",
  "produce",
  "dairy",
  "dry_goods",
  "beverage",
  "prepared",
  "non_food",
  "seafood",
];

const PACKAGING_TYPES = [
  "case",
  "pack",
  "carton",
  "tray",
  "vacuum_sealed",
  "frozen",
  "fresh",
  "cryovac",
];

const COST_BASIS_OPTIONS = [
  "per_pound",
  "per_ounce",
  "per_gram",
  "per_kilogram",
  "per_case",
  "per_pack",
  "per_unit",
  "per_count",
];

export function IngredientCategorizationPanel({
  ingredient,
  onUpdate,
  onCancel,
}: IngredientCategorizationPanelProps) {
  const [category, setCategory] = useState<Partial<IngredientCategory>>(() => {
    return extractCategoryFromName(ingredient.name);
  });

  const [portionWeight, setPortionWeight] = useState<string>("");
  const [portionWeightUom, setPortionWeightUom] = useState("oz");
  const [caseSize, setCaseSize] = useState<string>("");
  const [caseSizeUom, setCaseSizeUom] = useState("lb");
  const [pricePerPound, setPricePerPound] = useState<string>("");
  const [pricePerUnit, setPricePerUnit] = useState<string>("");

  const calculatedPortions = useMemo(() => {
    if (!caseSize || !caseSizeUom || !portionWeight || !portionWeightUom) {
      return null;
    }
    return calculatePortionsPerCase(
      parseFloat(caseSize),
      caseSizeUom,
      parseFloat(portionWeight),
      portionWeightUom,
    );
  }, [caseSize, caseSizeUom, portionWeight, portionWeightUom]);

  const handleTogglePortionType = (type: string) => {
    setCategory((prev) => {
      const portionTypes = prev.portionTypes || [];
      if (portionTypes.includes(type as any)) {
        return {
          ...prev,
          portionTypes: portionTypes.filter((t) => t !== type),
        };
      }
      return {
        ...prev,
        portionTypes: [...portionTypes, type as any],
      };
    });
  };

  const handleSave = () => {
    const updated = {
      ...ingredient,
      category: {
        ...category,
        portionWeight: portionWeight ? parseFloat(portionWeight) : undefined,
        portionWeightUom: portionWeightUom as any,
        caseSize: caseSize ? parseFloat(caseSize) : undefined,
        caseSizeUom,
        packSize: category.packSize,
      },
    };
    onUpdate(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorize: {ingredient.name}</CardTitle>
        <CardDescription>
          Set portion types, case size, and pricing details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <Label htmlFor="primary">Primary Category</Label>
          <Select
            value={category.primaryCategory || ""}
            onValueChange={(value) =>
              setCategory((prev) => ({
                ...prev,
                primaryCategory: value as any,
              }))
            }
          >
            <SelectTrigger id="primary">
              <SelectValue placeholder="Select primary category" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {category.primaryCategory === "protein" && (
          <div className="grid gap-4">
            <Label htmlFor="protein">Protein Type</Label>
            <Select
              value={category.proteinCategory || ""}
              onValueChange={(value) =>
                setCategory((prev) => ({
                  ...prev,
                  proteinCategory: value as ProteinCategory,
                }))
              }
            >
              <SelectTrigger id="protein">
                <SelectValue placeholder="Select protein type" />
              </SelectTrigger>
              <SelectContent>
                {PROTEIN_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Portion Types</Label>
          <div className="grid grid-cols-2 gap-3">
            {PORTION_TYPES.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`portion-${type}`}
                  checked={
                    category.portionTypes?.includes(type as PortionType) || false
                  }
                  onCheckedChange={() => handleTogglePortionType(type)}
                />
                <Label
                  htmlFor={`portion-${type}`}
                  className="text-sm font-normal"
                >
                  {type.replace(/_/g, " ")}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="portion-weight">Portion Weight</Label>
            <Input
              id="portion-weight"
              type="number"
              placeholder="0.00"
              value={portionWeight}
              onChange={(e) => setPortionWeight(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="portion-uom">UOM</Label>
            <Select value={portionWeightUom} onValueChange={setPortionWeightUom}>
              <SelectTrigger id="portion-uom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oz">Ounces (oz)</SelectItem>
                <SelectItem value="lb">Pounds (lb)</SelectItem>
                <SelectItem value="g">Grams (g)</SelectItem>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="case-size">Case Size</Label>
            <Input
              id="case-size"
              type="number"
              placeholder="0.00"
              value={caseSize}
              onChange={(e) => setCaseSize(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="case-uom">UOM</Label>
            <Select value={caseSizeUom} onValueChange={setCaseSizeUom}>
              <SelectTrigger id="case-uom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oz">Ounces (oz)</SelectItem>
                <SelectItem value="lb">Pounds (lb)</SelectItem>
                <SelectItem value="g">Grams (g)</SelectItem>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {calculatedPortions && (
          <Card className="bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-sm">
                <strong>Portions per case:</strong> {calculatedPortions.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price-per-pound">Price Per Pound</Label>
            <Input
              id="price-per-pound"
              type="number"
              placeholder="0.00"
              value={pricePerPound}
              onChange={(e) => setPricePerPound(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="price-per-unit">Price Per Unit</Label>
            <Input
              id="price-per-unit"
              type="number"
              placeholder="0.00"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Categorization</Button>
        </div>
      </CardContent>
    </Card>
  );
}
