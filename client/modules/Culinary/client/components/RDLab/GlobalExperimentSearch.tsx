import { useState, useMemo, useCallback } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Archive,
  Clock,
} from "lucide-react";

const statusIcons = {
  ideation: <Lightbulb className="h-4 w-4" />,
  testing: <AlertCircle className="h-4 w-4" />,
  ready: <CheckCircle2 className="h-4 w-4" />,
  archived: <Archive className="h-4 w-4" />,
};

const statusColors = {
  ideation:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  testing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ready:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  archived:
    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
};

export interface SearchFilter {
  status?: "ideation" | "testing" | "ready" | "archived" | "all";
  specialization?: "culinary" | "pastry" | "both" | "all";
  owner?: string;
  tag?: string;
  dateRange?: "week" | "month" | "all";
}

interface GlobalExperimentSearchProps {
  onSelectExperiment?: (experimentId: string) => void;
  onClose?: () => void;
}

export function GlobalExperimentSearch({
  onSelectExperiment,
  onClose,
}: GlobalExperimentSearchProps) {
  const {
    experiments,
    setSearchQuery,
    searchQuery,
    specializationFilter,
    setSpecializationFilter,
    setFocusExperiment,
  } = useRDLabStore();

  const [filters, setFilters] = useState<SearchFilter>({
    status: "all",
    specialization: "all",
    dateRange: "all",
  });

  const uniqueOwners = useMemo(
    () => [...new Set(experiments.map((e) => e.owner))],
    [experiments],
  );

  const uniqueTags = useMemo(
    () => [...new Set(experiments.flatMap((e) => e.tags))],
    [experiments],
  );

  const filteredExperiments = useMemo(() => {
    let results = experiments;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter((exp) =>
        [
          exp.title,
          exp.notes,
          exp.hypothesis,
          exp.owner,
          exp.tags.join(" "),
          exp.variablesUnderTest.join(" "),
          exp.sensoryTargets.join(" "),
          exp.textureObjectives.join(" "),
          exp.flavorConstellations.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    // Status filter
    if (filters.status !== "all") {
      results = results.filter((e) => e.status === filters.status);
    }

    // Specialization filter
    if (filters.specialization !== "all") {
      results = results.filter(
        (e) =>
          e.specialization === filters.specialization ||
          e.specialization === "both",
      );
    }

    // Owner filter
    if (filters.owner) {
      results = results.filter((e) => e.owner === filters.owner);
    }

    // Tag filter
    if (filters.tag) {
      results = results.filter((e) => e.tags.includes(filters.tag!));
    }

    return results;
  }, [experiments, searchQuery, filters]);

  const handleSelectExperiment = useCallback(
    (expId: string) => {
      setFocusExperiment(expId);
      onSelectExperiment?.(expId);
      onClose?.();
    },
    [setFocusExperiment, onSelectExperiment, onClose],
  );

  const handleClearFilters = () => {
    setFilters({
      status: "all",
      specialization: "all",
      dateRange: "all",
    });
    setSearchQuery("");
  };

  const hasActiveFilters =
    searchQuery.trim() ||
    filters.status !== "all" ||
    filters.specialization !== "all" ||
    filters.owner ||
    filters.tag;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search experiments by title, hypothesis, owner, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      {/* Filters */}
      <div className="space-y-3 overflow-y-auto max-h-[40vh]">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {["all", "ideation", "testing", "ready", "archived"].map(
              (status) => (
                <Button
                  key={status}
                  variant={filters.status === status ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      status: status as SearchFilter["status"],
                    })
                  }
                  className="capitalize"
                >
                  {status}
                </Button>
              ),
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Specialization
          </p>
          <div className="flex flex-wrap gap-2">
            {["all", "culinary", "pastry", "both"].map((spec) => (
              <Button
                key={spec}
                variant={
                  filters.specialization === spec ? "default" : "outline"
                }
                size="sm"
                onClick={() =>
                  setFilters({
                    ...filters,
                    specialization: spec as SearchFilter["specialization"],
                  })
                }
                className="capitalize"
              >
                {spec}
              </Button>
            ))}
          </div>
        </div>

        {uniqueOwners.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Owner
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueOwners.map((owner) => (
                <Badge
                  key={owner}
                  variant={filters.owner === owner ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      owner: filters.owner === owner ? undefined : owner,
                    })
                  }
                >
                  {owner}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {uniqueTags.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.tag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      tag: filters.tag === tag ? undefined : tag,
                    })
                  }
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredExperiments.length} result
                {filteredExperiments.length !== 1 ? "s" : ""}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            </div>
          )}

          {filteredExperiments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No experiments found
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredExperiments.map((exp) => (
              <Card
                key={exp.id}
                className="cursor-pointer transition hover:shadow-md hover:border-[#c8a97e]/50"
                onClick={() => handleSelectExperiment(exp.id)}
              >
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          {statusIcons[exp.status]}
                          {exp.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {exp.hypothesis}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge
                          className={`text-xs capitalize ${statusColors[exp.status]}`}
                        >
                          {exp.status}
                        </Badge>
                        {exp.specialization && (
                          <Badge
                            variant="secondary"
                            className="text-xs capitalize"
                          >
                            {exp.specialization}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exp.lastUpdated}
                        </div>
                      </div>
                    </div>

                    {exp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2 border-t">
                        {exp.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {exp.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{exp.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
