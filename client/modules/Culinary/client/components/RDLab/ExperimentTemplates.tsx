import { useState } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { toast } from "sonner";

interface ExperimentTemplate {
  id: string;
  name: string;
  description: string;
  specialization: "culinary" | "pastry" | "both";
  hypothesis: string;
  tags: string[];
  variables?: string[];
  targets?: string[];
  equipment?: string[];
  textureObjectives?: string[];
  flavorConstellations?: string[];
}

const TEMPLATES: ExperimentTemplate[] = [
  {
    id: "tmpl-texture",
    name: "Texture Development",
    description: "Explore new texture profiles and mouth-feel",
    specialization: "both",
    hypothesis:
      "Testing different stabilization and aeration techniques to develop novel texture profiles",
    tags: ["texture", "development"],
    variables: [
      "Hydrocolloid type and percentage",
      "Aeration method",
      "Holding temperature",
    ],
    targets: [
      "Target mouth-feel perception (smooth, airy, creamy, etc.)",
      "Visual appearance consistency",
      "Shelf stability",
    ],
    equipment: ["Texture analyzer", "Rheometer"],
    textureObjectives: [
      "Achieve target texture descriptor",
      "Maintain consistency across batches",
    ],
  },
  {
    id: "tmpl-flavor",
    name: "Flavor Constellation",
    description: "Develop flavor combinations and layering",
    specialization: "both",
    hypothesis:
      "Combining complementary flavor components to create a cohesive flavor experience",
    tags: ["flavor", "pairing"],
    variables: [
      "Component ratios",
      "Fermentation time",
      "Infusion temperature",
    ],
    targets: [
      "Balanced flavor profile",
      "Aromatic complexity",
      "Lingering finish",
    ],
    flavorConstellations: [
      "Primary flavor driver",
      "Supporting layers",
      "Finishing notes",
    ],
  },
  {
    id: "tmpl-pastry-lamination",
    name: "Lamination & Layers",
    description: "Develop laminated doughs and layered preparations",
    specialization: "pastry",
    hypothesis:
      "Optimizing lamination technique and layer composition for structural integrity",
    tags: ["lamination", "dough", "structure"],
    variables: [
      "Butter/dough ratio",
      "Turn count and temperature",
      "Rest duration",
    ],
    targets: [
      "Consistent layer separation",
      "Golden color development",
      "Crispy texture",
    ],
    textureObjectives: [
      "Distinct, visible layers",
      "Optimal crispiness",
      "Flake structure",
    ],
    equipment: ["Lamination roller", "Oven thermometer"],
  },
  {
    id: "tmpl-fermentation",
    name: "Fermentation Protocol",
    description: "Develop fermented ingredients and preparations",
    specialization: "culinary",
    hypothesis:
      "Understanding fermentation conditions to develop new flavor profiles and textures",
    tags: ["fermentation", "probiotic", "innovation"],
    variables: [
      "Culture type",
      "Temperature",
      "Duration",
      "Salt concentration",
    ],
    targets: ["Flavor development", "Acidity level", "Probiotic viability"],
    flavorConstellations: [
      "Base flavor profile",
      "Fermented notes",
      "Complexity development",
    ],
  },
];

interface ExperimentTemplatesProps {
  specialization?: "culinary" | "pastry" | "both";
}

export function ExperimentTemplates({
  specialization = "both",
}: ExperimentTemplatesProps) {
  const { createExperiment } = useRDLabStore();
  const [isCreating, setIsCreating] = useState<string | null>(null);

  const filteredTemplates = TEMPLATES.filter(
    (t) =>
      specialization === "both" ||
      t.specialization === "both" ||
      t.specialization === specialization,
  );

  const handleUseTemplate = async (template: ExperimentTemplate) => {
    setIsCreating(template.id);
    try {
      const experimentId = createExperiment({
        title: template.name,
        owner: "You",
        hypothesis: template.hypothesis,
        tags: template.tags,
        variablesUnderTest: template.variables,
        sensoryTargets: template.targets,
        equipment: template.equipment,
        textureObjectives: template.textureObjectives,
        flavorConstellations: template.flavorConstellations,
        specialization: template.specialization,
        notes: template.description,
      });
      toast.success(`Created experiment from template: ${template.name}`);
    } catch (error) {
      toast.error("Failed to create experiment from template");
    } finally {
      setIsCreating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Start Templates
        </h3>
        <p className="text-sm text-muted-foreground">
          Use a template to quickly create structured experiments
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="flex flex-col transition hover:shadow-md dark:hover:shadow-[#c8a97e]-500/20"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
              {/* Specialization Badge */}
              <Badge variant="secondary" className="text-xs capitalize w-fit">
                {template.specialization}
              </Badge>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                {template.variables && (
                  <p>{template.variables.length} variables to test</p>
                )}
                {template.targets && (
                  <p>{template.targets.length} sensory targets</p>
                )}
              </div>

              {/* Use Template Button */}
              <Button
                onClick={() => handleUseTemplate(template)}
                disabled={isCreating === template.id}
                size="sm"
                className="w-full mt-auto"
              >
                {isCreating === template.id ? "Creating..." : "Use Template"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No templates available for your selection
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
