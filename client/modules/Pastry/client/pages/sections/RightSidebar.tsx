import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FlaskConical, Palette, Send } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { axisOptions, TaxonomySelection } from "@/lib/taxonomy";
import { useOptionalRDLabStore } from "@/stores/rdLabStore";
type RightSidebarMode = "recipe" | "rnd";
interface RightSidebarProps {
  mode?: RightSidebarMode;
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenLabs?: () => void;
  onCloseLabs?: () => void;
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
  taxonomy: TaxonomySelection;
  onTaxonomyChange: (t: TaxonomySelection) => void;
  isGlobal?: boolean;
  onGlobalChange?: (isGlobal: boolean) => void;
}
const recipeAccessList = ["Bar", "Global", "Grab & Go", "Outlet", "Pastry"];
export default function RightSidebar(props: RightSidebarProps) {
  const {
    mode = "recipe",
    isCollapsed,
    onToggle,
    onOpenLabs,
    onCloseLabs,
    selectedAllergens,
    onAllergensChange,
    selectedNationality,
    onNationalityChange,
    selectedCourses,
    onCoursesChange,
    selectedRecipeType,
    onRecipeTypeChange,
    selectedPrepMethod,
    onPrepMethodChange,
    selectedCookingEquipment,
    onCookingEquipmentChange,
    selectedRecipeAccess,
    onRecipeAccessChange,
    image,
    onImageChange,
    onRecipeImport,
    taxonomy,
    onTaxonomyChange,
    isGlobal = false,
    onGlobalChange,
  } = props;
  const [status, setStatus] = useState("active");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem("recipe:chef-notes") || "";
    } catch {
      return "";
    }
  });
  const [isImporting, setIsImporting] = useState(false);
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (
    arr: string[],
    set: (value: string[]) => void,
    item: string,
  ) => {
    set(
      arr.includes(item)
        ? arr.filter((value) => value !== item)
        : [...arr, item],
    );
  };
  const tset = (patch: Partial<TaxonomySelection>) =>
    onTaxonomyChange({ ...taxonomy, ...patch });
  const limitTechnique = (next: string[]) => next.slice(0, 3);
  const labStore = useOptionalRDLabStore();
  const isRndMode = mode === "rnd";
  const focusExperiment = useMemo(() => {
    if (!labStore) return undefined;
    return (
      labStore.experiments.find(
        (item) => item.id === labStore.focusExperimentId,
      ) ?? labStore.experiments[0]
    );
  }, [labStore]);
  const discoveryQueue = useMemo(() => {
    if (!labStore) return [];
    const { experiments, focusExperimentId } = labStore;
    const currentId = focusExperiment?.id ?? focusExperimentId;
    const queue = experiments.filter((item) => item.id !== currentId);
    const source = queue.length > 0 ? queue : experiments;
    return source.slice(0, 4);
  }, [labStore, focusExperiment?.id]);
  const backlog = labStore?.backlog ?? [];
  const insights = labStore?.insights ?? [];
  const panelClass = useMemo(() => {
    return [
      "fixed top-16 right-10 z-[70] h-[80vh] w-72 overflow-hidden rounded-tl-2xl rounded-bl-2xl border-l border-t border-border backdrop-blur-sm shadow-inner transition-transform duration-500 ease-in-out no-callout",
      isCollapsed ? "translate-x-full" : "translate-x-0",
      isRndMode
        ? "bg-card text-card-foreground"
        : "bg-card text-card-foreground",
    ].join("");
  }, [isCollapsed, isRndMode]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const map: Record<string, string> = {
        p: "pastry",
        t: "technique",
        c: "course",
        a: "allergens",
        d: "diets",
        m: "meal",
        u: "cuisine",
        s: "service",
        y: "difficulty",
        e: "equipment",
      };
      const section = map[event.key.toLowerCase()];
      if (!section) return;
      event.preventDefault();
      if (isCollapsed) onToggle();
      setOpen((prev) => (prev.includes(section) ? prev : [...prev, section]));
      setTimeout(() => {
        document
          .querySelector(`[data-accordion-section='${section}']`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 0);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isCollapsed, onToggle]);
  const handleUrlSubmit = async () => {
    if (!recipeUrl || isImporting) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/recipe/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: recipeUrl }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `Server returned invalid response (${res.status}): ${res.statusText}`,
        );
      }
      if (!res.ok) {
        throw new Error(data?.error || `Import failed (${res.status})`);
      }
      await onRecipeImport?.(data);
      setRecipeUrl("");
    } catch (error: any) {
      console.error("[handleUrlSubmit] Error:", error);
      const message = error?.message || "Failed to import recipe from URL";
      alert(message);
    } finally {
      setIsImporting(false);
    }
  };
  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRecipeUrl(text);
    } catch {
      /* ignore clipboard errors */
    }
  };
  const renderRecipeTools = () => (
    <>
      {" "}
      <div className="border-b border-border p-4 pt-5">
        {" "}
        <div className="flex items-center justify-between gap-3">
          {" "}
          <div className="space-y-1">
            {" "}
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              {" "}
              Recipe ingestion{" "}
            </span>{" "}
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {" "}
              Import & metadata curation{" "}
            </h3>{" "}
          </div>{" "}
          <button
            type="button"
            onClick={() => onOpenLabs?.()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Open R&D Labs"
          >
            {" "}
            <FlaskConical className="h-4 w-4" />{" "}
          </button>{" "}
        </div>{" "}
        <div className="mt-4">
          {" "}
          <label className="mb-1 block text-sm font-medium text-foreground">
            Recipe URL
          </label>{" "}
          <div className="flex gap-1">
            {" "}
            <input
              className="flex-1 rounded border border-border bg-surface p-2 text-sm text-foreground placeholder-muted-foreground shadow-sm transition-colors focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={recipeUrl}
              onChange={(event) => setRecipeUrl(event.target.value)}
              placeholder="Enter recipe URL"
            />{" "}
            <button
              type="button"
              onClick={handlePasteUrl}
              className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground transition hover:bg-background"
              title="Paste from clipboard"
            >
              {" "}
              Paste{" "}
            </button>{" "}
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={isImporting}
              className={`flex items-center justify-center rounded px-3 py-2 text-sm text-primary-foreground transition ${isImporting ? "cursor-not-allowed bg-muted opacity-50" : "bg-primary hover:opacity-90"}`}
            >
              {" "}
              {isImporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <Send className="h-4 w-4" />
              )}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-hide">
        {" "}
        <div>
          {" "}
          <label className="mb-1 block text-sm font-medium text-foreground">
            Recipe Image
          </label>{" "}
          <input
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImageChange(URL.createObjectURL(file));
            }}
            className="w-full rounded border border-border bg-surface p-2 text-xs text-foreground transition focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />{" "}
          {image && (
            <div className="mt-2">
              {" "}
              <img
                src={image}
                alt="Preview"
                className="h-32 w-full rounded border border-border object-cover"
              />{" "}
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                onClick={() => {
                  try {
                    window.dispatchEvent(
                      new CustomEvent("openImageEditor", { detail: { image } }),
                    );
                  } catch {
                    /* noop */
                  }
                }}
              >
                {" "}
                <Palette className="h-3 w-3" /> Edit Image{" "}
              </button>{" "}
            </div>
          )}{" "}
        </div>{" "}
        <Accordion
          type="multiple"
          value={open}
          onValueChange={(value) =>
            setOpen(Array.isArray(value) ? value : [value])
          }
        >
          {" "}
          <AccordionItem value="recipe" data-accordion-section="recipe">
            {" "}
            <AccordionTrigger>Recipe</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="space-y-1 text-xs">
                {" "}
                <label className="flex items-center gap-2">
                  {" "}
                  <input
                    type="checkbox"
                    className="scale-75"
                    checked={selectedRecipeType.includes("Full Recipe")}
                    onChange={() =>
                      toggle(
                        selectedRecipeType,
                        onRecipeTypeChange,
                        "Full Recipe",
                      )
                    }
                  />{" "}
                  Full Recipe{" "}
                </label>{" "}
                <label className="flex items-center gap-2">
                  {" "}
                  <input
                    type="checkbox"
                    className="scale-75"
                    checked={selectedRecipeType.includes("Sub Recipe")}
                    onChange={() =>
                      toggle(
                        selectedRecipeType,
                        onRecipeTypeChange,
                        "Sub Recipe",
                      )
                    }
                  />{" "}
                  Sub Recipe{" "}
                </label>{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="status" data-accordion-section="status">
            {" "}
            <AccordionTrigger>Status</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded border border-border bg-surface p-2 text-sm text-foreground transition focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {" "}
                <option value="active">Active</option>{" "}
                <option value="draft">In Development</option>{" "}
                <option value="archived">Archived</option>{" "}
              </select>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="access" data-accordion-section="access">
            {" "}
            <AccordionTrigger>Recipe Access</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="space-y-3">
                {" "}
                <div className="grid grid-cols-2 gap-2">
                  {" "}
                  {recipeAccessList.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 text-xs"
                    >
                      {" "}
                      <input
                        type="checkbox"
                        className="scale-75"
                        checked={selectedRecipeAccess.includes(item)}
                        onChange={() =>
                          toggle(
                            selectedRecipeAccess,
                            onRecipeAccessChange,
                            item,
                          )
                        }
                      />{" "}
                      {item}{" "}
                    </label>
                  ))}{" "}
                </div>{" "}
                <div className="border-t border-border pt-3">
                  {" "}
                  <label className="flex items-start gap-2">
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75 mt-0.5"
                      checked={isGlobal}
                      onChange={(e) => onGlobalChange?.(e.target.checked)}
                    />{" "}
                    <span className="text-xs leading-tight">
                      {" "}
                      <div className="font-semibold text-foreground">
                        Make Global Recipe
                      </div>{" "}
                      <div className="text-muted-foreground">
                        Available to all outlets. Share updates with chef
                        approval.
                      </div>{" "}
                    </span>{" "}
                  </label>{" "}
                </div>{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="allergens" data-accordion-section="allergens">
            {" "}
            <AccordionTrigger>Allergens</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="grid grid-cols-2 gap-2">
                {" "}
                {axisOptions("allergens").map((option) => (
                  <label
                    key={option.slug}
                    className="flex items-center gap-2 text-xs"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={taxonomy.allergens.includes(option.slug)}
                      onChange={() => {
                        const next = taxonomy.allergens.includes(option.slug)
                          ? taxonomy.allergens.filter(
                              (value) => value !== option.slug,
                            )
                          : [...taxonomy.allergens, option.slug];
                        tset({ allergens: next });
                        onAllergensChange(next);
                      }}
                    />{" "}
                    {option.label}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="diets" data-accordion-section="diets">
            {" "}
            <AccordionTrigger>Diets</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="grid grid-cols-2 gap-2">
                {" "}
                {axisOptions("diets").map((option) => (
                  <label
                    key={option.slug}
                    className="flex items-center gap-2 text-xs"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={taxonomy.diets.includes(option.slug)}
                      onChange={() => {
                        const next = taxonomy.diets.includes(option.slug)
                          ? taxonomy.diets.filter(
                              (value) => value !== option.slug,
                            )
                          : [...taxonomy.diets, option.slug];
                        tset({ diets: next });
                      }}
                    />{" "}
                    {option.label}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="meal" data-accordion-section="meal">
            {" "}
            <AccordionTrigger>Meal Period</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <select
                className="w-full rounded border border-border bg-surface p-2 text-sm text-foreground transition focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={taxonomy.mealPeriod || ""}
                onChange={(event) =>
                  tset({ mealPeriod: event.target.value || undefined })
                }
              >
                {" "}
                <option value="">—</option>{" "}
                {axisOptions("meal-period").map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {" "}
                    {option.label}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="cuisine" data-accordion-section="cuisine">
            {" "}
            <AccordionTrigger>Cuisine</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <select
                className="w-full rounded border border-border bg-surface p-2 text-sm text-foreground transition focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={taxonomy.cuisine || ""}
                onChange={(event) => {
                  const value = event.target.value || undefined;
                  tset({ cuisine: value });
                  onNationalityChange(value ? [value] : []);
                }}
              >
                {" "}
                <option value="">—</option>{" "}
                {axisOptions("cuisines").map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {" "}
                    {option.label}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="service" data-accordion-section="service">
            {" "}
            <AccordionTrigger>Service Style</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <select
                className="w-full rounded border border-border bg-surface p-2 text-sm text-foreground transition focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={taxonomy.serviceStyle || ""}
                onChange={(event) =>
                  tset({ serviceStyle: event.target.value || undefined })
                }
              >
                {" "}
                <option value="">—</option>{" "}
                {axisOptions("service-style").map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {" "}
                    {option.label}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="difficulty" data-accordion-section="difficulty">
            {" "}
            <AccordionTrigger>Difficulty</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <select
                className="w-full rounded border border-border bg-surface p-2 text-sm text-foreground transition focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={taxonomy.difficulty || ""}
                onChange={(event) =>
                  tset({ difficulty: event.target.value || undefined })
                }
              >
                {" "}
                <option value="">—</option>{" "}
                {axisOptions("difficulty").map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {" "}
                    {option.label}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="course" data-accordion-section="course">
            {" "}
            <AccordionTrigger>Course / Service</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="max-h-40 overflow-auto rounded border border-dashed border-border p-2">
                {" "}
                {axisOptions("course").map((option) => (
                  <label
                    key={option.slug}
                    className="flex items-center gap-2 text-xs"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={taxonomy.course.includes(option.slug)}
                      onChange={() => {
                        const next = taxonomy.course.includes(option.slug)
                          ? taxonomy.course.filter(
                              (value) => value !== option.slug,
                            )
                          : [...taxonomy.course, option.slug];
                        tset({ course: next });
                        onCoursesChange(next);
                      }}
                    />{" "}
                    {option.label}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="technique" data-accordion-section="technique">
            {" "}
            <AccordionTrigger>Technique (up to 3)</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="max-h-40 overflow-auto rounded border border-dashed border-border p-2">
                {" "}
                {axisOptions("technique").map((option) => (
                  <label
                    key={option.slug}
                    className="flex items-center gap-2 text-xs"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={taxonomy.technique.includes(option.slug)}
                      onChange={() => {
                        const has = taxonomy.technique.includes(option.slug);
                        const next = has
                          ? taxonomy.technique.filter(
                              (value) => value !== option.slug,
                            )
                          : limitTechnique([
                              ...taxonomy.technique,
                              option.slug,
                            ]);
                        tset({ technique: next });
                        onPrepMethodChange(next);
                      }}
                    />{" "}
                    {option.label}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="pastry" data-accordion-section="pastry">
            {" "}
            <AccordionTrigger>Pastry</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="max-h-40 overflow-auto rounded border border-dashed border-border p-2">
                {" "}
                {axisOptions("pastry").map((option) => (
                  <label
                    key={option.slug}
                    className="flex items-center gap-2 text-xs"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={taxonomy.pastry.includes(option.slug)}
                      onChange={() => {
                        const next = taxonomy.pastry.includes(option.slug)
                          ? taxonomy.pastry.filter(
                              (value) => value !== option.slug,
                            )
                          : [...taxonomy.pastry, option.slug];
                        tset({ pastry: next });
                      }}
                    />{" "}
                    {option.label}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="components" data-accordion-section="components">
            {" "}
            <AccordionTrigger>Components</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="max-h-40 overflow-auto rounded border border-dashed border-border p-2">
                {" "}
                {axisOptions("components").map((option) => (
                  <label
                    key={option.slug}
                    className="flex items-center gap-2 text-xs"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={taxonomy.components.includes(option.slug)}
                      onChange={() => {
                        const next = taxonomy.components.includes(option.slug)
                          ? taxonomy.components.filter(
                              (value) => value !== option.slug,
                            )
                          : [...taxonomy.components, option.slug];
                        tset({ components: next });
                      }}
                    />{" "}
                    {option.label}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="equipment" data-accordion-section="equipment">
            {" "}
            <AccordionTrigger>Equipment</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <div className="max-h-40 overflow-auto rounded border border-dashed border-border p-2">
                {" "}
                {axisOptions("equipment").map((option) => (
                  <label
                    key={option.slug}
                    className="flex items-center gap-2 text-xs"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="scale-75"
                      checked={
                        taxonomy.equipment.includes(option.slug) ||
                        selectedCookingEquipment.includes(option.slug)
                      }
                      onChange={() => {
                        const next = taxonomy.equipment.includes(option.slug)
                          ? taxonomy.equipment.filter(
                              (value) => value !== option.slug,
                            )
                          : [...taxonomy.equipment, option.slug];
                        tset({ equipment: next });
                        const legacyNext = selectedCookingEquipment.includes(
                          option.slug,
                        )
                          ? selectedCookingEquipment.filter(
                              (value) => value !== option.slug,
                            )
                          : [...selectedCookingEquipment, option.slug];
                        onCookingEquipmentChange(legacyNext);
                      }}
                    />{" "}
                    {option.label}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
          <AccordionItem value="notes" data-accordion-section="notes">
            {" "}
            <AccordionTrigger>Chef Notes</AccordionTrigger>{" "}
            <AccordionContent>
              {" "}
              <textarea
                value={notes}
                onChange={(event) => {
                  const value = event.target.value;
                  setNotes(value);
                  try {
                    localStorage.setItem("recipe:chef-notes", value);
                  } catch {
                    /* ignore */
                  }
                  try {
                    window.dispatchEvent(
                      new CustomEvent("recipe:chef-notes", { detail: value }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
                placeholder="Notes only you see. Printed under Nutrition."
                className="h-20 w-full rounded border border-border bg-surface p-2 text-sm text-foreground transition focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder-muted-foreground"
              />{" "}
            </AccordionContent>{" "}
          </AccordionItem>{" "}
        </Accordion>{" "}
      </div>{" "}
    </>
  );
  const renderRndTools = () => (
    <>
      {" "}
      <div className="flex items-center justify-between border-b border-border p-4">
        {" "}
        <div className="space-y-1">
          {" "}
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            {" "}
            R&D signal deck{" "}
          </span>{" "}
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {" "}
            {focusExperiment?.title ?? "Activation stream"}{" "}
          </h3>{" "}
        </div>{" "}
        <button
          type="button"
          onClick={() => onCloseLabs?.()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Return to recipe tools"
        >
          {" "}
          <ArrowUpRight className="h-4 w-4" />{" "}
        </button>{" "}
      </div>{" "}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm scrollbar-hide">
        {" "}
        {labStore ? (
          <>
            {" "}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-inner">
              {" "}
              <header className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
                {" "}
                <span>Focus experiment</span>{" "}
                <span>{focusExperiment?.status ?? "—"}</span>{" "}
              </header>{" "}
              <h4 className="mt-2 text-base font-semibold tracking-tight text-foreground">
                {" "}
                {focusExperiment?.title ?? "No experiment selected"}{" "}
              </h4>{" "}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {" "}
                {focusExperiment?.notes ??
                  "Select an experiment to view notes and context."}{" "}
              </p>{" "}
              {focusExperiment ? (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  {" "}
                  <span>Owner: {focusExperiment.owner}</span>{" "}
                  <span>Updated: {focusExperiment.lastUpdated}</span>{" "}
                </div>
              ) : null}{" "}
              <div className="mt-3 flex flex-wrap gap-2">
                {" "}
                {(focusExperiment?.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-primary"
                  >
                    {" "}
                    {tag}{" "}
                  </span>
                ))}{" "}
              </div>{" "}
            </section>{" "}
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              {" "}
              <header className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                {" "}
                <span>Discovery queue</span>{" "}
                <span>{discoveryQueue.length}</span>{" "}
              </header>{" "}
              <div className="space-y-2">
                {" "}
                {discoveryQueue.map((experiment) => {
                  const isActive = experiment.id === labStore.focusExperimentId;
                  return (
                    <button
                      key={experiment.id}
                      type="button"
                      onClick={() => labStore.setFocusExperiment(experiment.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${isActive ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-surface text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"}`}
                    >
                      {" "}
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em]">
                        {" "}
                        <span>{experiment.status}</span>{" "}
                        <span>{experiment.lastUpdated}</span>{" "}
                      </div>{" "}
                      <div className="mt-1 font-semibold tracking-tight">
                        {experiment.title}
                      </div>{" "}
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                        {" "}
                        {experiment.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}{" "}
                      </div>{" "}
                    </button>
                  );
                })}{" "}
                {discoveryQueue.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                    {" "}
                    No additional experiments in queue. Create a new study from
                    the R&D suite.{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </section>{" "}
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              {" "}
              <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                {" "}
                Backlog triggers{" "}
              </header>{" "}
              <div className="space-y-2">
                {" "}
                {backlog.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-xs"
                  >
                    {" "}
                    <div>
                      {" "}
                      <div className="font-semibold text-foreground">
                        {task.label}
                      </div>{" "}
                      <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                        {" "}
                        Owner: {task.owner}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-right text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                      {" "}
                      <div className="font-semibold">{task.due}</div>{" "}
                      {task.isBlocked ? (
                        <span className="mt-1 inline-flex items-center rounded-full bg-destructive/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-destructive">
                          {" "}
                          Blocked{" "}
                        </span>
                      ) : null}{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
                {backlog.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                    {" "}
                    Backlog is clear. Stay close to the live experiments feed
                    for new actions.{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </section>{" "}
            <section className="space-y-2 rounded-2xl border border-border bg-card p-4 text-xs shadow-sm">
              {" "}
              <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                {" "}
                Insights feed{" "}
              </header>{" "}
              <div className="space-y-2">
                {" "}
                {insights.map((item, index) => (
                  <div
                    key={`${item.headline}-${index}`}
                    className="rounded-xl border border-border bg-surface px-3 py-2 shadow-sm"
                  >
                    {" "}
                    <div className="text-xs font-semibold text-foreground">
                      {item.headline}
                    </div>{" "}
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>{" "}
                    {item.metric ? (
                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-green-600 dark:text-green-400">
                        {" "}
                        {item.metric}{" "}
                      </div>
                    ) : null}{" "}
                  </div>
                ))}{" "}
                {insights.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                    {" "}
                    No insights captured yet. Sync experiments to populate this
                    feed.{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </section>{" "}
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            {" "}
            R&D workspace data is not available in this view.{" "}
          </div>
        )}{" "}
      </div>{" "}
    </>
  );
  return (
    <>
      {" "}
      <button
        aria-label="Toggle sidebar"
        onClick={onToggle}
        onContextMenu={(event) => event.preventDefault()}
        className="fixed right-0 top-1/2 z-[71] -translate-y-1/2 select-none rounded-l-full border border-border bg-background px-2 py-3 shadow hover:bg-muted pointer-events-auto cursor-pointer"
        style={{ transform: "translateY(-50%)" }}
      >
        {" "}
        <div className="flex flex-col items-center gap-1">
          {" "}
          <span className="block h-4 w-0.5 bg-muted-foreground" />{" "}
          <span className="block h-4 w-0.5 bg-muted-foreground" />{" "}
          <span className="block h-4 w-0.5 bg-muted-foreground" />{" "}
        </div>{" "}
      </button>{" "}
      <div
        onContextMenu={(event) => event.preventDefault()}
        className={panelClass}
      >
        {" "}
        {!isCollapsed && (
          <div className="flex h-full flex-col">
            {isRndMode ? renderRndTools() : renderRecipeTools()}
          </div>
        )}{" "}
      </div>{" "}
    </>
  );
}
