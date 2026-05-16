import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  BookOpen,
  Beaker,
  Users,
  FileText,
  Lightbulb,
} from "lucide-react";

const HELP_SECTIONS = [
  {
    id: "getting-started",
    icon: Lightbulb,
    title: "Getting Started",
    content: [
      {
        subtitle: "Understanding the R&D Labs",
        text: "The R&D Labs module is a scientific experimentation framework designed for systematic recipe development, culinary innovation, and ingredient exploration. It follows a structured methodology to bridge hypothesis-driven development with practical kitchen execution.",
      },
      {
        subtitle: "Core Workflow",
        text: "Create experiments → Define hypotheses → Set variables → Execute tests → Capture data → Analyze results → Implement learnings. Each step maintains scientific rigor while accommodating culinary creativity.",
      },
      {
        subtitle: "Key Principles",
        text: "1. Hypothesis-Driven: Start with testable hypotheses\n2. Variable Control: Isolate and test specific variables\n3. Sensory Science: Document both objective and subjective observations\n4. Collaboration: Enable team input across locations\n5. Documentation: Maintain detailed records for reproducibility",
      },
    ],
  },
  {
    id: "experiment-design",
    icon: Beaker,
    title: "Experiment Design",
    content: [
      {
        subtitle: "Structuring Your Experiment",
        text: "A well-designed experiment includes: clear hypothesis, controlled variables, sensory targets, test methodology, equipment needs, and success criteria. Use our templates as starting points.",
      },
      {
        subtitle: "Hypothesis Development",
        text: "Your hypothesis should be testable and specific. Example: 'Increasing koji fermentation time from 48-72 hours will reduce final custard viscosity by 15-20% while maintaining flavor intensity above 7/10 on the tasting panel.'",
      },
      {
        subtitle: "Variables Under Test",
        text: "List specific parameters you're controlling: temperatures, times, ingredient ratios, techniques. Keep independent and dependent variables clearly separated. Document baseline/control conditions.",
      },
      {
        subtitle: "Sensory Targets",
        text: "Define measurable sensory outcomes: texture on viscosity scales, flavor intensity ratings, aroma profiles, mouthfeel characteristics. Use consistent terminology and assessment protocols.",
      },
      {
        subtitle: "Test Plan",
        text: "Break experiments into discrete test steps with timing, measurements, and observation points. Include controls, replicates, and quality checkpoints. Document environmental conditions (temperature, humidity, timing).",
      },
    ],
  },
  {
    id: "specialization",
    icon: Users,
    title: "Specializations",
    content: [
      {
        subtitle: "Culinary Labs",
        text: "Focus on savory development, sauce science, protein preparation, plating systems, and flavor pairing methodologies. Typical projects: emulsion stability, cook-time optimization, fermentation profiles.",
      },
      {
        subtitle: "Pastry Labs",
        text: "Dedicated to baking science, lamination perfection, fermented dairy systems, sugar work, chocolate tempering, and delicate texture development. Includes gluten-free and allergen-conscious formulation.",
      },
      {
        subtitle: "Cross-Disciplinary",
        text: "Experiments spanning both culinary and pastry domains. Example: fermented elements in plated dishes, texture contrasts combining cooked and baked components.",
      },
    ],
  },
  {
    id: "tools-features",
    icon: FileText,
    title: "Tools & Features",
    content: [
      {
        subtitle: "Workbench Panel",
        text: "Central editing interface for active experiments. Document observations, update variables, add test steps. Maintains versioning and timestamps for all changes. Access supporting insights and experiment context.",
      },
      {
        subtitle: "Global Search",
        text: "Search across all experiments by title, hypothesis, tags, owner, or status. Filter by specialization (culinary/pastry/both), status phase (ideation/testing/ready/archived). Use filters to find similar experiments.",
      },
      {
        subtitle: "Batch Operations",
        text: "Bulk update multiple experiments: change status, add tags, update classifications. Useful for organizing experiment campaigns or transitioning groups from testing to deployment.",
      },
      {
        subtitle: "Collaboration System",
        text: "Invite team members across locations with role-based access (owner/editor/viewer). Enable real-time synchronization for simultaneous work. Maintain audit trail of all contributions.",
      },
      {
        subtitle: "Recipe Linking",
        text: "Connect experiments to actual recipes in your system. Track which experiments informed recipe development. Document implementation notes and modifications from lab to kitchen.",
      },
      {
        subtitle: "Templates",
        text: "Pre-structured experiment templates for common scenarios. Specialized templates for culinary and pastry domains. Accelerate experiment setup while maintaining methodological consistency.",
      },
      {
        subtitle: "Export/Import",
        text: "Backup experiment data as JSON files. Share experiment protocols with other teams. Import previous experiment records for continuation or replication studies.",
      },
      {
        subtitle: "Insights Panel",
        text: "View key metrics, trends, and operational alerts. Monitor margin impacts, guest sentiment trends, supplier volatility. Data-driven indicators for lab direction.",
      },
    ],
  },
  {
    id: "best-practices",
    icon: BookOpen,
    title: "Best Practices",
    content: [
      {
        subtitle: "Scientific Rigor",
        text: "Always include control batches. Document baseline measurements. Test in replicates (minimum 2-3). Control for environmental variables (temperature, humidity, timing). Maintain consistent measurement protocols.",
      },
      {
        subtitle: "Collaboration Protocol",
        text: "Share hypotheses before experiments begin. Document all observations in real-time. Enable multiple people to review methodology. Use standardized terminology. Maintain clear communication of findings.",
      },
      {
        subtitle: "Data Management",
        text: "Export completed experiments regularly. Archive successful protocols for reference. Tag related experiments for easy recall. Document 'failed' experiments thoroughly—they provide valuable insights.",
      },
      {
        subtitle: "Menu Implementation",
        text: "Link successful experiments to recipes before launch. Capture implementation notes (adjustments, scaling factors, equipment differences). Test recipes at scale before service. Train kitchen staff on critical variables.",
      },
      {
        subtitle: "Iterative Development",
        text: "Use experiment results to inform next iteration. Build on successful variables from previous tests. Document the evolution from concept to finalized technique. Share learnings across team.",
      },
    ],
  },
  {
    id: "scientific-methodology",
    icon: Beaker,
    title: "Scientific Methodology",
    content: [
      {
        subtitle: "The Scientific Method in R&D",
        text: "1. Observation: Identify a culinary challenge\n2. Hypothesis: Propose a solution\n3. Prediction: Define expected outcomes\n4. Experiment: Execute controlled tests\n5. Analysis: Evaluate results\n6. Conclusion: Document findings\n7. Communication: Share learnings",
      },
      {
        subtitle: "Texture Science",
        text: "Understand rheological properties: viscosity, gel strength, pourability, mouthfeel. Use instruments (viscometers, penetrometers) alongside sensory evaluation. Consider how temperature, pH, and ingredients affect texture.",
      },
      {
        subtitle: "Flavor Architecture",
        text: "Map flavor constellations using taste wheels and aroma wheels. Understand flavor interactions: sweet-salt, bitter-fat, acid-umami. Document how cooking methods develop or diminish flavors. Consider retronasal aroma.",
      },
      {
        subtitle: "Future-Food Angles",
        text: "Sustainability: Ingredient sourcing, waste reduction, local alternatives\nInnovation: Novel techniques, ingredient applications, presentation methods\nInclusion: Allergen management, dietary accommodations, cultural relevance\nTechnology: Equipment optimization, precision cooking, data capture",
      },
    ],
  },
];

