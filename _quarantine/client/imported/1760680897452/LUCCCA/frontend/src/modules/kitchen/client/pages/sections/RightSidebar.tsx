import React, { useEffect, useState } from "react";
import { Send, Palette } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { axisOptions, TaxonomySelection } from "@/lib/taxonomy";

interface RightSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  // legacy fields kept for compatibility
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  selectedNationality: string[];
  onNationalityChange: (nationality: string[]) => void;
  selectedCourses: string[];
  onCoursesChange: (courses: string[]) => void;
  selectedRecipeType: string[];
  onRecipeTypeChange: (recipeType: string[]) => void;
  selectedPrepMethod: string[];
  onPrepMethodChange: (prepMethod: string[]) => void;
  selectedCookingEquipment: string[];
  onCookingEquipmentChange: (cookingEquipment: string[]) => void;
  selectedRecipeAccess: string[];
  onRecipeAccessChange: (recipeAccess: string[]) => void;
  image: string | null;
  onImageChange: (image: string | null) => void;
  onRecipeImport?: (recipeData: any) => void | Promise<void>;
  // taxonomy
  taxonomy: TaxonomySelection;
  onTaxonomyChange: (t: TaxonomySelection) => void;
}

const recipeAccessList = ["Bar", "Global", "Grab & Go", "Outlet", "Pastry"];

