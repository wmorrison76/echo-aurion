import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type {
  ExportFormat,
  ExportOptions,
  ExportLog,
  BleedMarks,
  ColorMarks,
} from "@/client/types/menu";

export function useMenuExport() {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Default export options
  const defaultExportOptions: ExportOptions = {
    format: "pdf",
    includeBleeds: true,
    includeMarks: true,
    colorSpace: "CMYK",
    resolutionDpi: 300,
    preserveLayers: false,
  };

  // Export menu
  const exportMenu = useCallback(
    async (
      menuId: string,
      canvasState: Record<string, any>,
      options: Partial<ExportOptions> = {}
    ) => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setExporting(true);
      setExportProgress(0);
      setError(null);

      try {
        const exportOptions: ExportOptions = {
          ...defaultExportOptions,
          ...options,
        };

        setExportProgress(10);

        const response = await fetch("/api/menus/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId,
            userId: user.id,
            canvasState,
            options: exportOptions,
          }),
        });

        setExportProgress(50);

        if (!response.ok) throw new Error("Export failed");

        const data = await response.json();

        setExportProgress(100);

        if (data.success) {
          toast({
            title: "Success",
            description: `Menu exported as ${exportOptions.format.toUpperCase()}`,
          });

          // Log export for audit trail
          await logExport(menuId, exportOptions);

          return data;
        } else {
          throw new Error(data.error || "Export failed");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setExporting(false);
        setExportProgress(0);
      }
    },
    [user?.id, toast]
  );

  // Export with printer marks and bleeds
  const exportForPrinter = useCallback(
    async (
      menuId: string,
      canvasState: Record<string, any>,
      printerCompany?: string,
      bleedMarks?: BleedMarks,
      colorMarks?: ColorMarks
    ) => {
      const options: Partial<ExportOptions> = {
        format: "pdf",
        includeBleeds: true,
        includeMarks: true,
        colorSpace: "CMYK",
        resolutionDpi: 300,
        preserveLayers: false,
      };

      setExporting(true);
      setError(null);

      try {
        setExportProgress(15);

        const response = await fetch("/api/menus/export-printer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId,
            userId: user?.id,
            canvasState,
            options,
            printerCompany,
            bleedMarks: bleedMarks || {
              bleedSize: 9,
              markType: "corner",
              markLength: 18,
              markWidth: 1,
            },
            colorMarks: colorMarks || {
              includeColorBars: true,
              includeRegistrationMarks: true,
              includeDensitySteps: true,
            },
          }),
        });

        setExportProgress(70);

        if (!response.ok) throw new Error("Printer export failed");

        const data = await response.json();

        setExportProgress(100);

        if (data.success) {
          toast({
            title: "Success",
            description: "Menu exported for printer with all marks and bleeds",
          });

          await logExport(menuId, options as ExportOptions, printerCompany);

          return data;
        } else {
          throw new Error(data.error || "Printer export failed");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setExporting(false);
        setExportProgress(0);
      }
    },
    [user?.id, toast]
  );

  // Export with layers (PSD/SVG)
  const exportWithLayers = useCallback(
    async (
      menuId: string,
      canvasState: Record<string, any>,
      format: "psd" | "svg" | "ai"
    ) => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setExporting(true);
      setExportProgress(0);
      setError(null);

      try {
        setExportProgress(20);

        const response = await fetch("/api/menus/export-layers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId,
            userId: user.id,
            canvasState,
            format,
            preserveLayers: true,
          }),
        });

        setExportProgress(75);

        if (!response.ok) throw new Error(`${format.toUpperCase()} export failed`);

        const data = await response.json();

        setExportProgress(100);

        if (data.success) {
          toast({
            title: "Success",
            description: `Menu exported as ${format.toUpperCase()} with layers preserved`,
          });

          await logExport(menuId, {
            ...defaultExportOptions,
            format: format as any,
            preserveLayers: true,
          });

          return data;
        } else {
          throw new Error(data.error || `${format.toUpperCase()} export failed`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setExporting(false);
        setExportProgress(0);
      }
    },
    [user?.id, toast]
  );

  // Download file
  const downloadFile = useCallback((fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Log export for audit trail
  const logExport = useCallback(
    async (
      menuId: string,
      options: ExportOptions,
      printerCompany?: string
    ) => {
      try {
        await fetch("/api/menus/export-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            menuId,
            exportFormat: options.format,
            includeBleeds: options.includeBleeds,
            includeMarks: options.includeMarks,
            colorSpace: options.colorSpace,
            resolutionDpi: options.resolutionDpi,
            printerCompany,
          }),
        });
      } catch (err) {
        console.error("Failed to log export:", err);
      }
    },
    [user?.id]
  );

  return {
    exporting,
    exportProgress,
    error,
    exportMenu,
    exportForPrinter,
    exportWithLayers,
    downloadFile,
  };
}
