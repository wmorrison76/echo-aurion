import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, Beaker, Sparkles } from "lucide-react";

interface RDLabProject {
  id: string;
  name: string;
  specialization: "culinary" | "pastry" | "both";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  owner: string;
  collaborators: Array<{ id: string; name: string }>;
  experimentCount: number;
  description?: string;
  vision?: string;
  lastAccessedBy?: string;
  lastAccessedAt?: string;
}

interface ProjectDashboardProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  recentProjects?: RDLabProject[];
  allProjects?: RDLabProject[];
}

const DEMO_PROJECTS: RDLabProject[] = [
  {
    id: "proj-001",
    name: "Preloaded Lab",
    specialization: "both",
    createdAt: "2024-01-15",
    updatedAt: "2h ago",
    createdBy: "System",
    owner: "Your Team",
    collaborators: [
      { id: "user-1", name: "A. Vega" },
      { id: "user-2", name: "M. Ruiz" },
    ],
    experimentCount: 3,
    description: "Main experimental kitchen environment",
    vision:
      "Preserve the seeded experimentation environment with its original texture, flavor, and future-of-food scaffolding.",
    lastAccessedBy: "You",
    lastAccessedAt: "2h ago",
  },
  {
    id: "proj-002",
    name: "Pastry Spring Collection",
    specialization: "pastry",
    createdAt: "2024-02-01",
    updatedAt: "3 days ago",
    createdBy: "C. Dufour",
    owner: "Pastry Team",
    collaborators: [
      { id: "user-3", name: "C. Dufour" },
      { id: "user-4", name: "L. Singh" },
    ],
    experimentCount: 12,
    description: "Texture and flavor development for spring menu",
    vision:
      "Create delicate pastry expressions using fermented dairy and floral aromatics",
    lastAccessedBy: "C. Dufour",
    lastAccessedAt: "3 days ago",
  },
  {
    id: "proj-003",
    name: "Seafood & Shellfish Innovation",
    specialization: "culinary",
    createdAt: "2024-01-20",
    updatedAt: "5 days ago",
    createdBy: "C. Nguyen",
    owner: "R&D Team",
    collaborators: [{ id: "user-5", name: "C. Nguyen" }],
    experimentCount: 8,
    description: "Exploring emulsions and texture profiles with local seafood",
  },
];

