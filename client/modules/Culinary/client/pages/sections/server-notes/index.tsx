import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  History,
  Plus,
  Sparkles,
  ListChecks,
  FileCheck2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppData } from "@/context/AppDataContext";
import { useLanguage, useTranslation } from "@/context/LanguageContext";
import ServerNotesPreview from "@/components/ServerNotesPreview";
import { ServerNotesConfig } from "@/components/ServerNotesConfig";
import { RecipeSelection } from "@/components/RecipeSelection";
import { ServerNotesGenerator } from "@/components/ServerNotesGenerator";
import { AllergyMatrixDialog } from "@/components/AllergyMatrixDialog";
import { CooksRecipeBookGenerator } from "@/components/CooksRecipeBookGenerator";
import { ServerNotesExportDialog } from "@/components/ServerNotesExportDialog";
import { CooksRecipesExportDialog } from "@/components/CooksRecipesExportDialog";
import { AllergenSheetExportDialog } from "@/components/AllergenSheetExportDialog";
import type { LanguageCode } from "@/i18n/config";
import {
  createEmptyServerNote,
  layoutPresets,
  colorSchemes,
  type ServerNote,
  type ServerNoteRecipe,
} from "../../../../shared/server-notes";

const SAVED_NOTES_KEY = "serverNotes:saved";
const SETTINGS_KEY = "serverNotes:settings";
const PENDING_SELECTION_KEY = "serverNotes:presetSelection";

const WALKTHROUGH_STEPS: Array<{
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}> = [
  {
    titleKey: "serverNotes.steps.configure.title",
    descriptionKey: "serverNotes.steps.configure.description",
    icon: Sparkles,
  },
  {
    titleKey: "serverNotes.steps.select.title",
    descriptionKey: "serverNotes.steps.select.description",
    icon: ListChecks,
  },
  {
    titleKey: "serverNotes.steps.preview.title",
    descriptionKey: "serverNotes.steps.preview.description",
    icon: FileCheck2,
  },
];

