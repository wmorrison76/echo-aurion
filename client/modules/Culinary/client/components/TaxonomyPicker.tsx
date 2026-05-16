import React from 'react';
import { LUCCCA_TAXONOMY, axisOptions, TaxonomySelection, defaultSelection, labelFor } from '@/lib/taxonomy';

export default function TaxonomyPicker({ value, onChange }: { value?: Partial<TaxonomySelection>; onChange: (t: TaxonomySelection) => void; }) {
  const v: TaxonomySelection = { ...defaultSelection, ...(value || {}) };
  const set = (patch: Partial<TaxonomySelection>) => onChange({ ...v, ...patch });

  const Opts = {
    course: axisOptions('course'),
    pastry: axisOptions('pastry'),
    technique: axisOptions('technique'),
    cuisine: axisOptions('cuisines'),
    diets: axisOptions('diets'),
    allergens: axisOptions('allergens'),
    mealPeriod: axisOptions('meal-period'),
    serviceStyle: axisOptions('service-style'),
    components: axisOptions('components'),
    equipment: axisOptions('equipment'),
    difficulty: axisOptions('difficulty'),
  } as const;

  const TagList = ({ items }: { items: string[] }) => (
    <div className="flex flex-wrap gap-1 text-xs">
      {items.map((s) => (
        <span key={s} className="px-2 py-0.5 rounded border bg-white dark:bg-zinc-900">{labelFor(s)}</span>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold mb-1">Course / Service</div>
        <select multiple value={v.course} onChange={(e)=> set({ course: Array.from(e.target.selectedOptions).map(o=>o.value).slice(0,6) })} className="w-full border rounded p-2 text-sm min-h-[3rem] max-h-40 overflow-auto">
          {Opts.course.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        {v.course.length? <TagList items={v.course} />: null}
      </div>
      <div>
        <div className="text-xs font-semibold mb-1">Pastry</div>
        <select multiple value={v.pastry} onChange={(e)=> set({ pastry: Array.from(e.target.selectedOptions).map(o=>o.value).slice(0,6) })} className="w-full border rounded p-2 text-sm min-h-[3rem] max-h-40 overflow-auto">
          {Opts.pastry.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        {v.pastry.length? <TagList items={v.pastry} />: null}
      </div>
      <div>
        <div className="text-xs font-semibold mb-1">Technique (up to 3)</div>
        <select multiple value={v.technique} onChange={(e)=> set({ technique: Array.from(e.target.selectedOptions).map(o=>o.value).slice(0,3) })} className="w-full border rounded p-2 text-sm min-h-[3rem] max-h-40 overflow-auto">
          {Opts.technique.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        {v.technique.length? <TagList items={v.technique} />: null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold mb-1">Cuisine (exactly one)</div>
          <select value={v.cuisine || ''} onChange={(e)=> set({ cuisine: e.target.value || undefined })} className="w-full border rounded p-2 text-sm">
            <option value="">—</option>
            {Opts.cuisine.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-semibold mb-1">Difficulty</div>
          <select value={v.difficulty || ''} onChange={(e)=> set({ difficulty: e.target.value || undefined })} className="w-full border rounded p-2 text-sm">
            <option value="">—</option>
            {Opts.difficulty.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold mb-1">Meal Period</div>
          <select value={v.mealPeriod || ''} onChange={(e)=> set({ mealPeriod: e.target.value || undefined })} className="w-full border rounded p-2 text-sm">
            <option value="">—</option>
            {Opts.mealPeriod.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-semibold mb-1">Service Style</div>
          <select value={v.serviceStyle || ''} onChange={(e)=> set({ serviceStyle: e.target.value || undefined })} className="w-full border rounded p-2 text-sm">
            <option value="">—</option>
            {Opts.serviceStyle.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold mb-1">Diets</div>
        <select multiple value={v.diets} onChange={(e)=> set({ diets: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="w-full border rounded p-2 text-sm min-h-[3rem] max-h-40 overflow-auto">
          {Opts.diets.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        {v.diets.length? <TagList items={v.diets} />: null}
      </div>
      <div>
        <div className="text-xs font-semibold mb-1">Allergens</div>
        <select multiple value={v.allergens} onChange={(e)=> set({ allergens: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="w-full border rounded p-2 text-sm min-h-[3rem] max-h-40 overflow-auto">
          {Opts.allergens.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        {v.allergens.length? <TagList items={v.allergens} />: null}
      </div>
      <div>
        <div className="text-xs font-semibold mb-1">Components</div>
        <select multiple value={v.components} onChange={(e)=> set({ components: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="w-full border rounded p-2 text-sm min-h-[3rem] max-h-40 overflow-auto">
          {Opts.components.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        {v.components.length? <TagList items={v.components} />: null}
      </div>
      <div>
        <div className="text-xs font-semibold mb-1">Equipment</div>
        <select multiple value={v.equipment} onChange={(e)=> set({ equipment: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="w-full border rounded p-2 text-sm min-h-[3rem] max-h-40 overflow-auto">
          {Opts.equipment.map(o=> <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        {v.equipment.length? <TagList items={v.equipment} />: null}
      </div>
    </div>
  );
}
