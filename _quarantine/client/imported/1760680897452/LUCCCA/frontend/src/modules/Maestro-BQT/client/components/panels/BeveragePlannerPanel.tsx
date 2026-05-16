import React, { useState } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { PanelShell } from '../../builder/maestro-banquets.builder-seed';

interface BeveragePackage {
  id: string;
  name: string;
  type: 'wine' | 'beer' | 'spirits' | 'cocktail' | 'non_alcoholic';
  costPerPerson: number;
  description: string;
  includes: string[];
  duration: number; // hours
  popular?: boolean;
}

const beveragePackages: BeveragePackage[] = [
  {
    id: 'wine-basic',
    name: 'House Wine Selection',
    type: 'wine',
    costPerPerson: 12.00,
    description: 'Curated selection of house red and white wines',
    includes: ['Cabernet Sauvignon', 'Chardonnay', 'Pinot Grigio'],
    duration: 4,
    popular: true
  },
  {
    id: 'wine-premium',
    name: 'Premium Wine Collection',
    type: 'wine',
    costPerPerson: 22.00,
    description: 'Premium vintages and champagne service',
    includes: ['Premium Reds', 'Premium Whites', 'Champagne', 'Sparkling Wine'],
    duration: 4
  },
  {
    id: 'beer-craft',
    name: 'Craft Beer Selection',
    type: 'beer',
    costPerPerson: 8.00,
    description: 'Local and craft beer selection',
    includes: ['IPA', 'Lager', 'Wheat Beer', 'Seasonal Selections'],
    duration: 4
  },
  {
    id: 'cocktail-basic',
    name: 'Signature Cocktails',
    type: 'cocktail',
    costPerPerson: 18.00,
    description: 'Professionally crafted signature cocktails',
    includes: ['Welcome Cocktail', '2 Signature Drinks', 'Classic Martinis'],
    duration: 3,
    popular: true
  },
  {
    id: 'spirits-premium',
    name: 'Premium Open Bar',
    type: 'spirits',
    costPerPerson: 35.00,
    description: 'Full premium bar service with top-shelf spirits',
    includes: ['Premium Spirits', 'Wine Selection', 'Craft Beer', 'Cocktails'],
    duration: 5
  },
  {
    id: 'non-alc',
    name: 'Non-Alcoholic Beverages',
    type: 'non_alcoholic',
    costPerPerson: 6.00,
    description: 'Complete non-alcoholic beverage service',
    includes: ['Soft Drinks', 'Juices', 'Coffee', 'Tea', 'Water'],
    duration: 6
  }
];

