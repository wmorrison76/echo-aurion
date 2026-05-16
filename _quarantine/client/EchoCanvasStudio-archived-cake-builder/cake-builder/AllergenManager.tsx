import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree Nuts",
  "Dairy",
  "Eggs",
  "Soy",
  "Gluten",
  "Sesame",
  "Shellfish",
  "Fish",
  "Sulfites",
];

const DIETARY_RESTRICTIONS = [
  "Vegan",
  "Vegetarian",
  "Halal",
  "Kosher",
  "Keto",
  "Paleo",
  "Nut-Free",
  "Dairy-Free",
  "Gluten-Free",
];

interface AllergenProfile {
  allergens: string[];
  dietaryRestrictions: string[];
  severeAllergies: string[];
  crossContaminationRisk: boolean;
  notes: string;
}

interface AllergenManagerProps {
  profile: AllergenProfile;
  onChange: (profile: AllergenProfile) => void;
}

export default function AllergenManager({
  profile,
  onChange,
}: AllergenManagerProps) {
  const [customAllergen, setCustomAllergen] = useState("");

  const toggleAllergen = (allergen: string) => {
    const updated = profile.allergens.includes(allergen)
      ? profile.allergens.filter((a) => a !== allergen)
      : [...profile.allergens, allergen];
    onChange({ ...profile, allergens: updated });
  };

  const toggleDietary = (restriction: string) => {
    const updated = profile.dietaryRestrictions.includes(restriction)
      ? profile.dietaryRestrictions.filter((d) => d !== restriction)
      : [...profile.dietaryRestrictions, restriction];
    onChange({ ...profile, dietaryRestrictions: updated });
  };

  const addCustomAllergen = () => {
    if (!customAllergen) return;
    if (!profile.allergens.includes(customAllergen)) {
      onChange({
        ...profile,
        allergens: [...profile.allergens, customAllergen],
      });
    }
    setCustomAllergen("");
  };

  const toggleSevere = (allergen: string) => {
    const updated = profile.severeAllergies.includes(allergen)
      ? profile.severeAllergies.filter((a) => a !== allergen)
      : [...profile.severeAllergies, allergen];
    onChange({ ...profile, severeAllergies: updated });
  };

  const hasSevereAllergens = profile.severeAllergies.length > 0;

  return (
    <div className="space-y-4">
      {hasSevereAllergens && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 font-semibold">
            SEVERE ALLERGENS DETECTED: {profile.severeAllergies.join(", ")} -
            Extra precautions required
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Allergens & Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Common Allergens */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Known Allergens</h4>
            <div className="grid grid-cols-2 gap-3">
              {COMMON_ALLERGENS.map((allergen) => (
                <div key={allergen} className="flex items-start gap-2">
                  <Checkbox
                    checked={profile.allergens.includes(allergen)}
                    onCheckedChange={() => toggleAllergen(allergen)}
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium cursor-pointer">
                      {allergen}
                    </label>
                    {profile.allergens.includes(allergen) && (
                      <div className="flex items-center gap-1 mt-1">
                        <Checkbox
                          checked={profile.severeAllergies.includes(allergen)}
                          onCheckedChange={() => toggleSevere(allergen)}
                        />
                        <span className="text-xs text-red-600">Mark as severe</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Allergen */}
          <div>
            <label className="text-sm font-semibold block mb-2">
              Add Custom Allergen
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Avocado"
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustomAllergen();
                }}
              />
              <Button onClick={addCustomAllergen} size="sm">
                Add
              </Button>
            </div>
            {profile.allergens.filter((a) => !COMMON_ALLERGENS.includes(a)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.allergens
                  .filter((a) => !COMMON_ALLERGENS.includes(a))
                  .map((allergen) => (
                    <button
                      key={allergen}
                      onClick={() => toggleAllergen(allergen)}
                      className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
                    >
                      {allergen} ✕
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Dietary Restrictions */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Dietary Restrictions</h4>
            <div className="grid grid-cols-2 gap-3">
              {DIETARY_RESTRICTIONS.map((restriction) => (
                <div key={restriction} className="flex items-center gap-2">
                  <Checkbox
                    checked={profile.dietaryRestrictions.includes(restriction)}
                    onCheckedChange={() => toggleDietary(restriction)}
                  />
                  <label className="text-sm font-medium cursor-pointer">
                    {restriction}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Cross Contamination Risk */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox
              checked={profile.crossContaminationRisk}
              onCheckedChange={(checked) =>
                onChange({ ...profile, crossContaminationRisk: checked as boolean })
              }
            />
            <label className="text-sm font-medium cursor-pointer">
              Cross-contamination risk (requires dedicated equipment/space)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold block mb-2">Special Notes</label>
            <textarea
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g. Nut allergy severity level, epinephrine on-site, etc."
              value={profile.notes}
              onChange={(e) => onChange({ ...profile, notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
