import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Beaker, Sparkles, ChefHat } from "lucide-react";

interface LabDoorEntranceProps {
  onTrackSelected: (
    track: "fine-dining" | "manufacturing",
    labMode: "culinary" | "pastry",
  ) => void;
}

export function LabDoorEntrance({ onTrackSelected }: LabDoorEntranceProps) {
  const [stage, setStage] = useState<"greeting" | "doors-opening" | "ready">(
    "greeting",
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    if (stage === "doors-opening") {
      const timer = setTimeout(() => setStage("ready"), 2000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleSelection = (option: string) => {
    setSelectedOption(option);
    setStage("doors-opening");

    // Parse selection and notify parent
    setTimeout(() => {
      if (option === "fine-dining") {
        onTrackSelected("fine-dining", "culinary");
      } else if (option === "pastry-fine") {
        onTrackSelected("fine-dining", "pastry");
      } else if (option === "pastry-manufacturing") {
        onTrackSelected("manufacturing", "pastry");
      } else if (option === "manufacturing") {
        onTrackSelected("manufacturing", "culinary");
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-background dark:bg-slate-950 flex items-center justify-center z-50 overflow-hidden">
      {/* Background animated element */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        {stage === "greeting" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <div className="flex justify-center gap-2">
                <Beaker className="h-12 w-12 text-[#c8a97e]" />
                <Sparkles className="h-12 w-12 text-purple-600" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">
                Welcome to R&D Labs
              </h1>
              <p className="text-lg text-muted-foreground">
                Setting up your lab environment...
              </p>
            </div>

            <div className="bg-muted/50 dark:bg-slate-900/50 p-8 rounded-lg border border-border dark:border-slate-800 space-y-4">
              <p className="text-center font-semibold text-foreground">
                What will be your focus today?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleSelection("fine-dining")}
                  className="h-32 flex flex-col gap-3 items-center justify-center bg-[#c8a97e] hover:bg-[#b8976c] text-white"
                >
                  <ChefHat className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Fine Dining</div>
                    <div className="text-xs opacity-90">
                      Innovation & Experience
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleSelection("pastry-fine")}
                  className="h-32 flex flex-col gap-3 items-center justify-center bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Sparkles className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Pastry Fine Dining</div>
                    <div className="text-xs opacity-90">
                      Artistic Expression
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleSelection("pastry-manufacturing")}
                  className="h-32 flex flex-col gap-3 items-center justify-center bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Beaker className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Pastry Manufacturing</div>
                    <div className="text-xs opacity-90">
                      Scaling & Shelf Life
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleSelection("manufacturing")}
                  className="h-32 flex flex-col gap-3 items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Beaker className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Manufacturing</div>
                    <div className="text-xs opacity-90">
                      Mass Market Products
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}

        {stage === "doors-opening" && (
          <div className="space-y-8">
            {/* Lab doors animation */}
            <div className="relative h-80 overflow-hidden">
              {/* Left door */}
              <div
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 border-r border-border animate-out slide-out-to-left-1/2 fade-out duration-1500"
                style={{
                  animation: "slideOutLeft 1.5s ease-in-out forwards",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-50">
                  <div className="animate-pulse">
                    <Beaker className="h-24 w-24 text-[#c8a97e]" />
                  </div>
                </div>
              </div>

              {/* Right door */}
              <div
                className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 border-l border-border"
                style={{
                  animation: "slideOutRight 1.5s ease-in-out forwards",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-50">
                  <div className="animate-pulse">
                    <Sparkles className="h-24 w-24 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Center content revealed */}
              <div className="absolute inset-0 flex items-center justify-center animate-in fade-in duration-1000 delay-500">
                <div className="text-center space-y-4">
                  <p className="text-xl font-semibold text-foreground">
                    Lab initialized
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Loading your workspace...
                  </p>
                </div>
              </div>
            </div>

            <style>{`
              @keyframes slideOutLeft {
                from {
                  transform: translateX(0);
                  opacity: 1;
                }
                to {
                  transform: translateX(-100%);
                  opacity: 0;
                }
              }
              @keyframes slideOutRight {
                from {
                  transform: translateX(0);
                  opacity: 1;
                }
                to {
                  transform: translateX(100%);
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
