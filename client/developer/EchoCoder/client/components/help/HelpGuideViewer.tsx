import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ChevronRight,
  Clock,
  Zap,
  BookOpen,
  X,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getHelpGuide, getAllHelpGuides, HelpGuide } from "@/lib/helpContent";
import { InteractiveWalkthrough } from "./InteractiveWalkthrough";

interface HelpGuideViewerProps {
  guideId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpGuideViewer({
  guideId,
  open,
  onOpenChange,
}: HelpGuideViewerProps) {
  const [currentGuide, setCurrentGuide] = useState<HelpGuide | null>(
    guideId ? getHelpGuide(guideId) || null : null,
  );
  const [allGuides] = useState(getAllHelpGuides());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughId, setWalkthroughId] = useState("");

  const filteredGuides = allGuides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(allGuides.map((g) => g.category)),
  ) as HelpGuide["category"][];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-600";
      case "intermediate":
        return "bg-blue-600";
      case "advanced":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  const handleStartWalkthrough = (id: string) => {
    setWalkthroughId(id);
    setShowWalkthrough(true);
    // Close the help guide viewer to avoid multiple dialogs
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showWalkthrough} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {currentGuide ? (
            // Guide View
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentGuide(null)}
                      className="p-0 h-auto"
                    >
                      ← Back to Guides
                    </Button>
                  </div>
                  <DialogTitle className="text-3xl mb-2">
                    {currentGuide.title}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {currentGuide.description}
                  </DialogDescription>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={getDifficultyColor(currentGuide.difficulty)}>
                  {currentGuide.difficulty}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {currentGuide.estimatedTime} min
                </Badge>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {currentGuide.content}
                </div>
              </div>

              {currentGuide.relatedGuides &&
                currentGuide.relatedGuides.length > 0 && (
                  <div className="mt-8 pt-6 border-t space-y-4">
                    <h3 className="text-lg font-semibold">Related Guides</h3>
                    <div className="grid gap-3">
                      {currentGuide.relatedGuides
                        .map((id) => getHelpGuide(id))
                        .filter(Boolean)
                        .map((guide) => (
                          <button
                            key={guide!.id}
                            onClick={() => setCurrentGuide(guide!)}
                            className="text-left p-3 rounded border border-border hover:bg-accent/30 transition group"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium group-hover:text-cyan-400 transition">
                                  {guide!.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {guide!.description}
                                </p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

              <div className="pt-4 border-t flex gap-2">
                <Button
                  onClick={() => setCurrentGuide(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Guides
                </Button>
                {currentGuide.id === "echocoder-first-module" && (
                  <Button
                    onClick={() =>
                      handleStartWalkthrough("generate-first-module")
                    }
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Interactive Walkthrough
                  </Button>
                )}
                {currentGuide.id === "echocoder-fixing" && (
                  <Button
                    onClick={() =>
                      handleStartWalkthrough("fix-module-walkthrough")
                    }
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Interactive Walkthrough
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Guide List View
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl mb-1">
                    Help Center
                  </DialogTitle>
                  <DialogDescription>
                    Comprehensive guides and documentation for your system
                  </DialogDescription>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                  size="sm"
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat)}
                    size="sm"
                  >
                    {cat
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </Button>
                ))}
              </div>

              {/* Guide Grid */}
              <div className="grid gap-3 max-h-[calc(90vh-300px)] overflow-y-auto">
                {filteredGuides.length > 0 ? (
                  filteredGuides.map((guide) => (
                    <Card
                      key={guide.id}
                      className="cursor-pointer hover:bg-accent/30 transition group"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg group-hover:text-cyan-400 transition">
                              {guide.title}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {guide.description}
                            </CardDescription>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition flex-shrink-0 mt-1" />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge
                            className={getDifficultyColor(guide.difficulty)}
                          >
                            {guide.difficulty}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {guide.estimatedTime} min
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => setCurrentGuide(guide)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Read Guide
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No guides found matching your search
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InteractiveWalkthrough
        walkthroughId={walkthroughId}
        open={showWalkthrough}
        onOpenChange={setShowWalkthrough}
      />
    </>
  );
}

export default HelpGuideViewer;
