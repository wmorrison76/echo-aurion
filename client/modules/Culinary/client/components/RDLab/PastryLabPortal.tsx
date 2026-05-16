import { useMemo } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { WorkbenchPanel } from "./WorkbenchPanel";
import { InsightsPanel } from "./InsightsPanel";
import { ExperimentTemplates } from "./ExperimentTemplates";
import { ProjectDashboard } from "./ProjectDashboard";
import { GlobalExperimentSearch } from "./GlobalExperimentSearch";
import { Beaker, BookOpen, Sparkles } from "lucide-react";

interface PastryLabPortalProps {
  isOpen: boolean;
  onClose?: () => void;
}

const PASTRY_DRIVERS = [
  {
    id: "lamination",
    name: "Lamination Excellence",
    description: "Perfecting laminated doughs and layering techniques",
  },
  {
    id: "fermentation-dairy",
    name: "Fermented Dairy",
    description: "Developing cultured and fermented dairy components",
  },
  {
    id: "pastry-texture",
    name: "Pastry Textures",
    description: "Creating delicate and innovative pastry textures",
  },
  {
    id: "chocolate",
    name: "Chocolate Innovation",
    description: "Exploring chocolate work and applications",
  },
  {
    id: "sugar-technique",
    name: "Sugar & Technique",
    description: "Advanced sugar work and pastry techniques",
  },
  {
    id: "gluten-free",
    name: "Gluten-Free Pastry",
    description: "Developing inclusive pastry options",
  },
];

export function PastryLabPortal({ isOpen, onClose }: PastryLabPortalProps) {
  const { experiments, setSpecializationFilter, specializationFilter } =
    useRDLabStore();

  const pastryExperiments = useMemo(
    () =>
      experiments.filter(
        (e) => e.specialization === "pastry" || e.specialization === "both",
      ),
    [experiments],
  );

  const experimentsByStatus = useMemo(
    () => ({
      ideation: pastryExperiments.filter((e) => e.status === "ideation").length,
      testing: pastryExperiments.filter((e) => e.status === "testing").length,
      ready: pastryExperiments.filter((e) => e.status === "ready").length,
      archived: pastryExperiments.filter((e) => e.status === "archived").length,
    }),
    [pastryExperiments],
  );

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          Pastry R&D Lab
        </h2>
        <p className="text-sm text-muted-foreground">
          Specialized workspace for pastry innovation and development
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/5 dark:border-amber-500/20 dark:bg-amber-500/5 p-2 text-center">
          <p className="text-muted-foreground">In Development</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {experimentsByStatus.ideation}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 dark:border-blue-500/20 dark:bg-blue-500/5 p-2 text-center">
          <p className="text-muted-foreground">Testing</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {experimentsByStatus.testing}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 dark:border-emerald-500/20 dark:bg-emerald-500/5 p-2 text-center">
          <p className="text-muted-foreground">Ready</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {experimentsByStatus.ready}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 dark:border-slate-500/20 dark:bg-slate-500/5 p-2 text-center">
          <p className="text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{pastryExperiments.length}</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="discovery" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discovery" className="text-xs">
            <Beaker className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="workbench" className="text-xs">
            <BookOpen className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Workbench</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            <Sparkles className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Discovery Tab */}
        <TabsContent value="discovery" className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="space-y-4 pr-4">
              <GlobalExperimentSearch
                onClose={() => {
                  // Can be used to close on selection if needed
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Workbench Tab */}
        <TabsContent value="workbench" className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pr-4">
            <WorkbenchPanel />
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pr-4">
            <ExperimentTemplates specialization="pastry" />
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pr-4">
            <InsightsPanel />
          </div>
        </TabsContent>
      </Tabs>

      {/* Pastry-Specific Focus Areas */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          Pastry Focus Areas
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PASTRY_DRIVERS.map((driver) => (
            <div
              key={driver.id}
              className="rounded-lg border border-white/10 bg-white/5 dark:border-amber-500/20 dark:bg-amber-500/5 p-2 text-xs cursor-pointer transition hover:border-white/20 dark:hover:border-amber-500/40"
            >
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {driver.name}
              </p>
              <p className="text-muted-foreground text-[10px]">
                {driver.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
