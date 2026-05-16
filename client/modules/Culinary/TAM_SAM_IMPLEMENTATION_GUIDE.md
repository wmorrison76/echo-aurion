# 🌍 TAM/SAM Implementation Guide - Vertical Market Expansion

**Goal**: Expand from niche R&D tool to multi-vertical platform  
**Timeline**: 4 weeks (Weeks 5-8)  
**Markets**: Fine Dining, Casual Dining, Fast Casual, Bakery, Catering  
**Estimated TAM**: $5B+ across verticals

---

## MARKET OVERVIEW

### Current State: Niche R&D Focus
- **TAM**: $100M (High-end fine dining only)
- **Features**: Generic recipe management + R&D Labs
- **Users**: Michelin chefs, test kitchens
- **Barrier**: Overwhelming for 80% of chefs

### Target State: Multi-Vertical Platform
- **TAM**: $5B+ (Fine Dining, Casual, Fast Casual, Bakery, Catering)
- **Features**: Vertical-specific workflows + compliance
- **Users**: All chef types, from solo to enterprise
- **Advantage**: AI-powered simplicity + professional power

---

## PHASE 1: RECIPE TYPE SYSTEM (Week 5)

### 1.1 Database Schema Updates

Create migration `supabase/migrations/005_recipe_types.sql`:

```sql
-- Add recipe type enum
CREATE TYPE recipe_type AS ENUM (
  'generic',
  'fine_dining',
  'casual_dining',
  'fast_casual',
  'bakery',
  'pastry',
  'beverage',
  'catering'
);

-- Add columns to recipes table
ALTER TABLE recipes ADD COLUMN recipe_type recipe_type DEFAULT 'generic';
ALTER TABLE recipes ADD COLUMN template_id UUID REFERENCES recipe_templates(id);
ALTER TABLE recipes ADD COLUMN vertical_settings JSONB DEFAULT '{}';

-- Create recipe templates table
CREATE TABLE recipe_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  recipe_type recipe_type NOT NULL,
  fields JSONB NOT NULL, -- Field definitions for this vertical
  workflow JSONB NOT NULL, -- Workflow steps for this vertical
  defaults JSONB, -- Default values
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create vertical settings table
CREATE TABLE vertical_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  vertical_type recipe_type NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, vertical_type)
);

-- Index for template lookups
CREATE INDEX idx_templates_type ON recipe_templates(recipe_type);
```

### 1.2 Type Definitions

Create `client/types/recipe-verticals.ts`:

