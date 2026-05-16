import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ALL_GUIDES,
  ALL_WALKTHROUGHS,
  ALL_TIER1_GUIDES,
  type HelpGuide,
  type Walkthrough,
} from "@/lib/tier-help-content";
import { Search, Play, BookOpen, AlertCircle } from "lucide-react";
import { EnterpriseInteractiveWalkthrough } from "./EnterpriseInteractiveWalkthrough";

export function EnterpriseHelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<HelpGuide | null>(null);
  const [selectedWalkthrough, setSelectedWalkthrough] =
    useState<Walkthrough | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);

  // Filter guides
  const filteredGuides = useMemo(() => {
    return ALL_GUIDES.filter((guide) => {
      const matchesSearch =
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesCategory =
        !categoryFilter || guide.category === categoryFilter;
      const matchesDifficulty =
        !difficultyFilter || guide.difficulty === difficultyFilter;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchQuery, categoryFilter, difficultyFilter]);

  const categories = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
  const difficulties = ["beginner", "intermediate", "advanced"];

  if (selectedGuide) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-slate-700">
        <div className="h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {selectedGuide.title}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {selectedGuide.timeEstimate} min read •{" "}
                <Badge variant="secondary" className="text-xs">
                  {selectedGuide.difficulty}
                </Badge>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedGuide(null)}
              className="text-white border-slate-600 hover:bg-slate-700"
            >
              ← Back
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-invert max-w-none">
              {selectedGuide.content.split("\n\n").map((paragraph, i) => {
                if (paragraph.startsWith("#")) {
                  const level = paragraph.match(/^#+/)?.[0].length || 1;
                  const text = paragraph.replace(/^#+\s*/, "");
                  const Component = `h${Math.min(level + 1, 6)}` as any;
                  return (
                    <Component
                      key={i}
                      className="text-white mb-4 mt-6 font-bold"
                    >
                      {text}
                    </Component>
                  );
                }
                if (paragraph.startsWith("- ")) {
                  return (
                    <ul
                      key={i}
                      className="list-disc list-inside text-slate-300 mb-4 space-y-1"
                    >
                      {paragraph
                        .split("\n")
                        .filter((line) => line.startsWith("- "))
                        .map((line, idx) => (
                          <li key={idx}>{line.replace("- ", "")}</li>
                        ))}
                    </ul>
                  );
                }
                return (
                  <p key={i} className="text-slate-300 mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Related Guides */}
            {selectedGuide.relatedGuides.length > 0 && (
              <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <h4 className="text-white font-medium mb-3">
                  📚 Related Guides
                </h4>
                <div className="space-y-2">
                  {selectedGuide.relatedGuides.map((guideId) => {
                    const relatedGuide = ALL_GUIDES.find(
                      (g) => g.id === guideId,
                    );
                    if (!relatedGuide) return null;
                    return (
                      <Button
                        key={guideId}
                        variant="ghost"
                        onClick={() => setSelectedGuide(relatedGuide)}
                        className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                      >
                        → {relatedGuide.title}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Walkthrough Link */}
            {selectedGuide.walkthroughId && (
              <div className="mt-8 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-400" />
                  Interactive Walkthrough
                </h4>
                <p className="text-sm text-slate-300 mb-3">
                  Learn this feature step-by-step with guided instructions.
                </p>
                <Button
                  onClick={() => {
                    const walkthrough = ALL_WALKTHROUGHS.find(
                      (w) => w.id === selectedGuide.walkthroughId,
                    );
                    if (walkthrough) setSelectedWalkthrough(walkthrough);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Start Walkthrough
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedWalkthrough) {
    return (
      <EnterpriseInteractiveWalkthrough
        walkthrough={selectedWalkthrough}
        onClose={() => setSelectedWalkthrough(null)}
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
      <Tabs defaultValue="guides" className="w-full h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-b border-slate-700 rounded-none">
          <TabsTrigger value="guides" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="walkthroughs" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Walkthroughs
          </TabsTrigger>
        </TabsList>

        {/* GUIDES TAB */}
        <TabsContent
          value="guides"
          className="flex-1 overflow-hidden flex flex-col m-0"
        >
          <div className="p-4 border-b border-slate-700 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={categoryFilter === cat ? "default" : "outline"}
                  onClick={() =>
                    setCategoryFilter(categoryFilter === cat ? null : cat)
                  }
                  className="text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {difficulties.map((diff) => (
                <Button
                  key={diff}
                  size="sm"
                  variant={difficultyFilter === diff ? "default" : "outline"}
                  onClick={() =>
                    setDifficultyFilter(difficultyFilter === diff ? null : diff)
                  }
                  className="text-xs capitalize"
                >
                  {diff}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredGuides.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>No guides found. Try different search terms.</p>
              </div>
            ) : (
              filteredGuides.map((guide) => (
                <Card
                  key={guide.id}
                  className="bg-slate-800 border-slate-700 hover:border-slate-600 cursor-pointer transition-colors"
                  onClick={() => setSelectedGuide(guide)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          {guide.title}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {guide.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {guide.difficulty}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {guide.timeEstimate} min
                          </span>
                          {guide.walkthroughId && (
                            <Badge className="text-xs bg-blue-600">
                              Has Walkthrough
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white ml-2"
                      >
                        →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* WALKTHROUGHS TAB */}
        <TabsContent
          value="walkthroughs"
          className="flex-1 overflow-y-auto p-4 m-0 space-y-2"
        >
          {ALL_WALKTHROUGHS.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>No walkthroughs available yet.</p>
            </div>
          ) : (
            ALL_WALKTHROUGHS.map((walkthrough) => (
              <Card
                key={walkthrough.id}
                className="bg-slate-800 border-slate-700 hover:border-blue-600 cursor-pointer transition-colors"
                onClick={() => setSelectedWalkthrough(walkthrough)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Play className="w-4 h-4 text-blue-400" />
                        {walkthrough.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {walkthrough.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {walkthrough.difficulty}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {walkthrough.estimatedTime} min
                        </span>
                        <Badge className="text-xs bg-green-600">
                          {walkthrough.steps.length} steps
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-400 hover:text-blue-300 ml-2"
                    >
                      Start →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
