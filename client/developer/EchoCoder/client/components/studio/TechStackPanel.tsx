import React, { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, TrendingUp, Clock, DollarSign } from "lucide-react";

interface DialogUnderstanding {
  coreIdea: string;
  targetUsers: string;
  mainProblem: string;
  keyFeatures: string[];
  dataEntities: string[];
  integrations: string[];
  constraints: string[];
  complexity: "simple" | "moderate" | "complex";
  completenessScore: number;
}

interface TechStackRecommendation {
  database: {
    name: string;
    rationale: string;
    benefits: string[];
    tradeoffs: string[];
    estimatedCost: string;
  };
  backend: {
    name: string;
    rationale: string;
    benefits: string[];
    tradeoffs: string[];
    estimatedPerformance: string;
  };
  frontend: {
    name: string;
    rationale: string;
    benefits: string[];
    tradeoffs: string[];
    bundleSize: string;
  };
  overall: {
    complexity: string;
    timeToMarket: string;
    scalability: string;
    maintenanceLevel: string;
    costEstimate: string;
  };
}

interface TechStackPanelProps {
  understanding: DialogUnderstanding;
  onStackSelected?: (stack: { database: string; backend: string; frontend: string }) => void;
}

export default function TechStackPanel({
  understanding,
  onStackSelected,
}: TechStackPanelProps) {
  const [recommendations, setRecommendations] = useState<{
    optionA: TechStackRecommendation;
    optionB: TechStackRecommendation;
  } | null>(null);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [implementationPlan, setImplementationPlan] = useState<any>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/phase2/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(understanding),
      });

      const data = await response.json();
      if (data.success) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  }, [understanding]);

  const fetchImplementationPlan = useCallback(
    async (stackType: "optionA" | "optionB") => {
      if (!recommendations) return;

      const stack = recommendations[stackType];
      setLoading(true);
      try {
        const response = await fetch("/api/phase2/implementation-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stack: {
              database: stack.database.name,
              backend: stack.backend.name,
              frontend: stack.frontend.name,
            },
            understanding,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setImplementationPlan(data.plan);
          setSelectedStack(stackType);
        }
      } catch (error) {
        console.error("Failed to fetch implementation plan:", error);
      } finally {
        setLoading(false);
      }
    },
    [recommendations, understanding]
  );

  React.useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (loading && !recommendations) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Tech Stack Recommendations</CardTitle>
          <CardDescription>Analyzing your project requirements...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Tech Stack Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchRecommendations} className="w-full">
            Generate Recommendations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">A/B Comparison</TabsTrigger>
          <TabsTrigger value="details">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="plan">Implementation</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Option A */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedStack === "optionA" ? "ring-2 ring-green-500" : ""
              }`}
              onClick={() => {
                setSelectedStack("optionA");
                onStackSelected?.({
                  database: recommendations.optionA.database.name,
                  backend: recommendations.optionA.backend.name,
                  frontend: recommendations.optionA.frontend.name,
                });
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg">Option A</CardTitle>
                <CardDescription>MERN-style Stack</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Technologies:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{recommendations.optionA.database.name}</Badge>
                    <Badge variant="outline">{recommendations.optionA.backend.name}</Badge>
                    <Badge variant="outline">{recommendations.optionA.frontend.name}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Cost:</span>
                    <span>{recommendations.optionA.overall.costEstimate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Timeline:</span>
                    <span>{recommendations.optionA.overall.timeToMarket}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">Scalability:</span>
                    <span>{recommendations.optionA.overall.scalability}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchImplementationPlan("optionA");
                  }}
                  disabled={loading}
                  variant={selectedStack === "optionA" ? "default" : "outline"}
                >
                  {selectedStack === "optionA" ? "Selected" : "View Details"}
                </Button>
              </CardContent>
            </Card>

            {/* Option B */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedStack === "optionB" ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => {
                setSelectedStack("optionB");
                onStackSelected?.({
                  database: recommendations.optionB.database.name,
                  backend: recommendations.optionB.backend.name,
                  frontend: recommendations.optionB.frontend.name,
                });
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg">Option B</CardTitle>
                <CardDescription>High-Performance Stack</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Technologies:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{recommendations.optionB.database.name}</Badge>
                    <Badge variant="outline">{recommendations.optionB.backend.name}</Badge>
                    <Badge variant="outline">{recommendations.optionB.frontend.name}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Cost:</span>
                    <span>{recommendations.optionB.overall.costEstimate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Timeline:</span>
                    <span>{recommendations.optionB.overall.timeToMarket}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">Scalability:</span>
                    <span>{recommendations.optionB.overall.scalability}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchImplementationPlan("optionB");
                  }}
                  disabled={loading}
                  variant={selectedStack === "optionB" ? "default" : "outline"}
                >
                  {selectedStack === "optionB" ? "Selected" : "View Details"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedStack && recommendations && (
            <div className="space-y-4">
              <h3 className="font-semibold">
                {selectedStack === "optionA" ? "Option A" : "Option B"} Details
              </h3>

              {selectedStack === "optionA" ? (
                <StackDetails stack={recommendations.optionA} />
              ) : (
                <StackDetails stack={recommendations.optionB} />
              )}
            </div>
          )}

          {!selectedStack && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Select an option above to view detailed analysis.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          {implementationPlan ? (
            <ImplementationPlan plan={implementationPlan} />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Select an option and view details to generate implementation plan.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StackDetailsProps {
  stack: TechStackRecommendation;
}

function StackDetails({ stack }: StackDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Database: {stack.database.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{stack.database.rationale}</p>
          <div>
            <h4 className="font-medium text-sm mb-2">Benefits:</h4>
            <ul className="space-y-1">
              {stack.database.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Tradeoffs:</h4>
            <ul className="space-y-1">
              {stack.database.tradeoffs.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm font-medium">Cost: {stack.database.estimatedCost}</p>
        </CardContent>
      </Card>

      {/* Backend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backend: {stack.backend.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{stack.backend.rationale}</p>
          <div>
            <h4 className="font-medium text-sm mb-2">Benefits:</h4>
            <ul className="space-y-1">
              {stack.backend.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm font-medium">
            Performance: {stack.backend.estimatedPerformance}
          </p>
        </CardContent>
      </Card>

      {/* Frontend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frontend: {stack.frontend.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{stack.frontend.rationale}</p>
          <div>
            <h4 className="font-medium text-sm mb-2">Benefits:</h4>
            <ul className="space-y-1">
              {stack.frontend.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm font-medium">Bundle Size: {stack.frontend.bundleSize}</p>
        </CardContent>
      </Card>

      {/* Overall */}
      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-base">Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Complexity:</span>
              <p>{stack.overall.complexity}</p>
            </div>
            <div>
              <span className="font-medium">Time to Market:</span>
              <p>{stack.overall.timeToMarket}</p>
            </div>
            <div>
              <span className="font-medium">Scalability:</span>
              <p>{stack.overall.scalability}</p>
            </div>
            <div>
              <span className="font-medium">Maintenance:</span>
              <p>{stack.overall.maintenanceLevel}</p>
            </div>
            <div className="col-span-2">
              <span className="font-medium">Cost Estimate:</span>
              <p>{stack.overall.costEstimate}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ImplementationPlanProps {
  plan: any;
}

function ImplementationPlan({ plan }: ImplementationPlanProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Estimated Duration: <strong>{plan.estimatedDuration}</strong>
        </AlertDescription>
      </Alert>

      {/* Phases */}
      <div>
        <h3 className="font-semibold mb-3">Implementation Phases</h3>
        <div className="space-y-2">
          {plan.phases.map((phase: any, i: number) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  {phase.name}
                  <Badge variant="outline">{phase.duration}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {phase.tasks.map((task: string, j: number) => (
                    <li key={j} className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {task}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {Object.entries(plan.resources).map(([key, value]: [string, any]) => (
              <p key={key}>
                <strong className="capitalize">{key}:</strong> {value}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risks & Mitigations */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identified Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {plan.risks.map((risk: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mitigation Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {plan.mitigations.map((mitigation: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  {mitigation}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