```typescript
export type RecipeVertical = 
  | 'generic'
  | 'fine_dining'
  | 'casual_dining'
  | 'fast_casual'
  | 'bakery'
  | 'pastry'
  | 'beverage'
  | 'catering';

export interface RecipeVerticalConfig {
  id: RecipeVertical;
  label: string;
  description: string;
  icon: string;
  color: string;
  marketSize: string; // e.g., "$500M"
  features: string[];
  fields: string[]; // Additional fields for this vertical
  workflows: string[]; // Specific workflows
}

export const RECIPE_VERTICALS: Record<RecipeVertical, RecipeVerticalConfig> = {
  generic: {
    id: 'generic',
    label: 'Generic Recipe',
    description: 'Standard recipe management',
    icon: '🍳',
    color: 'slate',
    marketSize: '$2B',
    features: ['Basic recipe', 'Ingredients', 'Instructions'],
    fields: ['name', 'description', 'cuisine', 'difficulty'],
    workflows: ['create', 'edit', 'publish']
  },
  fine_dining: {
    id: 'fine_dining',
    label: 'Fine Dining',
    description: 'Premium tasting menus with plating instructions',
    icon: '👑',
    color: 'amber',
    marketSize: '$500M',
    features: [
      'Tasting menus',
      'Plating diagrams',
      'Mise-en-place',
      'Chef approval workflow',
      'High-quality images',
      'Technique notes'
    ],
    fields: [
      'name',
      'course',
      'plating_instructions',
      'technique_notes',
      'plate_cost',
      'execution_time',
      'chef_notes'
    ],
    workflows: [
      'create',
      'edit',
      'chef_review',
      'approve',
      'execute'
    ]
  },
  casual_dining: {
    id: 'casual_dining',
    label: 'Casual Dining',
    description: 'Full-service restaurant recipes with cost focus',
    icon: '🍽️',
    color: 'blue',
    marketSize: '$1.5B',
    features: [
      'Standard recipes',
      'Cost-per-plate',
      'Portion control',
      'Prep schedule',
      'Simple approval'
    ],
    fields: [
      'name',
      'description',
      'cuisine',
      'prep_time',
      'cook_time',
      'portion_size',
      'portion_cost',
      'margin_target'
    ],
    workflows: [
      'create',
      'edit',
      'review',
      'publish'
    ]
  },
  fast_casual: {
    id: 'fast_casual',
    label: 'Fast Casual / QSR',
    description: 'Quick service with speed and consistency focus',
    icon: '⚡',
    color: 'green',
    marketSize: '$1B',
    features: [
      'Assembly time tracking',
      'Standardized portions',
      'Quality checkpoints',
      'Assembly checklist',
      'Mobile-friendly'
    ],
    fields: [
      'name',
      'assembly_time',
      'standard_portion',
      'quality_checkpoints',
      'assembly_steps',
      'consistency_metrics'
    ],
    workflows: [
      'create',
      'quick_review',
      'publish',
      'execute'
    ]
  },
  bakery: {
    id: 'bakery',
    label: 'Bakery',
    description: 'Bread, pastry, and baking formulas',
    icon: '🥐',
    color: 'orange',
    marketSize: '$500M',
    features: [
      'Baker\'s percentages',
      'Fermentation tracking',
      'Hydration calculator',
      'Oven management',
      'Lamination tracking'
    ],
    fields: [
      'name',
      'baker_percentage',
      'hydration_ratio',
      'fermentation_time',
      'fermentation_temp',
      'oven_temp',
      'bake_time',
      'yield_weight'
    ],
    workflows: [
      'create',
      'formulate',
      'test',
      'document',
      'scale'
    ]
  },
  pastry: {
    id: 'pastry',
    label: 'Pastry & Dessert',
    description: 'Advanced pastry techniques and formulations',
    icon: '🍰',
    color: 'pink',
    marketSize: '$300M',
    features: [
      'Tempering guides',
      'Precision calculations',
      'Component assembly',
      'Advanced techniques',
      'Temperature curves'
    ],
    fields: [
      'name',
      'chocolate_type',
      'tempering_curve',
      'component_list',
      'precision_temps',
      'humidity_control',
      'altitude_adjustment'
    ],
    workflows: [
      'create',
      'formulate',
      'technique_guide',
      'assembly',
      'document'
    ]
  },
  beverage: {
    id: 'beverage',
    label: 'Beverage',
    description: 'Cocktails, coffee, and specialty drinks',
    icon: '🍹',
    color: 'red',
    marketSize: '$200M',
    features: [
      'Cocktail recipes',
      'Spirit inventory',
      'Bar costing',
      'Technique notes',
      'Pairing suggestions'
    ],
    fields: [
      'name',
      'base_spirit',
      'spirits_ml',
      'mixers',
      'garnish',
      'technique',
      'glassware',
      'serve_temp'
    ],
    workflows: [
      'create',
      'test',
      'document',
      'train'
    ]
  },
  catering: {
    id: 'catering',
    label: 'Catering',
    description: 'Large-format recipes for events',
    icon: '🎉',
    color: 'purple',
    marketSize: '$1B',
    features: [
      'Batch scaling',
      'Equipment planning',
      'Cold chain tracking',
      'Event management',
      'Team scheduling'
    ],
    fields: [
      'name',
      'base_yield',
      'batch_multiplier',
      'equipment_needed',
      'transport_time',
      'holding_temp',
      'shelf_life'
    ],
    workflows: [
      'create',
      'scale',
      'plan',
      'execute',
      'track'
    ]
  }
};
```

### 1.3 Create Vertical Selection Component

Create `client/components/VerticalSelector.tsx`:

