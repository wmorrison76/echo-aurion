import React, { useCallback, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CooksRecipeBookGenerator } from "@/components/CooksRecipeBookGenerator";
import type { Recipe } from "@shared/recipes";
import type { LanguageCode, LanguageOption } from "@/i18n/config";
import type { ServerNote } from "@shared/server-notes";
import { X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CookbookBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  collectionName: string;
  language: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  languageOptions: LanguageOption[];
  onSaveToOperationsDocs?: (cookbook: { name: string; html: string; language: string }) => void;
  note?: ServerNote;
}

export function CookbookBuilderDialog({
  open,
  onOpenChange,
  recipes,
  collectionName,
  language,
  onLanguageChange,
  languageOptions,
  onSaveToOperationsDocs,
  note,
}: CookbookBuilderDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [currentRecipeProgress, setCurrentRecipeProgress] = useState(0);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language);
  const [generationLanguage, setGenerationLanguage] = useState<LanguageCode>(language);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  const languageChangedAfterGeneration = isGenerated && selectedLanguage !== generationLanguage;

  useEffect(() => {
    if (!open) {
      setIsGenerating(false);
      setIsTranslating(false);
      setTranslationProgress(0);
      setCurrentRecipeProgress(0);
      setIsGenerated(false);
      setIsTranslated(false);
      setGeneratedHtml(null);
    } else {
      setSelectedLanguage(language);
      setGenerationLanguage(language);
    }
  }, [open, language]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!generatedHtml || !isTranslated) {
      toast({
        title: "Error",
        description: "Please generate and translate the cookbook first",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = new Blob([generatedHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${collectionName}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onSaveToOperationsDocs) {
        onSaveToOperationsDocs({
          name: collectionName,
          html: generatedHtml,
          language: selectedLanguage,
        });
      }

      toast({
        title: "Success",
        description: "Cookbook downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download cookbook",
        variant: "destructive",
      });
    }
  }, [generatedHtml, isTranslated, collectionName, selectedLanguage, onSaveToOperationsDocs]);

  const handleTranslate = useCallback(async () => {
    if (!isGenerated || !languageChangedAfterGeneration) return;

    setIsTranslating(true);
    setTranslationProgress(0);
    setCurrentRecipeProgress(0);

    try {
      const recipeCount = recipes.length;
      const progressPerRecipe = 100 / Math.max(recipeCount, 1);

      for (let i = 0; i < recipeCount; i++) {
        setCurrentRecipeProgress(i + 1);
        await new Promise(resolve => setTimeout(resolve, 300));
        setTranslationProgress((i + 1) * progressPerRecipe);
      }

      setIsTranslated(true);
      setIsTranslating(false);
      setTranslationProgress(0);
      setCurrentRecipeProgress(0);
    } catch (error) {
      console.error("Translation error:", error);
      toast({
        title: "Error",
        description: "Failed to translate recipes",
        variant: "destructive",
      });
      setIsTranslating(false);
      setTranslationProgress(0);
      setCurrentRecipeProgress(0);
    }
  }, [isGenerated, languageChangedAfterGeneration, recipes.length]);

  const handleClose = useCallback(() => {
    if (!isGenerating && !isTranslating) {
      onOpenChange(false);
    }
  }, [onOpenChange, isGenerating, isTranslating]);

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setSelectedLanguage(newLanguage);
    onLanguageChange(newLanguage);
    setIsTranslated(false);
  };

  const handleGeneratedHtml = useCallback((html: string) => {
    setGeneratedHtml(html);
    setIsGenerated(true);
    setIsTranslated(true);
    setGenerationLanguage(selectedLanguage);
  }, [selectedLanguage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle>{collectionName}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleClose}
            disabled={isGenerating || isTranslating}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Translation progress indicator */}
          {isTranslating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Translating recipes...</span>
                <span className="text-muted-foreground">
                  {currentRecipeProgress} / {recipes.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recipes.map((recipe, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground min-w-fit max-w-32 truncate">
                      {recipe.name || `Recipe ${i + 1}`}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          i < currentRecipeProgress
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gray-300 dark:bg-gray-700"
                        }`}
                        style={{ width: i < currentRecipeProgress ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-[#c8a97e] transition-all duration-300"
                  style={{ width: `${translationProgress}%` }}
                />
              </div>
            </div>
          )}

          <CooksRecipeBookGeneratorWithLanguageControl
            recipes={recipes}
            language={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            languageOptions={languageOptions}
            note={note}
            onGeneratedHtml={handleGeneratedHtml}
            isGenerated={isGenerated}
            onTranslate={handleTranslate}
            languageChangedAfterGeneration={languageChangedAfterGeneration}
            isTranslating={isTranslating}
          />

          <div className="sticky bottom-0 flex gap-2 border-t bg-background p-4" data-no-print="true">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!isTranslated || isGenerating || isTranslating}
            >
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!isTranslated || isGenerating || isTranslating}
            >
              Download & Save
            </Button>
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isGenerating || isTranslating}
              className="ml-auto"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CooksRecipeBookGeneratorWithLanguageControlProps {
  recipes: any[];
  language: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  languageOptions: LanguageOption[];
  note?: ServerNote;
  onGeneratedHtml?: (html: string) => void;
  isGenerated: boolean;
  onTranslate: () => void;
  languageChangedAfterGeneration: boolean;
  isTranslating: boolean;
}

function CooksRecipeBookGeneratorWithLanguageControl({
  recipes,
  language,
  onLanguageChange,
  languageOptions,
  note,
  onGeneratedHtml,
  isGenerated,
  onTranslate,
  languageChangedAfterGeneration,
  isTranslating,
}: CooksRecipeBookGeneratorWithLanguageControlProps) {
  const currentLanguageLabel = languageOptions.find(opt => opt.code === language)?.label || language;
  const currentLanguageFlag = languageOptions.find(opt => opt.code === language)?.flag || '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="text-sm font-medium block mb-2">Translate recipes:</label>
          <div className="w-40">
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              disabled={isTranslating}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-background text-sm"
            >
              {languageOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.flag} {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          onClick={onTranslate}
          disabled={!languageChangedAfterGeneration || isTranslating || !isGenerated}
          variant={languageChangedAfterGeneration ? "default" : "secondary"}
          className="flex items-center gap-2"
        >
          {isTranslating ? "Translating..." : "Translate"}
        </Button>
      </div>
      <CooksRecipeBookGenerator
        recipes={recipes}
        language={language}
        onLanguageChange={onLanguageChange}
        languageOptions={languageOptions}
        note={note}
        onGeneratedHtml={onGeneratedHtml}
      />
    </div>
  );
}
