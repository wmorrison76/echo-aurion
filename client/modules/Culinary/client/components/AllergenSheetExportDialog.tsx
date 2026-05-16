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
import { exportAllergenSheetAsJSON, exportAllergenSheetAsCSV, type ExportFormat, type AllergenItem } from "@/lib/export-utils";

interface AllergenSheetExportDialogProps {
  items: AllergenItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllergenSheetExportDialog({
  items,
  open,
  onOpenChange,
}: AllergenSheetExportDialogProps) {
  const { t, language } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (items.length === 0) return;

    setIsExporting(true);
    try {
      const filename = `allergen-sheet-${new Date().toISOString().split("T")[0]}`;

      if (format === "json") {
        exportAllergenSheetAsJSON(items, {
          filename,
          format,
          language,
        });
      } else if (format === "csv") {
        exportAllergenSheetAsCSV(items, {
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
          <DialogTitle>{t("export.allergenSheet.title", "Export Allergen Sheet")}</DialogTitle>
          <DialogDescription>
            {t(
              "export.allergenSheet.description",
              "Choose a format and export your allergen sheet"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("export.allergenSheet.format", "Format")}
            </label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  {t("export.allergenSheet.json", "JSON")}
                </SelectItem>
                <SelectItem value="csv">
                  {t("export.allergenSheet.csv", "CSV")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {t("export.allergenSheet.summary", "Items to export")}: {items.length}
            </p>
            <div className="bg-amber-50 p-3 rounded text-sm text-amber-900">
              {format === "json" && t("export.allergenSheet.jsonDescription", "Export as structured JSON data for system integration")}
              {format === "csv" && t("export.allergenSheet.csvDescription", "Export as comma-separated values for spreadsheets and reports")}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || items.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? t("common.exporting", "Exporting...") : t("export.allergenSheet.button", "Export")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