```typescript
import { useState } from 'react';
import { RECIPE_VERTICALS, RecipeVertical } from '@/types/recipe-verticals';
import { cn } from '@/lib/utils';

interface VerticalSelectorProps {
  selected?: RecipeVertical;
  onSelect: (vertical: RecipeVertical) => void;
}

export function VerticalSelector({ selected, onSelect }: VerticalSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(RECIPE_VERTICALS).map(([key, config]) => {
        if (key === 'generic') return null; // Skip generic in selector

        return (
          <button
            key={key}
            onClick={() => onSelect(key as RecipeVertical)}
            className={cn(
              'p-4 rounded-lg border-2 text-left transition-all',
              selected === key
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="text-2xl mb-2">{config.icon}</div>
            <h3 className="font-semibold text-sm">{config.label}</h3>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <div className="text-xs mt-2 font-medium text-primary">{config.marketSize}</div>
          </button>
        );
      })}
    </div>
  );
}
```

### 1.4 Update Recipe Type in RecipeEditor

Update `client/pages/RecipeEditor.tsx`:

```typescript
export default function RecipeEditor() {
  const [recipeType, setRecipeType] = useState<RecipeVertical>('generic');

  return (
    <div>
      {/* Vertical selector in sidebar or settings */}
      {!recipe.id && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Recipe Type</h2>
          <VerticalSelector 
            selected={recipeType} 
            onSelect={setRecipeType}
          />
        </section>
      )}

      {/* Dynamic fields based on recipe type */}
      <RecipeEditorFields vertical={recipeType} recipe={recipe} />
    </div>
  );
}
```

---

## PHASE 2: FINE DINING TEMPLATE (Week 5)

### 2.1 Fine Dining Specific Fields

Create `client/components/FineDiningFields.tsx`:

```typescript
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface FineDiningFieldsProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export function FineDiningFields({ recipe, onChange }: FineDiningFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Course Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2">Course</label>
        <select 
          value={recipe.course || ''}
          onChange={(e) => onChange({ course: e.target.value })}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option>Amuse Bouche</option>
          <option>Appetizer</option>
          <option>Soup</option>
          <option>Salad</option>
          <option>Fish</option>
          <option>Meat</option>
          <option>Palate Cleanser</option>
          <option>Dessert</option>
          <option>Petit Four</option>
        </select>
      </div>

      {/* Plating Instructions */}
      <div>
        <label className="block text-sm font-semibold mb-2">Plating Instructions</label>
        <Textarea 
          value={recipe.plating_instructions || ''}
          onChange={(e) => onChange({ plating_instructions: e.target.value })}
          placeholder="Describe plating in detail..."
          rows={5}
        />
      </div>

      {/* Plating Diagram */}
      <div>
        <label className="block text-sm font-semibold mb-2">Plating Diagram</label>
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">Upload or draw plating diagram</p>
          <Button variant="outline" className="mt-4">Upload Image</Button>
        </div>
      </div>

      {/* Technique Notes */}
      <div>
        <label className="block text-sm font-semibold mb-2">Advanced Techniques</label>
        <Textarea 
          value={recipe.technique_notes || ''}
          onChange={(e) => onChange({ technique_notes: e.target.value })}
          placeholder="Describe advanced techniques required..."
          rows={4}
        />
      </div>

      {/* Execution Time */}
      <div>
        <label className="block text-sm font-semibold mb-2">Execution Time (minutes)</label>
        <Input 
          type="number"
          value={recipe.execution_time || 0}
          onChange={(e) => onChange({ execution_time: parseInt(e.target.value) })}
        />
      </div>

      {/* Chef Notes */}
      <div>
        <label className="block text-sm font-semibold mb-2">Chef Notes</label>
        <Textarea 
          value={recipe.chef_notes || ''}
          onChange={(e) => onChange({ chef_notes: e.target.value })}
          placeholder="Internal notes for the kitchen..."
          rows={3}
        />
      </div>

      {/* Mise-en-Place Tracker */}
      <div>
        <label className="block text-sm font-semibold mb-2">Mise-en-Place Checklist</label>
        <MiseEnPlaceTracker recipe={recipe} onChange={onChange} />
      </div>
    </div>
  );
}
```

### 2.2 Fine Dining Workflow

