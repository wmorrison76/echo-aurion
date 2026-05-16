import React from 'react';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NutritionFacts {
  servingSize: string;
  servingsPerContainer: number;
  calories: number;
  totalFat: number; // grams
  saturatedFat: number; // grams
  transFat: number; // grams
  cholesterol: number; // mg
  sodium: number; // mg
  totalCarbs: number; // grams
  dietaryFiber: number; // grams
  sugars: number; // grams
  protein: number; // grams
  vitaminA?: number; // %DV
  vitaminC?: number; // %DV
  calcium?: number; // %DV
  iron?: number; // %DV
}

interface NutritionLabelFDAProps {
  nutrition: NutritionFacts;
  region?: 'US' | 'EU';
  recipeTitle?: string;
  onDownloadPDF?: () => void;
}

/**
 * FDA-compliant nutrition label generator
 * Generates labels in official FDA format
 */
export function NutritionLabelFDA({
  nutrition,
  region = 'US',
  recipeTitle,
  onDownloadPDF
}: NutritionLabelFDAProps) {
  const [copied, setCopied] = React.useState(false);

  const getPercentDV = (nutrient: string, value: number): number => {
    const dailyValues: Record<string, number> = {
      totalFat: 78,
      saturatedFat: 20,
      cholesterol: 300,
      sodium: 2300,
      totalCarbs: 275,
      dietaryFiber: 28,
      protein: 50,
      vitaminA: 900,
      vitaminC: 90,
      calcium: 1300,
      iron: 18
    };

    const dv = dailyValues[nutrient];
    if (!dv) return 0;
    return Math.round((value / dv) * 100);
  };

  const declaration = () => {
    const allergenText = `${nutrition.totalFat}g Total Fat, ${nutrition.saturatedFat}g Saturated Fat, ${nutrition.cholesterol}mg Cholesterol, ${nutrition.sodium}mg Sodium`;
    return allergenText;
  };

  const copyToClipboard = () => {
    const text = generateTextLabel(nutrition, region);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Label Display */}
      <div className="border-4 border-black dark:border-white p-6 font-['Arial'] text-black dark:text-white bg-white dark:bg-gray-900" style={{ maxWidth: '200px', fontSize: '11px', lineHeight: '1.2' }}>
        {/* Nutrition Facts Header */}
        <div className="text-center font-bold text-lg mb-2">
          {region === 'US' ? 'Nutrition Facts' : 'Nutrition Information'}
        </div>

        <div className="border-b-2 border-black dark:border-white pb-2 mb-2">
          <div className="flex justify-between">
            <span className="font-bold">Serving Size</span>
            <span>{nutrition.servingSize}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-bold">Servings Per Container</span>
            <span>{nutrition.servingsPerContainer}</span>
          </div>
        </div>

        {/* Calories */}
        <div className="border-b-2 border-black dark:border-white pb-2 mb-2">
          <div className="flex justify-between font-bold">
            <span>Amount Per Serving</span>
            <span>Calories {nutrition.calories}</span>
          </div>
        </div>

        {/* Daily Value % */}
        <div className="text-right text-xs font-bold mb-2 text-gray-600 dark:text-gray-300">
          % Daily Value*
        </div>

        {/* Fat Section */}
        <div className="border-b border-black dark:border-white pb-1 mb-1">
          <div className="flex justify-between font-bold">
            <span>Total Fat</span>
            <span>{nutrition.totalFat}g {getPercentDV('totalFat', nutrition.totalFat)}%</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>Saturated Fat</span>
            <span>{nutrition.saturatedFat}g {getPercentDV('saturatedFat', nutrition.saturatedFat)}%</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>Trans Fat</span>
            <span>{nutrition.transFat}g</span>
          </div>
        </div>

        {/* Cholesterol & Sodium */}
        <div className="border-b border-black dark:border-white pb-1 mb-1">
          <div className="flex justify-between">
            <span>Cholesterol</span>
            <span>{nutrition.cholesterol}mg {getPercentDV('cholesterol', nutrition.cholesterol)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Sodium</span>
            <span>{nutrition.sodium}mg {getPercentDV('sodium', nutrition.sodium)}%</span>
          </div>
        </div>

        {/* Carbs Section */}
        <div className="border-b border-black dark:border-white pb-1 mb-1">
          <div className="flex justify-between font-bold">
            <span>Total Carbohydrate</span>
            <span>{nutrition.totalCarbs}g {getPercentDV('totalCarbs', nutrition.totalCarbs)}%</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>Dietary Fiber</span>
            <span>{nutrition.dietaryFiber}g {getPercentDV('dietaryFiber', nutrition.dietaryFiber)}%</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>Sugars</span>
            <span>{nutrition.sugars}g</span>
          </div>
        </div>

        {/* Protein */}
        <div className="border-b-2 border-black dark:border-white pb-2 mb-2">
          <div className="flex justify-between font-bold">
            <span>Protein</span>
            <span>{nutrition.protein}g</span>
          </div>
        </div>

        {/* Vitamins & Minerals */}
        <div className="text-xs mb-2">
          <div>
            <span>Vitamin A</span> {nutrition.vitaminA || 0}% •
            <span className="ml-2">Vitamin C</span> {nutrition.vitaminC || 0}%
          </div>
          <div>
            <span>Calcium</span> {nutrition.calcium || 0}% •
            <span className="ml-2">Iron</span> {nutrition.iron || 0}%
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black dark:border-white pt-1 text-xs">
          <p className="text-center font-bold">
            {region === 'US'
              ? '* Percent Daily Values are based on a 2,000 calorie diet.'
              : '* Reference values for an average adult (8400 kJ / 2000 kcal)'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Text'}
        </Button>

        {onDownloadPDF && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        )}
      </div>

      {/* Legal Notice */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs text-blue-900 dark:text-blue-100">
        <strong>Important:</strong> This label must be verified for accuracy before use.
        {region === 'US'
          ? ' Comply with FDA FALCPA and Net Quantity of Contents requirements.'
          : ' Comply with EU Regulation 1169/2011.'}
      </div>
    </div>
  );
}

/**
 * Generate plain text nutrition label
 */
export function generateTextLabel(nutrition: NutritionFacts, region: 'US' | 'EU' = 'US'): string {
  const getPercentDV = (nutrient: string, value: number): number => {
    const dailyValues: Record<string, number> = {
      totalFat: 78,
      saturatedFat: 20,
      cholesterol: 300,
      sodium: 2300,
      totalCarbs: 275,
      dietaryFiber: 28,
      protein: 50,
    };
    const dv = dailyValues[nutrient];
    return dv ? Math.round((value / dv) * 100) : 0;
  };

  return `
NUTRITION FACTS
${region === 'US' ? '' : '(Reference values for average adult)'}

Serving Size: ${nutrition.servingSize}
Servings Per Container: ${nutrition.servingsPerContainer}

AMOUNT PER SERVING
Calories ${nutrition.calories}

                           % Daily Value*
Total Fat ${nutrition.totalFat}g                    ${getPercentDV('totalFat', nutrition.totalFat)}%
  Saturated Fat ${nutrition.saturatedFat}g         ${getPercentDV('saturatedFat', nutrition.saturatedFat)}%
  Trans Fat ${nutrition.transFat}g
Cholesterol ${nutrition.cholesterol}mg              ${getPercentDV('cholesterol', nutrition.cholesterol)}%
Sodium ${nutrition.sodium}mg                      ${getPercentDV('sodium', nutrition.sodium)}%
Total Carbohydrate ${nutrition.totalCarbs}g       ${getPercentDV('totalCarbs', nutrition.totalCarbs)}%
  Dietary Fiber ${nutrition.dietaryFiber}g       ${getPercentDV('dietaryFiber', nutrition.dietaryFiber)}%
  Sugars ${nutrition.sugars}g
Protein ${nutrition.protein}g

Vitamin A ${nutrition.vitaminA || 0}%  •  Vitamin C ${nutrition.vitaminC || 0}%
Calcium ${nutrition.calcium || 0}%  •  Iron ${nutrition.iron || 0}%

* Percent Daily Values are based on a 2,000 calorie diet.
  `.trim();
}
