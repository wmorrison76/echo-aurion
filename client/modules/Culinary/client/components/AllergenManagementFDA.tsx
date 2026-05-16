import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FDA_TOP_14_ALLERGENS,
  generateAllergenDeclaration,
  generateCrossContaminationWarning,
  type FDAAllergen
} from '@/lib/allergens-fda';

interface AllergenManagementFDAProps {
  selectedAllergens: FDAAllergen[];
  mayContainAllergens: FDAAllergen[];
  onAllergenToggle: (allergen: FDAAllergen, isMayContain?: boolean) => void;
  region?: 'US' | 'EU';
}

/**
 * Enhanced allergen management component with FDA Top 14 compliance
 * Shows cross-contamination risks and generates compliant labels
 */
export function AllergenManagementFDA({
  selectedAllergens,
  mayContainAllergens,
  onAllergenToggle,
  region = 'US'
}: AllergenManagementFDAProps) {
  const [showCrossContamination, setShowCrossContamination] = useState(false);
  
  const { warning, risks } = generateCrossContaminationWarning(selectedAllergens);
  const declaration = generateAllergenDeclaration(selectedAllergens, mayContainAllergens, region);

  const allergenList = Object.entries(FDA_TOP_14_ALLERGENS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {region === 'US' ? 'FDA Top 14 Allergens' : 'EU Top 14 Allergens'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {region === 'US'
            ? 'Select all allergens present in this recipe for FDA FALCPA compliance'
            : 'Select all allergens for EU 1169/2011 compliance'}
        </p>
      </div>

      {/* Cross-Contamination Warning */}
      {warning && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-900 dark:text-orange-100">{warning}</div>
          </div>
        </div>
      )}

      {/* Allergen Selection Grid */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Contains</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allergenList.map(([allergen, config]) => (
            <button
              key={allergen}
              onClick={() => onAllergenToggle(allergen as FDAAllergen)}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all text-sm',
                selectedAllergens.includes(allergen as FDAAllergen)
                  ? 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-border hover:border-red-300'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.label.split('(')[0] || allergen}</span>
                {selectedAllergens.includes(allergen as FDAAllergen) && (
                  <CheckCircle2 className="w-4 h-4 text-red-600 ml-auto" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* May Contain Section */}
      <div>
        <h4 className="text-sm font-semibold mb-3">May Contain (Traces)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allergenList.map(([allergen, config]) => (
            <button
              key={`may-${allergen}`}
              onClick={() => onAllergenToggle(allergen as FDAAllergen, true)}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all text-sm opacity-75',
                mayContainAllergens.includes(allergen as FDAAllergen)
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                  : 'border-border hover:border-yellow-300'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{config.label.split('(')[0] || allergen}</span>
                {mayContainAllergens.includes(allergen as FDAAllergen) && (
                  <CheckCircle2 className="w-4 h-4 text-yellow-600 ml-auto" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Allergen Declaration Text */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
          Allergen Declaration (Copy for Label)
        </h4>
        <code className="text-xs text-blue-900 dark:text-blue-100 block p-2 bg-white/50 dark:bg-black/20 rounded">
          {declaration}
        </code>
      </div>

      {/* Cross-Contamination Details */}
      {risks.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCrossContamination(!showCrossContamination)}
            className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            {showCrossContamination ? '▼' : '▶'} View Cross-Contamination Risks ({risks.length})
          </button>

          {showCrossContamination && (
            <div className="space-y-3 pl-4 border-l-2 border-orange-300">
              {risks.map((risk, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800"
                >
                  <h5 className="font-semibold text-sm mb-2">
                    {risk.allergen1} ↔ {risk.allergen2}
                  </h5>
                  <p className="text-xs text-orange-900 dark:text-orange-100 mb-2">
                    <span className={cn(
                      'font-semibold',
                      risk.riskLevel.level === 'high' && 'text-red-600 dark:text-red-400',
                      risk.riskLevel.level === 'medium' && 'text-orange-600 dark:text-orange-400'
                    )}>
                      {risk.riskLevel.level.toUpperCase()}
                    </span>
                    {' - '}{risk.riskLevel.description}
                  </p>

                  {risk.sharedEquipment.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold mb-1">Shared Equipment:</p>
                      <div className="flex flex-wrap gap-1">
                        {risk.sharedEquipment.map(eq => (
                          <span
                            key={eq}
                            className="text-xs bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded"
                          >
                            {eq.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {risk.cleaningProtocol && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Cleaning Protocol:</p>
                      <p className="text-xs text-orange-900 dark:text-orange-100">
                        {risk.cleaningProtocol}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regulations Reference */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Regulatory Compliance
        </h4>
        <ul className="text-xs space-y-1 text-muted-foreground">
          {region === 'US' ? (
            <>
              <li>✓ FDA Food Allergen Labeling and Consumer Protection Act (FALCPA)</li>
              <li>✓ Covers 9 major allergens (expanded to 11 as of 2023)</li>
              <li>✓ Clear allergen declaration required on all packaged foods</li>
            </>
          ) : (
            <>
              <li>✓ EU Regulation 1169/2011</li>
              <li>✓ Top 14 allergens must be clearly labeled</li>
              <li>✓ Precautionary "may contain" labels permitted</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Compact allergen badge for recipe cards
 */
export function AllergenBadge({
  allergens,
  size = 'sm'
}: {
  allergens: FDAAllergen[];
  size?: 'sm' | 'md';
}) {
  if (allergens.length === 0) return null;

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <div className={cn(
      'inline-block rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200 font-semibold',
      sizeClass
    )}>
      ⚠️ Contains {allergens.length} allergen{allergens.length !== 1 ? 's' : ''}
    </div>
  );
}

/**
 * Simple allergen list display
 */
export function AllergenList({
  allergens,
  title = 'Allergens'
}: {
  allergens: FDAAllergen[];
  title?: string;
}) {
  if (allergens.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {allergens.map(allergen => {
          const config = FDA_TOP_14_ALLERGENS[allergen];
          return (
            <span
              key={allergen}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200 text-sm font-medium"
            >
              <span>{config.symbol}</span>
              {allergen}
            </span>
          );
        })}
      </div>
    </div>
  );
}
