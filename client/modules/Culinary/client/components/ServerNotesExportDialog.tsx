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
import type { ServerNote } from "@shared/server-notes";
import { exportServerNotesAsJSON, exportServerNotesAsCSV, type ExportFormat } from "@/lib/export-utils";

interface ServerNotesExportDialogProps {
  notes: ServerNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServerNotesExportDialog({
  notes,
  open,
  onOpenChange,
}: ServerNotesExportDialogProps) {
  const { t, language } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!notes) return;

    setIsExporting(true);
    try {
      const filename = `server-notes-${notes.title || "export"}-${new Date().toISOString().split("T")[0]}`;

      if (format === "json") {
        exportServerNotesAsJSON(notes, {
          filename,
          format,
          language,
        });
      } else if (format === "csv") {
        exportServerNotesAsCSV(notes, {
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
          <DialogTitle>{t("export.serverNotes.title", "Export Server Notes")}</DialogTitle>
          <DialogDescription>
            {t(
              "export.serverNotes.description",
              "Choose a format and export your server notes"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("export.serverNotes.format", "Format")}
            </label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  {t("export.serverNotes.json", "JSON")}
                </SelectItem>
                <SelectItem value="csv">
                  {t("export.serverNotes.csv", "CSV")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
            {format === "json" && t("export.serverNotes.jsonDescription", "Export as structured JSON data")}
            {format === "csv" && t("export.serverNotes.csvDescription", "Export as comma-separated values")}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? t("common.exporting", "Exporting...") : t("export.serverNotes.button", "Export")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