Create `client/components/FineDiningWorkflow.tsx`:

```typescript
interface FineDiningWorkflowProps {
  recipe: Recipe;
  onStatusChange: (status: string) => void;
}

export function FineDiningWorkflow({ recipe, onStatusChange }: FineDiningWorkflowProps) {
  const statuses = ['draft', 'submitted_for_review', 'chef_approved', 'in_service', 'archived'];
  const currentIndex = statuses.indexOf(recipe.status || 'draft');

  return (
    <div>
      <div className="flex items-center gap-2">
        {statuses.map((status, idx) => (
          <div key={status} className="flex items-center">
            <button
              onClick={() => onStatusChange(status)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                idx <= currentIndex
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              {idx + 1}
            </button>
            {idx < statuses.length - 1 && (
              <div 
                className={cn(
                  'h-1 w-12 mx-2',
                  idx < currentIndex ? 'bg-primary' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current step actions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        {recipe.status === 'draft' && (
          <button 
            onClick={() => onStatusChange('submitted_for_review')}
            className="btn btn-primary"
          >
            Submit for Chef Review
          </button>
        )}
        {recipe.status === 'submitted_for_review' && (
          <div>
            <p className="text-sm text-gray-600">Awaiting chef approval...</p>
            {/* Chef approval buttons visible only to chef */}
          </div>
        )}
        {recipe.status === 'chef_approved' && (
          <button 
            onClick={() => onStatusChange('in_service')}
            className="btn btn-primary"
          >
            Put in Service
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## PHASE 3: CASUAL DINING TEMPLATE (Week 5-6)

Create `client/components/CasualDiningFields.tsx`:

```typescript
interface CasualDiningFieldsProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export function CasualDiningFields({ recipe, onChange }: CasualDiningFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Prep Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Prep Time (min)</label>
          <input 
            type="number"
            value={recipe.prep_time || 0}
            onChange={(e) => onChange({ prep_time: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Cook Time (min)</label>
          <input 
            type="number"
            value={recipe.cook_time || 0}
            onChange={(e) => onChange({ cook_time: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      {/* Portion Control */}
      <div>
        <label className="block text-sm font-semibold mb-2">Standard Portion Size</label>
        <div className="flex gap-2">
          <input 
            type="number"
            placeholder="Size"
            value={recipe.portion_size || 0}
            onChange={(e) => onChange({ portion_size: parseFloat(e.target.value) })}
            className="flex-1 px-3 py-2 border rounded"
          />
          <select className="px-3 py-2 border rounded">
            <option>oz</option>
            <option>g</option>
            <option>ml</option>
          </select>
        </div>
      </div>

      {/* Cost Tracking */}
      <div>
        <label className="block text-sm font-semibold mb-2">Portion Cost</label>
        <input 
          type="number"
          step="0.01"
          value={recipe.portion_cost || 0}
          onChange={(e) => onChange({ portion_cost: parseFloat(e.target.value) })}
          className="w-full px-3 py-2 border rounded"
          placeholder="$0.00"
        />
      </div>

      {/* Margin Target */}
      <div>
        <label className="block text-sm font-semibold mb-2">Target Margin %</label>
        <input 
          type="number"
          value={recipe.margin_target || 60}
          onChange={(e) => onChange({ margin_target: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Prep Schedule */}
      <div>
        <label className="block text-sm font-semibold mb-2">Prep Steps</label>
        <PrepStepsList recipe={recipe} onChange={onChange} />
      </div>
    </div>
  );
}
```

---

## PHASE 4: FAST CASUAL / QSR TEMPLATE (Week 6)

Create `client/components/FastCasualFields.tsx`:

```typescript
interface FastCasualFieldsProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export function FastCasualFields({ recipe, onChange }: FastCasualFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Assembly Time */}
      <div>
        <label className="block text-sm font-semibold mb-2">Assembly Time (seconds)</label>
        <input 
          type="number"
          value={recipe.assembly_time || 0}
          onChange={(e) => onChange({ assembly_time: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border rounded"
        />
        <p className="text-xs text-muted-foreground mt-2">Target: under 60 seconds</p>
      </div>

      {/* Standard Portion */}
      <div>
        <label className="block text-sm font-semibold mb-2">Standardized Portion</label>
        <PortionStandardizer recipe={recipe} onChange={onChange} />
      </div>

      {/* Quality Checkpoints */}
      <div>
        <label className="block text-sm font-semibold mb-2">Quality Checkpoints</label>
        <QualityChecklist recipe={recipe} onChange={onChange} />
      </div>

      {/* Assembly Steps */}
      <div>
        <label className="block text-sm font-semibold mb-2">Assembly Steps (in order)</label>
        <AssemblyStepsTracker recipe={recipe} onChange={onChange} />
      </div>

      {/* Consistency Metrics */}
      <div>
        <label className="block text-sm font-semibold mb-2">Consistency Metrics</label>
        <ConsistencyMetrics recipe={recipe} onChange={onChange} />
      </div>
    </div>
  );
}
```

---

## PHASE 5: BAKERY MODULE (Week 6-7)

### 5.1 Bakery Database Schema

Create migration `supabase/migrations/006_bakery_module.sql`:

```sql
CREATE TABLE bakery_doughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes,
  name VARCHAR(255) NOT NULL,
  baker_percentage NUMERIC(5,2),
  hydration_ratio NUMERIC(5,2),
  fermentation_time_minutes INT,
  fermentation_temp_celsius NUMERIC(5,2),
  bulk_fermentation_start TIMESTAMP,
  bulk_fermentation_end TIMESTAMP,
  autolyse_minutes INT,
  fold_schedule JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE bakery_ovens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes,
  oven_name VARCHAR(255),
  bake_temp_celsius NUMERIC(5,2),
  bake_time_minutes INT,
  steam_injection BOOLEAN,
  steam_duration_minutes INT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE bakery_fermentation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dough_id UUID NOT NULL REFERENCES bakery_doughs,
  logged_at TIMESTAMP DEFAULT now(),
  temperature_celsius NUMERIC(5,2),
  humidity_percent NUMERIC(5,2),
  notes TEXT
);

CREATE INDEX idx_bakery_recipe ON bakery_doughs(recipe_id);
CREATE INDEX idx_oven_recipe ON bakery_ovens(recipe_id);
```

### 5.2 Bakery Fields Component

Create `client/components/BakeryFields.tsx`:

```typescript
interface BakeryFieldsProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export function BakeryFields({ recipe, onChange }: BakeryFieldsProps) {
  const [doughs, setDoughs] = useState<Dough[]>(recipe.doughs || []);

  return (
    <div className="space-y-8">
      {/* Baker's Percentages */}
      <section>
        <h3 className="font-semibold mb-4">Baker's Percentages</h3>
        <BakersPercentageCalculator 
          doughs={doughs} 
          onChange={setDoughs}
        />
      </section>

      {/* Fermentation Tracking */}
      <section>
        <h3 className="font-semibold mb-4">Fermentation Schedule</h3>
        <FermentationTracker 
          doughs={doughs}
          onChange={setDoughs}
        />
      </section>

      {/* Oven Management */}
      <section>
        <h3 className="font-semibold mb-4">Oven Management</h3>
        <OvenScheduler 
          recipe={recipe}
          onChange={onChange}
        />
      </section>

      {/* Lamination Tracking (for croissants, danish) */}
      <section>
        <h3 className="font-semibold mb-4">Lamination (if applicable)</h3>
        <LaminationTracker 
          doughs={doughs}
          onChange={setDoughs}
        />
      </section>

      {/* Yield Calculator */}
      <section>
        <h3 className="font-semibold mb-4">Yield & Scaling</h3>
        <YieldCalculator doughs={doughs} />
      </section>
    </div>
  );
}
```

### 5.3 Bakery Workspace

Create `client/pages/sections/BakeryWorkspace.tsx`:

```typescript
export default function BakeryWorkspace() {
  const [activeBatch, setActiveBatch] = useState<Dough | null>(null);

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Dough List */}
      <div className="col-span-1">
        <BakeryBatchList />
      </div>

      {/* Center: Fermentation Timeline */}
      <div className="col-span-1">
        <FermentationTimeline activeBatch={activeBatch} />
      </div>

      {/* Right: Oven Schedule */}
      <div className="col-span-1">
        <OvenScheduleGrid />
      </div>
    </div>
  );
}
```

---

## PHASE 6: CATERING MODULE (Week 8)

### 6.1 Catering Schema

Create migration `supabase/migrations/007_catering_module.sql`:

```sql
CREATE TABLE catering_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  guest_count INT NOT NULL,
  service_type VARCHAR(100), -- buffet, plated, cocktail
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE catering_batch_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES catering_events,
  recipe_id UUID NOT NULL REFERENCES recipes,
  guest_count INT NOT NULL,
  batch_multiplier NUMERIC(10,2),
  preparation_date DATE,
  equipment_needed JSONB,
  team_assignments JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE catering_team_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES catering_events,
  staff_member_id UUID,
  role VARCHAR(100),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  assigned_tasks JSONB
);

CREATE INDEX idx_catering_events_user ON catering_events(user_id, event_date);
```

### 6.2 Catering Components

Create `client/pages/sections/CateringWorkspace.tsx`:

```typescript
export default function CateringWorkspace() {
  const [events, setEvents] = useState<CateringEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CateringEvent | null>(null);

  return (
    <div className="space-y-6">
      {/* Event Calendar */}
      <CateringEventCalendar 
        events={events}
        onSelectEvent={setSelectedEvent}
      />

      {/* Batch Calculator */}
      {selectedEvent && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Scale Recipes for {selectedEvent.guest_count} Guests</h2>
          <BatchScalingCalculator 
            event={selectedEvent}
            onScaleRecipe={(recipe, multiplier) => {
              // Scale recipe and update
            }}
          />
        </section>
      )}

      {/* Team Scheduling */}
      {selectedEvent && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Team Schedule</h2>
          <CateringTeamScheduler event={selectedEvent} />
        </section>
      )}

      {/* Execution Checklist */}
      {selectedEvent && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Execution Checklist</h2>
          <ExecutionChecklist event={selectedEvent} />
        </section>
      )}
    </div>
  );
}
```

---

## COMPLIANCE FEATURES

### Allergen Management Enhancement

Create `client/components/AllergenEnhanced.tsx`:

```typescript
interface AllergenEnhancedProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export function AllergenEnhanced({ recipe, onChange }: AllergenEnhancedProps) {
  return (
    <div className="space-y-6">
      {/* Top 14 Allergens */}
      <div>
        <h3 className="font-semibold mb-4">Top 14 Allergens (EU/FDA)</h3>
        <allergensList.map(allergen => (
          <label key={allergen} className="flex items-center gap-2">
            <input 
              type="checkbox"
              checked={recipe.allergens?.includes(allergen)}
              onChange={(e) => {
                const updated = e.target.checked 
                  ? [...(recipe.allergens || []), allergen]
                  : recipe.allergens?.filter(a => a !== allergen);
                onChange({ allergens: updated });
              }}
            />
            {allergen}
          </label>
        ))}
      </div>

      {/* Cross-Contamination Risk */}
      <div>
        <h3 className="font-semibold mb-4">Cross-Contamination Risks</h3>
        <CrossContaminationMatrix 
          allergens={recipe.allergens || []}
          onChange={(risks) => onChange({ contamination_risks: risks })}
        />
      </div>

      {/* Supplier Verification */}
      <div>
        <h3 className="font-semibold mb-4">Ingredient Allergen Verification</h3>
        <SupplierAllergenCerts 
          recipe={recipe}
          onChange={onChange}
        />
      </div>

      {/* Label Generation */}
      <div>
        <button className="btn btn-primary w-full">
          Generate FDA Allergen Label
        </button>
      </div>
    </div>
  );
}
```

### FDA Nutrition Labeling

Create `client/components/NutritionLabelFDA.tsx`:

```typescript
interface NutritionLabelFDAProps {
  recipe: Recipe;
  servingSize: number;
}

