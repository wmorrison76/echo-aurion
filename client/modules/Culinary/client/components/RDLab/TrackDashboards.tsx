import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Zap,
  Target,
  FlaskConical,
  Lightbulb,
  Flame,
  Droplet,
} from "lucide-react";

interface TrackDashboardProps {
  track: "fine-dining" | "manufacturing";
  labMode: "culinary" | "pastry";
}

export function TrackDashboards({ track, labMode }: TrackDashboardProps) {
  if (track === "fine-dining") {
    if (labMode === "pastry") {
      return <PastryFineDiningDashboard />;
    }
    return <FineDiningDashboard />;
  }

  if (track === "manufacturing") {
    return <ManufacturingDashboard labMode={labMode} />;
  }

  return null;
}

function FineDiningDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Fine Dining Lab</h2>
        <p className="text-muted-foreground">
          Innovation & Culinary Masterpieces
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Lightbulb}
          title="Innovation Score"
          value="8.5/10"
          description="Creativity & Uniqueness"
          trend={+2.1}
          color="from-[#c8a97e] to-blue-500"
        />
        <MetricCard
          icon={Flame}
          title="Technique Mastery"
          value="7.8/10"
          description="Complexity & Execution"
          trend={+1.5}
          color="from-orange-500 to-red-500"
        />
        <MetricCard
          icon={FlaskConical}
          title="Flavor Complexity"
          value="12 Layers"
          description="Taste Profile Depth"
          trend={+3}
          color="from-purple-500 to-pink-500"
        />
        <MetricCard
          icon={Target}
          title="Replicability"
          value="72%"
          description="By Other Chefs"
          trend={-5}
          color="from-green-500 to-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle>Recent Innovations</CardTitle>
            <CardDescription>Your latest experiment creations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Spherified Beet Essence",
              "Deconstructed Tortilla",
              "Liquid Nitrogen Foam",
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 bg-muted/50 dark:bg-slate-800/30 rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{item}</p>
                  <p className="text-xs text-muted-foreground">
                    Technique: Molecular
                  </p>
                </div>
                <Badge>In Progress</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle>Output Formats</CardTitle>
            <CardDescription>Export your creations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Plating Guides
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Visual presentation specifications
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="font-medium text-purple-900 dark:text-purple-200">
                Technique Videos
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Step-by-step execution guides
              </p>
            </div>
            <div className="p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
              <p className="font-medium text-pink-900 dark:text-pink-200">
                Recipe Documentation
              </p>
              <p className="text-xs text-pink-700 dark:text-pink-300">
                Detailed ingredient & method specs
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PastryFineDiningDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          Pastry Fine Dining Lab
        </h2>
        <p className="text-muted-foreground">
          Artistic Expression in Every Bite
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          title="Flavor Balance"
          value="9.2/10"
          description="Sweet-Savory Harmony"
          trend={+1.8}
          color="from-rose-500 to-pink-500"
        />
        <MetricCard
          icon={Zap}
          title="Texture Contrast"
          value="5 Types"
          description="Crisp-Soft Ratios"
          trend={+2}
          color="from-amber-500 to-orange-500"
        />
        <MetricCard
          icon={Droplet}
          title="Single-Bite Complexity"
          value="8 Ingredients"
          description="Flavor Profile Layers"
          trend={+3}
          color="from-fuchsia-500 to-purple-500"
        />
        <MetricCard
          icon={BarChart3}
          title="Batch Consistency"
          value="94%"
          description="Replicate Accuracy"
          trend={-2}
          color="from-green-500 to-teal-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle>Active Creations</CardTitle>
            <CardDescription>Your pastry experiments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                name: "Rose-Pistachio Macaron",
                texture: "5 Layers",
                flavor: "3 Notes",
              },
              {
                name: "Chocolate Elegance",
                texture: "4 Layers",
                flavor: "4 Notes",
              },
              {
                name: "Lavender Meditation",
                texture: "3 Layers",
                flavor: "2 Notes",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 bg-muted/50 dark:bg-slate-800/30 rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.texture} • {item.flavor}
                  </p>
                </div>
                <Badge variant="outline">Tasting</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle>Output Formats</CardTitle>
            <CardDescription>Export your creations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
              <p className="font-medium text-rose-900 dark:text-rose-200">
                Recipe Cards
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Precision measurements & timing
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Flavor Pairing Charts
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Sensory profile documentation
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="font-medium text-purple-900 dark:text-purple-200">
                Plating Diagrams
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Visual presentation & assembly
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ManufacturingDashboard({
  labMode,
}: {
  labMode: "culinary" | "pastry";
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          Manufacturing Lab
        </h2>
        <p className="text-muted-foreground">
          {labMode === "pastry"
            ? "Pastry Production & Scaling"
            : "Culinary Product Development"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={BarChart3}
          title="Shelf Life"
          value="180 Days"
          description="Ambient Storage"
          trend={+30}
          color="from-blue-500 to-[#c8a97e]"
        />
        <MetricCard
          icon={TrendingUp}
          title="Production Cost"
          value="$2.45/unit"
          description="Per Unit Cost"
          trend={-0.35}
          color="from-green-500 to-emerald-500"
        />
        <MetricCard
          icon={Zap}
          title="Batch Consistency"
          value="97.2%"
          description="Quality Control"
          trend={+2.1}
          color="from-yellow-500 to-orange-500"
        />
        <MetricCard
          icon={Flame}
          title="Yield Rate"
          value="94%"
          description="Production Efficiency"
          trend={+3.2}
          color="from-red-500 to-pink-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle>Scaling Tests</CardTitle>
            <CardDescription>
              Recipe scaling & production trials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                name: "Signature Sauce v2.1",
                batch: "500L Batch",
                status: "Approved",
              },
              {
                name: "Dessert Topping Beta",
                batch: "250L Batch",
                status: "Testing",
              },
              {
                name: "Marinade Formula",
                batch: "1000L Batch",
                status: "Scaling",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 bg-muted/50 dark:bg-slate-800/30 rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.batch}</p>
                </div>
                <Badge>{item.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border dark:border-slate-800">
          <CardHeader>
            <CardTitle>Output Formats</CardTitle>
            <CardDescription>Export your specifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Production Specs
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Equipment & batch requirements
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="font-medium text-green-900 dark:text-green-200">
                Scaling Calculations
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Ingredient ratios & yields
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="font-medium text-purple-900 dark:text-purple-200">
                QA Checklist
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Testing & compliance protocols
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
  trend?: number;
  color: string;
}

function MetricCard({
  icon: Icon,
  title,
  value,
  description,
  trend,
  color,
}: MetricCardProps) {
  return (
    <Card
      className={`bg-gradient-to-br ${color} bg-opacity-10 border border-border dark:border-slate-800`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
        {trend && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p
              className={`text-xs font-semibold ${trend > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {trend > 0 ? "+" : ""}
              {trend}% vs last period
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