interface RDLabsHelpPanelProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function RDLabsHelpPanel({ isOpen, onClose }: RDLabsHelpPanelProps) {
  const [activeSection, setActiveSection] = useState("getting-started");

  if (!isOpen) return null;

  return (
    <div className="w-96 h-full flex flex-col border-l border-[#c8a97e]/15 bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-[#c8a97e]/15 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#c8a97e]" />
          <h2 className="text-lg font-semibold text-white">R&D Labs Guide</h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-[#c8a97e]/15 text-[#c8a97e] hover:text-[#c8a97e] transition-colors"
            title="Close (Esc)"
          >
            ✕
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <Tabs
          value={activeSection}
          onValueChange={setActiveSection}
          className="w-full h-full flex flex-col"
        >
          <TabsList className="w-full justify-start gap-2 border-b border-[#c8a97e]/15 rounded-none bg-transparent p-2">
            {HELP_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="gap-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#c8a97e] data-[state=active]:bg-transparent text-xs"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{section.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {HELP_SECTIONS.map((section) => (
            <TabsContent
              key={section.id}
              value={section.id}
              className="flex-1 p-4 space-y-4"
            >
              {section.content.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="font-semibold text-[#c8a97e] text-sm">
                    {item.subtitle}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {item.text}
                  </p>
                  {idx < section.content.length - 1 && (
                    <div className="h-px bg-[#c8a97e]/08 my-3" />
                  )}
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-[#c8a97e]/15 p-4 bg-slate-900/50">
        <p className="text-xs text-slate-400">
          For additional support, check the main app help or contact your R&D
          coordinator.
        </p>
      </div>
    </div>
  );
}