export function ProjectDashboard({
  onSelectProject,
  onCreateProject,
  recentProjects = DEMO_PROJECTS.slice(0, 2),
  allProjects = DEMO_PROJECTS,
}: ProjectDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProjects, setFilteredProjects] = useState(allProjects);
  const [specializationFilter, setSpecializationFilter] = useState<
    "all" | "culinary" | "pastry" | "both"
  >("all");

  useEffect(() => {
    let filtered = allProjects;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.createdBy.toLowerCase().includes(query) ||
          p.collaborators.some((c) => c.name.toLowerCase().includes(query)),
      );
    }

    if (specializationFilter !== "all") {
      filtered = filtered.filter(
        (p) =>
          p.specialization === specializationFilter ||
          p.specialization === "both",
      );
    }

    setFilteredProjects(filtered);
  }, [searchQuery, specializationFilter, allProjects]);

  const getSpecializationBadge = (spec: string) => {
    switch (spec) {
      case "pastry":
        return (
          <Badge className="gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/40">
            <Sparkles className="h-3 w-3" />
            Pastry
          </Badge>
        );
      case "culinary":
        return (
          <Badge className="gap-1 bg-amber-50 dark:bg-[#c8a97e]/30/30 text-[#b8976c] dark:text-[#c8a97e] border border-[#c8a97e]/80 dark:border-[#b8976c]/50 hover:bg-white/80 dark:hover:bg-[#c8a97e]-900/40">
            <Beaker className="h-3 w-3" />
            Culinary
          </Badge>
        );
      default:
        return (
          <Badge className="gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50 hover:bg-purple-100 dark:hover:bg-purple-900/40">
            <Beaker className="h-3 w-3" />
            Both
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-background p-4 text-foreground dark:text-white/80">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white/80">R&D Labs</h1>
          <p className="text-xs text-muted-foreground dark:text-[#c8a97e]/50 mt-0.5">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={onCreateProject}
          size="sm"
          className="gap-2 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          New Lab
        </Button>
      </div>

      {/* Search & Filters - Compact */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c8a97e]/30 dark:text-[#c8a97e]/40" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 border-[#c8a97e]/15 dark:border-[#c8a97e]/15 bg-white dark:bg-slate-950/50 pl-8 text-sm text-foreground dark:text-white/80 placeholder:text-[#c8a97e]/30 dark:placeholder:text-[#c8a97e]/40 focus:border-[#c8a97e]"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={specializationFilter === "all" ? "default" : "outline"}
            onClick={() => setSpecializationFilter("all")}
            size="sm"
            className="h-7 text-xs"
          >
            All
          </Button>
          <Button
            variant={
              specializationFilter === "culinary" ? "default" : "outline"
            }
            onClick={() => setSpecializationFilter("culinary")}
            size="sm"
            className="h-7 text-xs gap-1"
          >
            <Beaker className="h-3 w-3" />
            Culinary
          </Button>
          <Button
            variant={
              specializationFilter === "pastry" ? "default" : "outline"
            }
            onClick={() => setSpecializationFilter("pastry")}
            size="sm"
            className="h-7 text-xs gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Pastry
          </Button>
          <Button
            variant={specializationFilter === "both" ? "default" : "outline"}
            onClick={() => setSpecializationFilter("both")}
            size="sm"
            className="h-7 text-xs"
          >
            Both
          </Button>
        </div>
      </div>

      {/* Projects List View */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <Search className="h-8 w-8 text-accent/30 dark:text-[#c8a97e]/30 mb-2" />
            <p className="text-muted-foreground dark:text-[#c8a97e]/60 text-sm">
              No projects found
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {/* List Header */}
            <div className="sticky top-0 grid grid-cols-12 gap-3 px-3 py-2 bg-input dark:bg-slate-900/30 border-b border-[#c8a97e]/10 dark:border-[#c8a97e]/10 text-xs font-medium text-muted-foreground dark:text-[#c8a97e]/50 uppercase tracking-wider">
              <div className="col-span-4">Project</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Experiments</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-2">Team</div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-amber-500/10 dark:divide-amber-500/10">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="grid grid-cols-12 gap-3 px-3 py-2.5 hover:bg-accent/10 dark:hover:bg-[#c8a97e]-500/10 transition-colors cursor-pointer group"
                >
                  {/* Project Name */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground dark:text-white/80 truncate group-hover:text-accent dark:group-hover:text-[#c8a97e]/80">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground dark:text-[#c8a97e]/50 truncate mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-accent/30 dark:text-[#c8a97e]/30 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Specialization Badge */}
                  <div className="col-span-2 flex items-center">
                    {getSpecializationBadge(project.specialization)}
                  </div>

                  {/* Experiment Count */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-accent dark:text-[#c8a97e] bg-accent/10 dark:bg-[#c8a97e]/10 rounded px-2 py-1">
                      {project.experimentCount}
                    </span>
                  </div>

                  {/* Last Updated */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-muted-foreground dark:text-[#c8a97e]/60">
                      {project.updatedAt}
                    </span>
                  </div>

                  {/* Team/Collaborators */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex -space-x-2">
                      {project.collaborators.slice(0, 2).map((collab) => (
                        <div
                          key={collab.id}
                          className="h-6 w-6 rounded-full bg-gradient-to-br from-[#c8a97e] to-[#c8a97e] dark:from-[#c8a97e] dark:to-[#c8a97e] border border-background dark:border-slate-900 flex items-center justify-center text-xs font-medium text-white dark:text-slate-900"
                          title={collab.name}
                        >
                          {collab.name.charAt(0)}
                        </div>
                      ))}
                      {project.collaborators.length > 2 && (
                        <div className="h-6 w-6 rounded-full bg-muted dark:bg-slate-800 border border-[#c8a97e]/15 dark:border-[#c8a97e]/15 flex items-center justify-center text-xs text-accent dark:text-[#c8a97e]">
                          +{project.collaborators.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