export function NutritionLabelFDA({ recipe, servingSize }: NutritionLabelFDAProps) {
  const nutrition = calculateNutritionFDA(recipe, servingSize);

  return (
    <div className="border-4 border-black p-4 font-mono text-sm" style={{ maxWidth: '150px' }}>
      <h2 className="font-bold text-lg">Nutrition Facts</h2>
      <p className="text-xs">Serving Size: {servingSize}g</p>
      <hr className="my-2 border-black" />
      
      <div>
        <p><strong>Calories</strong> {nutrition.calories}</p>
        <hr className="my-1" />
        
        <table className="w-full text-xs">
          <tbody>
            <tr>
              <td><strong>Total Fat</strong></td>
              <td>{nutrition.totalFat}g</td>
              <td className="text-right">{nutrition.totalFatPercent}%</td>
            </tr>
            <tr>
              <td>Saturated Fat</td>
              <td>{nutrition.saturatedFat}g</td>
              <td className="text-right">{nutrition.saturatedFatPercent}%</td>
            </tr>
            {/* ... more nutrients ... */}
          </tbody>
        </table>
      </div>

      <p className="text-xs mt-4">
        <strong>FDA Compliant Label - Generated {new Date().toLocaleDateString()}</strong>
      </p>
    </div>
  );
}
```

---

## VERTICAL ONBOARDING FLOWS

### Signup → Vertical Selection

Create `client/pages/Onboarding.tsx`:

```typescript
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [selectedVertical, setSelectedVertical] = useState<RecipeVertical>();

  const steps = [
    { title: 'Welcome', component: <WelcomeStep /> },
    { title: 'Select Your Vertical', component: <VerticalSelector onSelect={setSelectedVertical} /> },
    { title: 'Create First Recipe', component: <FirstRecipeStep vertical={selectedVertical} /> },
    { title: 'Invite Team', component: <InviteTeamStep /> },
    { title: 'Ready to Cook!', component: <OnboardingComplete /> }
  ];

  return (
    <div className="max-w-lg mx-auto py-12">
      <ProgressIndicator currentStep={step} totalSteps={steps.length} />
      
      {steps[step].component}

      <div className="flex gap-4 mt-8">
        <button 
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          Previous
        </button>
        <button 
          onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## IMPLEMENTATION CHECKLIST

### Week 5: Recipe Type System + Fine Dining
- [ ] Database migrations for recipe types
- [ ] Recipe type enum and config
- [ ] Vertical selector component
- [ ] Fine Dining fields & workflow
- [ ] Casual Dining template

### Week 6: Fast Casual + Bakery Basics
- [ ] Fast Casual fields
- [ ] Bakery dough tracking UI
- [ ] Bakery fermentation tracker
- [ ] Basic oven management

### Week 7: Pastry + Compliance
- [ ] Pastry module setup
- [ ] Allergen enhancements
- [ ] FDA nutrition label generation
- [ ] Cross-contamination matrix

### Week 8: Catering + Integration
- [ ] Catering event management
- [ ] Batch scaling calculator
- [ ] Team scheduling
- [ ] Event execution checklist

---

## TAM/SAM EXPANSION METRICS

| Vertical | Current Users | Year 1 Target | Market Size |
|----------|---------------|---------------|------------|
| Fine Dining | 50 | 200 | $500M |
| Casual Dining | 20 | 500 | $1.5B |
| Fast Casual | 0 | 300 | $1B |
| Bakery | 0 | 150 | $500M |
| Catering | 0 | 100 | $1B |
| Pastry | 0 | 80 | $300M |
| **Total** | **70** | **1,330** | **$5B+** |

---

## GTM STRATEGY BY VERTICAL

**Fine Dining** (Premium positioning)
- Land Michelin-starred restaurants
- Case studies with celebrity chefs
- Premium pricing ($500-1000/mo)

**Casual Dining** (Volume play)
- Regional restaurant groups
- Cost-per-plate focus
- Mid-tier pricing ($200-500/mo)

**Bakery** (Specialized market)
- Partnerships with bakery schools
- Flour supplier integrations
- Niche pricing ($150-300/mo)

**Catering** (Event-based)
- Catering company partnerships
- Event planning integrations
- Per-event or usage-based pricing

---

**Ready to implement. Which vertical should we start with?**