export default function RightSidebar(props: RightSidebarProps) {
  const {
    isCollapsed,
    selectedAllergens,
    onAllergensChange,
    selectedRecipeAccess,
    onRecipeAccessChange,
    selectedCookingEquipment,
    onCookingEquipmentChange,
    image,
    onImageChange,
    onRecipeImport,
    taxonomy,
    onTaxonomyChange,
    selectedRecipeType,
    onRecipeTypeChange,
  } = props;

  const [status, setStatus] = useState("active");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [notes, setNotes] = useState(() => {
    try { return localStorage.getItem('recipe:chef-notes') || ""; } catch { return ""; }
  });
  const [isImporting, setIsImporting] = useState(false);
  const [open, setOpen] = useState<string[]>([]);

  const toggle = (arr: string[], set: (v: string[]) => void, item: string) =>
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);

  const tset = (patch: Partial<TaxonomySelection>) =>
    onTaxonomyChange({ ...taxonomy, ...patch });

  const limitTechnique = (next: string[]) => next.slice(0, 3);


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const map: Record<string, string> = { p: 'pastry', t: 'technique', c: 'course', a: 'allergens', d: 'diets', m: 'meal', u: 'cuisine', s: 'service', y: 'difficulty', e: 'equipment' };
      const v = map[e.key.toLowerCase()];
      if (!v) return;
      e.preventDefault();
      if (isCollapsed) props.onToggle();
      setOpen((prev)=> prev.includes(v)? prev : [...prev, v]);
      setTimeout(()=> document.querySelector(`[data-accordion-section='${v}']`)?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 0);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isCollapsed, props.onToggle]);

  const handleUrlSubmit = async () => {
    if (!recipeUrl || isImporting) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/recipe/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: recipeUrl }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || `Import failed (${res.status})`);
      onRecipeImport?.(data);
      setRecipeUrl("");
    } catch (e: any) {
      alert(e?.message || "Failed to import recipe");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <button
        aria-label="Toggle sidebar"
        onClick={props.onToggle}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[71] bg-background border border-gray-300 rounded-l-full shadow px-2 py-3 hover:bg-muted no-callout select-none"
        style={{ transform: "translateY(-50%)" }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="block w-0.5 h-4 bg-gray-400"></span>
          <span className="block w-0.5 h-4 bg-gray-400"></span>
          <span className="block w-0.5 h-4 bg-gray-400"></span>
        </div>
      </button>
      <div
        onContextMenu={(e) => e.preventDefault()}
        className={`fixed top-16 right-0 z-[70] ${isCollapsed ? "translate-x-full" : "translate-x-0"} w-72 h-[80vh] bg-gradient-to-b from-gray-100/60 via-gray-200/50 to-gray-300/60 backdrop-blur-sm border-l border-t border-gray-400/50 rounded-tl-2xl rounded-bl-2xl shadow-inner transition-transform duration-500 ease-in-out overflow-hidden no-callout text-black`}
      >
        {!isCollapsed && (
          <div className="flex flex-col h-full">
            <div className="p-4 pt-4 border-b border-gray-300/50">
              <div>
                <label className="block text-sm font-medium mb-1">Recipe URL</label>
                <div className="flex gap-1">
                  <input
                    className="flex-1 border border-gray-400/50 p-2 rounded bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors text-sm placeholder-gray-400"
                    value={recipeUrl}
                    onChange={(e) => setRecipeUrl(e.target.value)}
                    placeholder="Enter Recipe Url"
                  />
                  <button
                    onClick={async()=>{ try{ const t=await navigator.clipboard.readText(); if(t) setRecipeUrl(t);} catch{} }}
                    className="px-3 py-2 rounded border border-gray-400/50 bg-white/70 hover:bg-white/90 text-sm"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                  <button
                    onClick={handleUrlSubmit}
                    disabled={isImporting}
                    className={`px-3 py-2 text-white rounded ${isImporting ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"}`}
                  >
                    {isImporting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <div>
                <label className="block text-sm font-medium mb-1">Recipe Image</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onImageChange(URL.createObjectURL(f));
                  }}
                  className="w-full text-xs border border-gray-400/50 p-2 rounded bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors"
                />
                {image && (
                  <div className="mt-2">
                    <img src={image} alt="Preview" className="w-full h-32 object-cover rounded border" />
                    <button
                      className="w-full mt-2 px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                      onClick={() => {
                        const ev = new CustomEvent("openImageEditor", { detail: { image } });
                        window.dispatchEvent(ev);
                      }}
                    >
                      <Palette className="w-3 h-3" /> Edit Image
                    </button>
                  </div>
                )}
              </div>

              <Accordion type="multiple" value={open} onValueChange={(v)=> setOpen(Array.isArray(v)? v : [v])}>
                <AccordionItem value="recipe" data-accordion-section="recipe">
                  <AccordionTrigger>Recipe</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-xs space-y-1">
                      <label className="flex items-center gap-2"><input type="checkbox" className="scale-75" checked={selectedRecipeType.includes('Full Recipe')} onChange={()=> toggle(selectedRecipeType, onRecipeTypeChange, 'Full Recipe')} /> Full Recipe</label>
                      <label className="flex items-center gap-2"><input type="checkbox" className="scale-75" checked={selectedRecipeType.includes('Sub Recipe')} onChange={()=> toggle(selectedRecipeType, onRecipeTypeChange, 'Sub Recipe')} /> Sub Recipe</label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="status" data-accordion-section="status">
                  <AccordionTrigger>Status</AccordionTrigger>
                  <AccordionContent>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="draft">In Development</option>
                      <option value="archived">Archived</option>
                    </select>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="access" data-accordion-section="access">
                  <AccordionTrigger>Recipe Access</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {recipeAccessList.map((m) => (
                        <label key={m} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={selectedRecipeAccess.includes(m)}
                            onChange={() => toggle(selectedRecipeAccess, onRecipeAccessChange, m)}
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="allergens" data-accordion-section="allergens">
                  <AccordionTrigger>Allergens</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {axisOptions("allergens").map((o) => (
                        <label key={o.slug} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={taxonomy.allergens.includes(o.slug)}
                            onChange={() => {
                              const next = taxonomy.allergens.includes(o.slug)
                                ? taxonomy.allergens.filter((x) => x !== o.slug)
                                : [...taxonomy.allergens, o.slug];
                              tset({ allergens: next });
                              onAllergensChange(next);
                            }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="diets" data-accordion-section="diets">
                  <AccordionTrigger>Diets</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {axisOptions("diets").map((o) => (
                        <label key={o.slug} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={taxonomy.diets.includes(o.slug)}
                            onChange={() => {
                              const next = taxonomy.diets.includes(o.slug)
                                ? taxonomy.diets.filter((x) => x !== o.slug)
                                : [...taxonomy.diets, o.slug];
                              tset({ diets: next });
                            }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="meal" data-accordion-section="meal">
                  <AccordionTrigger>Meal Period</AccordionTrigger>
                  <AccordionContent>
                    <select
                      className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50"
                      value={taxonomy.mealPeriod || ""}
                      onChange={(e) => tset({ mealPeriod: e.target.value || undefined })}
                    >
                      <option value="">—</option>
                      {axisOptions("meal-period").map((o) => (
                        <option key={o.slug} value={o.slug}>{o.label}</option>
                      ))}
                    </select>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cuisine" data-accordion-section="cuisine">
                  <AccordionTrigger>Cuisine</AccordionTrigger>
                  <AccordionContent>
                    <select
                      className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50"
                      value={taxonomy.cuisine || ""}
                      onChange={(e) => tset({ cuisine: e.target.value || undefined })}
                    >
                      <option value="">—</option>
                      {axisOptions("cuisines").map((o) => (
                        <option key={o.slug} value={o.slug}>{o.label}</option>
                      ))}
                    </select>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="service" data-accordion-section="service">
                  <AccordionTrigger>Service Style</AccordionTrigger>
                  <AccordionContent>
                    <select
                      className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50"
                      value={taxonomy.serviceStyle || ""}
                      onChange={(e) => tset({ serviceStyle: e.target.value || undefined })}
                    >
                      <option value="">—</option>
                      {axisOptions("service-style").map((o) => (
                        <option key={o.slug} value={o.slug}>{o.label}</option>
                      ))}
                    </select>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="difficulty" data-accordion-section="difficulty">
                  <AccordionTrigger>Difficulty</AccordionTrigger>
                  <AccordionContent>
                    <select
                      className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50"
                      value={taxonomy.difficulty || ""}
                      onChange={(e) => tset({ difficulty: e.target.value || undefined })}
                    >
                      <option value="">—</option>
                      {axisOptions("difficulty").map((o) => (
                        <option key={o.slug} value={o.slug}>{o.label}</option>
                      ))}
                    </select>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="course" data-accordion-section="course">
                  <AccordionTrigger>Course / Service</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-1 max-h-40 overflow-auto">
                      {axisOptions("course").map((o) => (
                        <label key={o.slug} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={taxonomy.course.includes(o.slug)}
                            onChange={() => {
                              const next = taxonomy.course.includes(o.slug)
                                ? taxonomy.course.filter((x) => x !== o.slug)
                                : [...taxonomy.course, o.slug];
                              tset({ course: next });
                            }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="technique" data-accordion-section="technique">
                  <AccordionTrigger>Technique (up to 3)</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-1 max-h-40 overflow-auto">
                      {axisOptions("technique").map((o) => (
                        <label key={o.slug} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={taxonomy.technique.includes(o.slug)}
                            onChange={() => {
                              const has = taxonomy.technique.includes(o.slug);
                              const next = has
                                ? taxonomy.technique.filter((x) => x !== o.slug)
                                : limitTechnique([...taxonomy.technique, o.slug]);
                              tset({ technique: next });
                            }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pastry" data-accordion-section="pastry">
                  <AccordionTrigger>Pastry</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-1 max-h-40 overflow-auto">
                      {axisOptions("pastry").map((o) => (
                        <label key={o.slug} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={taxonomy.pastry.includes(o.slug)}
                            onChange={() => {
                              const next = taxonomy.pastry.includes(o.slug)
                                ? taxonomy.pastry.filter((x) => x !== o.slug)
                                : [...taxonomy.pastry, o.slug];
                              tset({ pastry: next });
                            }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="components" data-accordion-section="components">
                  <AccordionTrigger>Components</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-1 max-h-40 overflow-auto">
                      {axisOptions("components").map((o) => (
                        <label key={o.slug} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={taxonomy.components.includes(o.slug)}
                            onChange={() => {
                              const next = taxonomy.components.includes(o.slug)
                                ? taxonomy.components.filter((x) => x !== o.slug)
                                : [...taxonomy.components, o.slug];
                              tset({ components: next });
                            }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="equipment" data-accordion-section="equipment">
                  <AccordionTrigger>Equipment</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-1 max-h-40 overflow-auto">
                      {axisOptions("equipment").map((o) => (
                        <label key={o.slug} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="scale-75"
                            checked={taxonomy.equipment.includes(o.slug) || selectedCookingEquipment.includes(o.slug)}
                            onChange={() => {
                              const next = taxonomy.equipment.includes(o.slug)
                                ? taxonomy.equipment.filter((x) => x !== o.slug)
                                : [...taxonomy.equipment, o.slug];
                              tset({ equipment: next });
                              // keep legacy in sync if possible
                              const legacyNext = selectedCookingEquipment.includes(o.slug)
                                ? selectedCookingEquipment.filter((x) => x !== o.slug)
                                : [...selectedCookingEquipment, o.slug];
                              onCookingEquipmentChange(legacyNext);
                            }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notes" data-accordion-section="notes">
                  <AccordionTrigger>Chef Notes</AccordionTrigger>
                  <AccordionContent>
                    <textarea
                      value={notes}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNotes(v);
                        try { localStorage.setItem('recipe:chef-notes', v); } catch {}
                        try { window.dispatchEvent(new CustomEvent('recipe:chef-notes', { detail: v })); } catch {}
                      }}
                      placeholder="Notes only you see. Printed under Nutrition."
                      className="w-full border border-gray-400/50 p-2 rounded bg-gray-100/50 backdrop-blur-sm focus:bg-white/80 transition-colors h-20 text-sm placeholder-gray-400"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
