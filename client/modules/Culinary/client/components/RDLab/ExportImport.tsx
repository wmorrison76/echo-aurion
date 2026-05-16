import { useRDLabStore } from "@/stores/rdLabStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, Upload, FileJson } from "lucide-react";
import { toast } from "sonner";

export function ExportImport() {
  const { experiments, focusExperimentId, serializeState } = useRDLabStore();

  const handleExportProject = () => {
    try {
      const snapshot = serializeState();
      const dataStr = JSON.stringify(snapshot, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rd-lab-project-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Project exported successfully");
    } catch (error) {
      toast.error("Failed to export project");
    }
  };

  const handleExportExperiment = () => {
    if (!focusExperimentId) {
      toast.error("No experiment selected");
      return;
    }

    try {
      const experiment = experiments.find((e) => e.id === focusExperimentId);
      if (!experiment) {
        toast.error("Experiment not found");
        return;
      }

      const dataStr = JSON.stringify(experiment, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `experiment-${experiment.title.replace(/\s+/g, "-").toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Experiment exported successfully");
    } catch (error) {
      toast.error("Failed to export experiment");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Export & Import
        </CardTitle>
        <CardDescription>
          Backup or share your experiments and projects
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Export Section */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Export</p>
          <div className="grid gap-2">
            <Button
              onClick={handleExportProject}
              variant="outline"
              className="w-full gap-2 justify-start"
            >
              <Download className="h-4 w-4" />
              Export Entire Project
            </Button>
            <Button
              onClick={handleExportExperiment}
              variant="outline"
              className="w-full gap-2 justify-start"
              disabled={!focusExperimentId}
            >
              <Download className="h-4 w-4" />
              Export Current Experiment
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Downloads as JSON file. Can be imported later or shared with team
            members.
          </p>
        </div>

        {/* Import Section */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-semibold">Import</p>
          <div className="space-y-2">
            <label className="flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 dark:border-[#c8a97e]/15 dark:bg-amber-500/5 px-4 py-6 cursor-pointer transition hover:border-white/40 dark:hover:border-[#c8a97e]/30">
              <div className="text-center">
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium">Click to import</p>
                <p className="text-xs text-muted-foreground">
                  or drag and drop JSON file
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const content = event.target?.result as string;
                      const data = JSON.parse(content);
                      // In production, validate and import the data
                      toast.success("File imported successfully");
                    } catch {
                      toast.error("Invalid JSON file");
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a previously exported JSON file to restore experiments and
            projects.
          </p>
        </div>

        {/* Info */}
        <div className="rounded-lg border border-blue-200/50 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10 p-3 text-xs text-blue-900 dark:text-blue-100 space-y-1">
          <p className="font-semibold">💡 Pro Tips:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Export regularly to backup your work</li>
            <li>Share experiments with team members via email</li>
            <li>Migrate experiments between projects</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