export default function ServerNotesSection() {
  const { recipes } = useAppData();
  const { toast } = useToast();
  const { language, setLanguage, options: languageOptions } = useLanguage();
  const { t } = useTranslation();

  const template = useMemo(
    () => createEmptyServerNote(layoutPresets[0]!, colorSchemes[0]!),
    [],
  );
  const [currentNote, setCurrentNote] = useState<ServerNote>(template);
  const [savedNotes, setSavedNotes] = useState<ServerNote[]>([]);
  const [noteSession, setNoteSession] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [cooksRecipesExportOpen, setCooksRecipesExportOpen] = useState(false);
  const [allergenSheetExportOpen, setAllergenSheetExportOpen] = useState(false);
  const pendingSelectionSessionRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_NOTES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ServerNote[];
        setSavedNotes(parsed);
      }
    } catch (error) {
      console.warn("Failed to read server notes", error);
    }
    try {
      const settingsRaw = localStorage.getItem(SETTINGS_KEY);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        setCurrentNote((prev) => ({
          ...prev,
          companyName: settings.companyName || prev.companyName,
          outletName: settings.outletName || prev.outletName,
          logos: settings.logos || prev.logos,
        }));
      }
    } catch (error) {
      console.warn("Failed to read server notes settings", error);
    }
  }, [template]);

  useEffect(() => {
    localStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(savedNotes));
  }, [savedNotes]);

  const handleUpdate = (patch: Partial<ServerNote>) => {
    setCurrentNote((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRecipesChange = (recipesSelection: ServerNoteRecipe[]) => {
    const normalized = recipesSelection.map((item, index) => ({
      ...item,
      order: index,
    }));
    setCurrentNote((prev) => ({
      ...prev,
      selectedRecipes: normalized,
      updatedAt: new Date().toISOString(),
    }));
  };

  const persistSettings = (note: ServerNote) => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        companyName: note.companyName,
        outletName: note.outletName,
        logos: note.logos,
      }),
    );
  };

  const createNewNote = () => {
    let nextNote: ServerNote | null = null;
    setCurrentNote((prev) => {
      nextNote = {
        ...createEmptyServerNote(prev.layout, prev.colorScheme),
        companyName: prev.companyName,
        outletName: prev.outletName,
        logos: [...prev.logos],
        orientation: prev.orientation,
        pageFormat: prev.pageFormat,
        cardsPerPage: prev.cardsPerPage,
      };
      return nextNote;
    });
    if (nextNote) {
      persistSettings(nextNote);
    }
    setNoteSession((value) => value + 1);
    toast({
      title: t("serverNotes.toast.new.title"),
      description: t("serverNotes.toast.new.description"),
    });
  };

  const saveNote = (note: ServerNote) => {
    const withId = note.id ? note : { ...note, id: `note-${Date.now()}` };
    const noteWithTimestamp = {
      ...withId,
      updatedAt: new Date().toISOString(),
    };
    setSavedNotes((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === noteWithTimestamp.id,
      );
      if (existingIndex === -1) {
        return [noteWithTimestamp, ...prev];
      }
      const copy = [...prev];
      copy[existingIndex] = noteWithTimestamp;
      return copy;
    });
    setCurrentNote(noteWithTimestamp);
    persistSettings(noteWithTimestamp);
  };

  const loadSavedNote = (note: ServerNote) => {
    setCurrentNote(note);
    persistSettings(note);
    setNoteSession((value) => value + 1);
    const noteTitle = note.title || t("common.untitled");
    toast({
      title: t("serverNotes.toast.loaded.title"),
      description: t("serverNotes.toast.loaded.description", undefined, { title: noteTitle }),
    });
  };

  const deleteNote = (noteId: string) => {
    setSavedNotes((prev) => prev.filter((note) => note.id !== noteId));
    toast({
      title: t("serverNotes.toast.deleted.title"),
      description: t("serverNotes.toast.deleted.description"),
    });
  };

  useEffect(() => {
    persistSettings(currentNote);
  }, [currentNote.companyName, currentNote.outletName, currentNote.logos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pendingSelectionSessionRef.current === noteSession) return;

    let ids: string[] = [];
    try {
      const raw = window.sessionStorage.getItem(PENDING_SELECTION_KEY);
      if (!raw) {
        pendingSelectionSessionRef.current = noteSession;
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.ids)) {
        ids = parsed.ids.filter((value: unknown): value is string =>
          typeof value === "string" && value.length > 0,
        );
      }
    } catch (error) {
      console.warn("Failed to read pending recipe selection", error);
      pendingSelectionSessionRef.current = noteSession;
      return;
    }

    if (!ids.length) {
      pendingSelectionSessionRef.current = noteSession;
      return;
    }

    const available = new Map<string, (typeof recipes)[number]>();
    for (const id of ids) {
      const recipe = recipes.find((entry) => entry.id === id);
      if (recipe) available.set(id, recipe);
    }

    if (available.size === 0) {
      return;
    }

    let addedCount = 0;
    setCurrentNote((prev) => {
      const existingIds = new Set(prev.selectedRecipes.map((entry) => entry.recipe.id));
      const baseOrder = prev.selectedRecipes.length;
      const additions: ServerNoteRecipe[] = [];

      ids.forEach((id) => {
        const recipe = available.get(id);
        if (!recipe || existingIds.has(id)) return;
        additions.push({
          recipe,
          order: baseOrder + additions.length,
        });
      });

      if (!additions.length) {
        return prev;
      }

      addedCount = additions.length;
      return {
        ...prev,
        selectedRecipes: [...prev.selectedRecipes, ...additions],
        updatedAt: new Date().toISOString(),
      };
    });

    if (available.size === ids.length) {
      pendingSelectionSessionRef.current = noteSession;
    }

    if (addedCount > 0) {
      toast({
        title: t("serverNotes.toast.recipesAdded.title"),
        description:
          addedCount === 1
            ? t("serverNotes.toast.recipesAdded.one")
            : t("serverNotes.toast.recipesAdded.other", undefined, { count: addedCount }),
      });
    }
  }, [recipes, noteSession, toast]);

  const sortedSelected = useMemo(
    () =>
      [...currentNote.selectedRecipes].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    [currentNote.selectedRecipes],
  );

  const panelSurfaceClass =
    "overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_32px_90px_-48px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-shadow dark:border-[#c8a97e]/15 dark:bg-slate-950/70 dark:shadow-[0_0_70px_rgba(56,189,248,0.35)]";
  const languageLabel = useMemo(
    () => languageOptions.find((option) => option.code === language)?.label || language,
    [language, languageOptions],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div className="leading-tight">
                <h1 className="text-lg font-semibold">{t("serverNotes.heading")}</h1>
                <p className="text-[13px] text-muted-foreground">
                  {t("serverNotes.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={createNewNote}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> {t("serverNotes.actions.newDocument")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" /> {t("export.serverNotes.button", "Export")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCooksRecipesExportOpen(true)}
                className="gap-1.5"
                disabled={sortedSelected.length === 0}
              >
                <Download className="h-4 w-4" /> {t("export.cooksRecipes.button", "Export Recipes")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllergenSheetExportOpen(true)}
                className="gap-1.5"
                disabled={sortedSelected.length === 0}
              >
                <Download className="h-4 w-4" /> {t("export.allergenSheet.button", "Export Allergens")}
              </Button>
            </div>
          </header>

          <div className={`${panelSurfaceClass} p-4 sm:p-5 xl:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="leading-tight">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  {t("serverNotes.helper.label")}
                </p>
                <h2 className="text-base font-semibold text-foreground">
                  {t("serverNotes.helper.title")}
                </h2>
              </div>
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.25em]"
              >
                {t("serverNotes.helper.badge")}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3 xl:gap-4 2xl:gap-6">
              {WALKTHROUGH_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.titleKey}
                    className="flex items-start gap-2.5 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm transition-colors dark:border-[#c8a97e]/25 dark:bg-slate-950/60"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-white text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm dark:border-[#c8a97e]/30 dark:bg-slate-900 dark:text-[#c8a97e]/80">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Icon className="h-4 w-4 text-primary" />
                        <span>{t(step.titleKey)}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t(step.descriptionKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <section
            key={noteSession}
            className="grid items-stretch gap-5 lg:grid-cols-12 xl:gap-6 2xl:gap-8"
          >
            <Card
              className={`${panelSurfaceClass} flex h-full flex-col lg:col-span-4 xl:col-span-4`}
            >
              <CardHeader className="border-b border-white/70 px-4 py-3.5 dark:border-[#c8a97e]/20">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground"
                    >
                      {`${t("serverNotes.steps.step")} 1`}
                    </Badge>
                    <CardTitle className="text-sm font-semibold">{t("serverNotes.panels.configuration")}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3.5 px-4 pb-4 pt-3 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
                <ServerNotesConfig
                  config={currentNote}
                  onUpdate={handleUpdate}
                />
              </CardContent>
            </Card>

            <Card
              className={`${panelSurfaceClass} flex h-full flex-col lg:col-span-4 xl:col-span-4`}
            >
              <CardHeader className="border-b border-white/70 px-4 py-3.5 dark:border-[#c8a97e]/20">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground"
                    >
                      {`${t("serverNotes.steps.step")} 2`}
                    </Badge>
                    <CardTitle className="text-sm font-semibold">{t("serverNotes.panels.recipes")}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3.5 px-4 pb-4 pt-3 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
                <RecipeSelection
                  availableRecipes={recipes}
                  selectedRecipes={sortedSelected}
                  onRecipesChange={handleRecipesChange}
                />
              </CardContent>
            </Card>

            <Card
              className={`${panelSurfaceClass} flex h-full flex-col lg:col-span-4 xl:col-span-4`}
            >
              <CardHeader className="border-b border-white/70 px-4 py-3.5 dark:border-[#c8a97e]/20">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground"
                    >
                      {`${t("serverNotes.steps.step")} 3`}
                    </Badge>
                    <CardTitle className="text-sm font-semibold">{t("serverNotes.panels.preview")}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3.5 px-4 pb-4 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <span>{t("serverNotes.preview.languageLabel")}</span>
                    <Select
                      value={language}
                      onValueChange={(value) => setLanguage(value as LanguageCode)}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((option) => (
                          <SelectItem key={option.code} value={option.code}>
                            {option.flag} {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AllergyMatrixDialog
                    recipes={sortedSelected}
                    language={language}
                    languageOptions={languageOptions}
                  />
                </div>
                <ServerNotesPreview
                  layout={currentNote.layout}
                  color={currentNote.colorScheme}
                  pageFormat={currentNote.pageFormat}
                  variant="mini"
                />
                <ServerNotesGenerator
                  serverNote={currentNote}
                  onSave={saveNote}
                  language={language}
                  languageName={languageLabel}
                />
                <CooksRecipeBookGenerator
                  recipes={sortedSelected}
                  language={language}
                  onLanguageChange={(code) => setLanguage(code as LanguageCode)}
                  languageOptions={languageOptions}
                  note={currentNote}
                />
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <History className="h-4 w-4" />
              <span className="text-sm font-medium text-foreground">
                {t("serverNotes.saved.heading")}
              </span>
              {savedNotes.length > 0 && (
                <Badge variant="secondary">{savedNotes.length}</Badge>
              )}
            </div>
            <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {savedNotes.map((note) => (
                <Card
                  key={note.id}
                  className={`${panelSurfaceClass} flex h-full flex-col hover:shadow-[0_38px_110px_-60px_rgba(15,23,42,0.45)]`}
                >
                  <CardHeader className="border-b border-white/70 px-6 py-4 dark:border-[#c8a97e]/20">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="line-clamp-1">
                        {note.title || t("common.untitled")}
                      </span>
                      <Badge variant="outline">
                        {note.selectedRecipes.length === 1
                          ? t("serverNotes.saved.badge.recipes.one")
                          : t("serverNotes.saved.badge.recipes.other", undefined, {
                              count: note.selectedRecipes.length,
                            })}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between space-y-4 px-6 pb-6 pt-4 text-sm">
                    <div className="space-y-1 text-muted-foreground">
                      <div>
                        <strong>{t("serverNotes.saved.labels.company")}</strong> {note.companyName || "—"}
                      </div>
                      {note.outletName && (
                        <div>
                          <strong>{t("serverNotes.saved.labels.outlet")}</strong> {note.outletName}
                        </div>
                      )}
                      <div>
                        <strong>{t("serverNotes.saved.labels.distribution")}</strong>{" "}
                        {new Date(note.distributionDate).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>{t("serverNotes.saved.labels.layout")}</strong> {note.layout.name}
                      </div>
                      <div>
                        <strong>{t("serverNotes.saved.labels.updated")}</strong>{" "}
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => loadSavedNote(note)}
                      >
                        {t("serverNotes.saved.actions.loadEdit")}
                      </Button>
                      {note.docxDataUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = note.docxDataUrl!;
                            link.download = `${note.title || "server-notes"}.docx`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          {t("serverNotes.saved.actions.download")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="text-red-600"
                      >
                        {t("serverNotes.saved.actions.delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {savedNotes.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed border-white/70 bg-white/40 py-12 text-center text-sm text-muted-foreground shadow-inner backdrop-blur-sm dark:border-[#c8a97e]/20 dark:bg-slate-950/40">
                  {t("serverNotes.saved.empty")}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <ServerNotesExportDialog
        notes={currentNote}
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      <CooksRecipesExportDialog
        recipes={sortedSelected.map(item => ({
          name: item.recipe.title || "Untitled",
          ingredients: item.recipe.ingredients || [],
          instructions: (item.recipe.instructions || []).join("\n"),
          cookTime: item.recipe.cookTime?.toString(),
          prepTime: item.recipe.prepTime?.toString(),
          yield: item.recipe.description,
          allergens: [],
        }))}
        open={cooksRecipesExportOpen}
        onOpenChange={setCooksRecipesExportOpen}
      />

      <AllergenSheetExportDialog
        items={sortedSelected.map(item => ({
          name: item.recipe.title || "Untitled",
          allergens: [],
          course: item.recipe.course,
          dish: item.recipe.description,
        }))}
        open={allergenSheetExportOpen}
        onOpenChange={setAllergenSheetExportOpen}
      />
    </div>
  );
}
