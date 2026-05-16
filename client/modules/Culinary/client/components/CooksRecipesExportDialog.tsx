import React, { useState } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/context/LanguageContext";
import { exportCooksRecipesAsJSON, exportCooksRecipesAsCSV, type ExportFormat, type CooksRecipe } from "@/lib/export-utils";

interface CooksRecipesExportDialogProps {
  recipes: CooksRecipe[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CooksRecipesExportDialog({
  recipes,
  open,
  onOpenChange,
}: CooksRecipesExportDialogProps) {
  const { t, language } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (recipes.length === 0) return;

    setIsExporting(true);
    try {
      const filename = `cooks-recipes-${new Date().toISOString().split("T")[0]}`;

      if (format === "json") {
        exportCooksRecipesAsJSON(recipes, {
          filename,
          format,
          language,
        });
      } else if (format === "csv") {
        exportCooksRecipesAsCSV(recipes, {
          filename,
          format,
          language,
        });
      }

      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("export.cooksRecipes.title", "Export Cook's Recipes")}</DialogTitle>
          <DialogDescription>
            {t(
              "export.cooksRecipes.description",
              "Choose a format and export your cook's recipes"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("export.cooksRecipes.format", "Format")}
            </label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  {t("export.cooksRecipes.json", "JSON")}
                </SelectItem>
                <SelectItem value="csv">
                  {t("export.cooksRecipes.csv", "CSV")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {t("export.cooksRecipes.summary", "Recipes to export")}: {recipes.length}
            </p>
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
              {format === "json" && t("export.cooksRecipes.jsonDescription", "Export as structured JSON data with all recipe details")}
              {format === "csv" && t("export.cooksRecipes.csvDescription", "Export as comma-separated values for spreadsheets")}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || recipes.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? t("common.exporting", "Exporting...") : t("export.cooksRecipes.button", "Export")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
