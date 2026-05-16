import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { MenuDesignStudio } from "./MenuDesignStudio";
import { exportDesignAsPDF, exportDesignAsSVG } from "@/lib/menu-studio-export";
import type { DesignerState } from "./hooks";

export function MenuDesignStudioWrapper() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSave = useCallback((state: DesignerState) => {
    try {
      localStorage.setItem(`menu-design-${state.documentName}`, JSON.stringify(state));
      toast({
        title: t("menu.saved"),
        description: `"${state.documentName}" saved to local storage`,
      });
    } catch (error) {
      toast({
        title: t("menu.error"),
        description: "Failed to save design",
        variant: "destructive",
      });
    }
  }, [toast, t]);

  const handleExport = useCallback(
    (format: "pdf" | "svg", state: DesignerState) => {
      try {
        const canvas = document.querySelector('div[style*="scale"]') as HTMLElement;
        if (!canvas) {
          toast({
            title: "Export Failed",
            description: "Canvas not found",
            variant: "destructive",
          });
          return;
        }

        if (format === "pdf") {
          exportDesignAsPDF(
            canvas,
            state.documentName,
            {
              width: state.pageSize.width,
              height: state.pageSize.height,
            },
            {}
          );
          toast({
            title: t("menu.exported"),
            description: `Menu exported as PDF`,
          });
        } else if (format === "svg") {
          exportDesignAsSVG(
            canvas,
            state.documentName,
            {
              width: state.pageSize.width,
              height: state.pageSize.height,
            }
          );
          toast({
            title: t("menu.exported"),
            description: `Menu exported as SVG`,
          });
        }
      } catch (error) {
        console.error("Export error:", error);
        toast({
          title: "Export Failed",
          description: "Could not export design",
          variant: "destructive",
        });
      }
    },
    [toast, t]
  );

  return (
    <MenuDesignStudio
      onSave={handleSave}
      onExport={handleExport}
    />
  );
}

export default MenuDesignStudioWrapper;