const PackageCard: React.FC<{
  package: BeveragePackage;
  selected: boolean;
  onSelect: () => void;
  guestCount: number;
}> = ({ package: pkg, selected, onSelect, guestCount }) => {
  const totalCost = pkg.costPerPerson * guestCount;
  
  const typeColors = {
    wine: 'border-purple-200 bg-purple-50',
    beer: 'border-amber-200 bg-amber-50',
    spirits: 'border-blue-200 bg-blue-50',
    cocktail: 'border-pink-200 bg-pink-50',
    non_alcoholic: 'border-green-200 bg-green-50'
  };

  const typeIcons = {
    wine: '🍷',
    beer: '🍺',
    spirits: '🥃',
    cocktail: '🍸',
    non_alcoholic: '🥤'
  };

  return (
    <div
      className={`glass-panel p-4 cursor-pointer transition-all duration-200 ${
        selected ? 'ring-2 ring-accent shadow-lg scale-[1.02]' : 'hover:shadow-md'
      } ${typeColors[pkg.type]}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeIcons[pkg.type]}</span>
          <div>
            <h4 className="font-semibold text-primary flex items-center gap-2">
              {pkg.name}
              {pkg.popular && (
                <span className="px-2 py-1 bg-accent text-white text-xs rounded-full">
                  Popular
                </span>
              )}
            </h4>
            <p className="text-sm text-muted">{pkg.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-accent">${pkg.costPerPerson.toFixed(2)}</div>
          <div className="text-xs text-muted">per person</div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h5 className="text-sm font-medium text-primary mb-2">Includes:</h5>
          <div className="flex flex-wrap gap-1">
            {pkg.includes.map((item, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white/60 border border-default rounded text-xs text-primary"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">Duration: {pkg.duration} hours</span>
          <span className="font-semibold text-primary">
            Total: ${totalCost.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

const ConsumptionCalculator: React.FC<{
  selectedPackages: BeveragePackage[];
  guestCount: number;
  duration: number;
}> = ({ selectedPackages, guestCount, duration }) => {
  // Standard consumption rates per person per hour
  const consumptionRates = {
    wine: 0.5, // glasses per hour
    beer: 0.75,
    spirits: 0.3,
    cocktail: 0.4,
    non_alcoholic: 1.2
  };

  const calculations = selectedPackages.map(pkg => {
    const rate = consumptionRates[pkg.type];
    const totalConsumption = rate * guestCount * duration;
    const costPerHour = pkg.costPerPerson * guestCount / pkg.duration;
    
    return {
      package: pkg,
      estimatedConsumption: totalConsumption,
      hourlyRate: costPerHour
    };
  });

  const totalCost = selectedPackages.reduce((sum, pkg) => sum + (pkg.costPerPerson * guestCount), 0);

  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">Consumption Estimates</h4>
      
      <div className="space-y-3 mb-4">
        {calculations.map(({ package: pkg, estimatedConsumption }) => (
          <div key={pkg.id} className="flex justify-between items-center">
            <span className="text-primary">{pkg.name}:</span>
            <span className="font-medium text-primary">
              {Math.round(estimatedConsumption)} servings
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-default pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted">Total Cost</div>
            <div className="text-xl font-bold text-accent">${totalCost.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted">Per Guest</div>
            <div className="text-lg font-semibold text-primary">
              ${(totalCost / guestCount).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceTimeline: React.FC<{
  selectedPackages: BeveragePackage[];
}> = ({ selectedPackages }) => {
  const serviceSchedule = [
    { time: '6:00 PM', event: 'Welcome Cocktails', duration: '1 hour' },
    { time: '7:00 PM', event: 'Cocktail Hour', duration: '1 hour' },
    { time: '8:00 PM', event: 'Dinner Service', duration: '1.5 hours' },
    { time: '9:30 PM', event: 'Dancing & Reception', duration: '2.5 hours' },
    { time: '12:00 AM', event: 'Last Call', duration: '30 min' }
  ];

  return (
    <div className="glass-panel p-4">
      <h4 className="font-semibold text-accent mb-4">Service Timeline</h4>
      
      <div className="space-y-3">
        {serviceSchedule.map((item, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="w-16 text-sm font-medium text-primary">{item.time}</div>
            <div className="flex-1">
              <div className="font-medium text-primary">{item.event}</div>
              <div className="text-xs text-muted">{item.duration}</div>
            </div>
            <div className="text-xs text-muted">
              {selectedPackages.some(pkg => pkg.type === 'cocktail') && index < 2 && '🍸'}
              {selectedPackages.some(pkg => pkg.type === 'wine') && index >= 2 && index < 4 && '🍷'}
              {selectedPackages.some(pkg => pkg.type === 'spirits') && index >= 4 && '🥃'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BeveragePlannerPanel: React.FC<{
  eventId?: string;
}> = ({ eventId }) => {
  const { currentEvent } = useEventStore();
  const [selectedPackages, setSelectedPackages] = useState<BeveragePackage[]>([]);
  const [customDuration, setCustomDuration] = useState(4);

  if (!currentEvent) {
    return (
      <PanelShell title="Beverage Planner">
        <div className="text-center text-muted">No event selected</div>
      </PanelShell>
    );
  }

  const { guestCount } = currentEvent;

  const handlePackageToggle = (pkg: BeveragePackage) => {
    setSelectedPackages(prev => {
      const isSelected = prev.some(p => p.id === pkg.id);
      if (isSelected) {
        return prev.filter(p => p.id !== pkg.id);
      } else {
        return [...prev, pkg];
      }
    });
  };

  const packagesByType = beveragePackages.reduce((acc, pkg) => {
    if (!acc[pkg.type]) acc[pkg.type] = [];
    acc[pkg.type].push(pkg);
    return acc;
  }, {} as Record<string, BeveragePackage[]>);

  const toolbarRight = (
    <div className="flex gap-2">
      <button className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
        💾 Save Selection
      </button>
      <button className="px-3 py-1.5 bg-panel border border-default rounded-lg text-sm font-medium hover:bg-muted/10 transition-colors">
        📊 Generate Quote
      </button>
    </div>
  );

  return (
    <PanelShell title="Beverage Planner" toolbarRight={toolbarRight}>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Packages Selected</div>
            <div className="text-2xl font-bold text-accent">{selectedPackages.length}</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Total Cost</div>
            <div className="text-2xl font-bold text-primary">
              ${selectedPackages.reduce((sum, pkg) => sum + (pkg.costPerPerson * guestCount), 0).toLocaleString()}
            </div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-sm text-muted">Per Guest</div>
            <div className="text-2xl font-bold text-primary">
              ${selectedPackages.reduce((sum, pkg) => sum + pkg.costPerPerson, 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package Selection */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-semibold text-accent">Beverage Packages</h3>
            
            {Object.entries(packagesByType).map(([type, packages]) => (
              <div key={type}>
                <h4 className="font-medium text-primary mb-3 capitalize">
                  {type.replace('_', ' ')} Options
                </h4>
                <div className="space-y-3">
                  {packages.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      package={pkg}
                      selected={selectedPackages.some(p => p.id === pkg.id)}
                      onSelect={() => handlePackageToggle(pkg)}
                      guestCount={guestCount}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {selectedPackages.length > 0 && (
              <>
                <ConsumptionCalculator
                  selectedPackages={selectedPackages}
                  guestCount={guestCount}
                  duration={customDuration}
                />
                
                <ServiceTimeline selectedPackages={selectedPackages} />
              </>
            )}

            {/* Event Duration Control */}
            <div className="glass-panel p-4">
              <h4 className="font-semibold text-accent mb-3">Service Duration</h4>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-primary">
                  Hours of Service
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>2 hours</span>
                  <span className="font-medium text-primary">{customDuration} hours</span>
                  <span>8 hours</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-panel p-4">
              <h4 className="font-semibold text-accent mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full p-2 bg-accent/10 border border-accent/20 rounded text-accent text-sm hover:bg-accent/20 transition-colors">
                  🍾 Add Champagne Toast
                </button>
                <button className="w-full p-2 bg-ok/10 border border-ok/20 rounded text-ok text-sm hover:bg-ok/20 transition-colors">
                  🧊 Calculate Ice Needs
                </button>
                <button className="w-full p-2 bg-warn/10 border border-warn/20 rounded text-warn text-sm hover:bg-warn/20 transition-colors">
                  📋 Staffing Requirements
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
};

export default BeveragePlannerPanel;
