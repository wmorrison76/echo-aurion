import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  ChevronRight,
  Download,
  Filter,
  FileText,
  LayoutList,
  Paperclip,
  Share2,
  Shield,
  Tag,
  Users,
  X,
} from "lucide-react";
import { operationsDocs, type OperationsDoc } from "@/data/operationsDocs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MILLISECONDS_PER_DAY = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

const riskOrder: Record<OperationsDoc["riskLevel"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

type DocStatusId = "on-track" | "due-soon" | "past-due";

type DocStatus = {
  id: DocStatusId;
  label: string;
  tone: "default" | "warning" | "destructive";
  daysUntilReview: number;
  nextReview: Date;
};

type DocMeta = {
  doc: OperationsDoc;
  status: DocStatus;
  lastUpdated: Date;
};

type StatusFilter = "all" | "attention" | DocStatusId;

type SortOption = "next-review" | "recent-update" | "risk" | "coverage";

const LOCAL_STORAGE_KEY = "operationsDocs.pinned.v1";

export default function OperationsDocsWorkspace() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("next-review");
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? (parsed.filter((id) => typeof id === "string") as string[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  const docMeta = useMemo<DocMeta[]>(() => operationsDocs.map(evaluateDoc), []);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const categories = useMemo(() => {
    return Array.from(new Set(operationsDocs.map((doc) => doc.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    docMeta.forEach((meta) => {
      counts.set(meta.doc.category, (counts.get(meta.doc.category) || 0) + 1);
    });
    return counts;
  }, [docMeta]);

  const stats = useMemo(() => buildStats(docMeta), [docMeta]);

  const filteredMeta = useMemo(() => {
    const term = search.trim().toLowerCase();
    return docMeta.filter((meta) => {
      if (selectedCategories.length && !selectedCategories.includes(meta.doc.category)) {
        return false;
      }
      if (statusFilter === "attention" && meta.status.id === "on-track") {
        return false;
      }
      if (statusFilter !== "all" && statusFilter !== "attention" && meta.status.id !== statusFilter) {
        return false;
      }
      if (!term) return true;
      const haystack = [
        meta.doc.title,
        meta.doc.docType,
        meta.doc.summary,
        meta.doc.owner,
        meta.doc.category,
        meta.doc.tags.join(" "),
        meta.doc.linkedSystems.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [docMeta, search, selectedCategories, statusFilter]);

  const sortedMeta = useMemo(() => {
    const list = [...filteredMeta];
    list.sort((a, b) => compareDocs(a, b, sortOption, pinnedSet));
    return list;
  }, [filteredMeta, sortOption, pinnedSet]);

  useEffect(() => {
    if (!sortedMeta.length) {
      if (selectedDocId !== null) {
        setSelectedDocId(null);
      }
      return;
    }
    if (!selectedDocId || !sortedMeta.some((meta) => meta.doc.id === selectedDocId)) {
      setSelectedDocId(sortedMeta[0].doc.id);
    }
  }, [sortedMeta, selectedDocId]);

  const selectedMeta = useMemo(
    () => sortedMeta.find((meta) => meta.doc.id === selectedDocId) ?? null,
    [sortedMeta, selectedDocId],
  );

  const attentionCount = useMemo(
    () => docMeta.filter((meta) => meta.status.id !== "on-track").length,
    [docMeta],
  );

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setStatusFilter("all");
  };

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [id, ...prev];
    });
  };

  const handleExport = (doc: OperationsDoc) => {
    toast({
      title: "Export queued",
      description: `${doc.title} export has been added to the downloads tray.`,
    });
  };

  const handleShare = (doc: OperationsDoc) => {
    toast({
      title: "Share link copied",
      description: `${doc.title} share link is ready to send to your teams.`,
    });
  };

  const handleScheduleReview = (doc: OperationsDoc, status: DocStatus) => {
    const formattedDate = dateFormatter.format(status.nextReview);
    toast({
      title: "Review scheduled",
      description: `${doc.title} will prompt a review on ${formattedDate}.`,
    });
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto grid gap-4 px-3 py-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <DocStatsBoard stats={stats} attentionCount={attentionCount} />
          <DocFilterBar
            search={search}
            onSearchChange={setSearch}
            categories={categories}
            categoryCounts={categoryCounts}
            selectedCategories={selectedCategories}
            onToggleCategory={handleToggleCategory}
            onClearFilters={handleClearFilters}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
            attentionCount={attentionCount}
          />
          {sortedMeta.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {sortedMeta.map((meta) => (
                <DocCard
                  key={meta.doc.id}
                  meta={meta}
                  isPinned={pinnedSet.has(meta.doc.id)}
                  isActive={meta.doc.id === selectedDocId}
                  onSelect={() => setSelectedDocId(meta.doc.id)}
                  onTogglePin={() => handleTogglePin(meta.doc.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState onReset={handleClearFilters} />
          )}
        </div>
        <DocDetailPanel
          meta={selectedMeta}
          onExport={handleExport}
          onShare={handleShare}
          onScheduleReview={handleScheduleReview}
        />
      </div>
    </TooltipProvider>
  );
}

function evaluateDoc(doc: OperationsDoc): DocMeta {
  const lastUpdated = toDate(doc.lastUpdatedISO);
  const status = determineStatus(doc, lastUpdated);
  return {
    doc,
    status,
    lastUpdated,
  };
}

function toDate(iso: string): Date {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return new Date();
  }
  return new Date(parsed);
}

function determineStatus(doc: OperationsDoc, lastUpdated: Date): DocStatus {
  const now = Date.now();
  const cadenceMs = doc.cadenceDays * MILLISECONDS_PER_DAY;
  const nextReview = new Date(lastUpdated.getTime() + cadenceMs);
  const diffMs = nextReview.getTime() - now;
  const daysUntil = Math.ceil(diffMs / MILLISECONDS_PER_DAY);
  const alertWindow = doc.auditWindowDays ?? Math.max(2, Math.round(doc.cadenceDays * 0.3));

  if (daysUntil < 0) {
    return {
      id: "past-due",
      label: "Past due",
      tone: "destructive",
      daysUntilReview: daysUntil,
      nextReview,
    };
  }
  if (daysUntil <= alertWindow) {
    return {
      id: "due-soon",
      label: "Due soon",
      tone: "warning",
      daysUntilReview: daysUntil,
      nextReview,
    };
  }
  return {
    id: "on-track",
    label: "On track",
    tone: "default",
    daysUntilReview: daysUntil,
    nextReview,
  };
}

function buildStats(meta: DocMeta[]) {
  const total = meta.length;
  const dueSoon = meta.filter((m) => m.status.id === "due-soon").length;
  const pastDue = meta.filter((m) => m.status.id === "past-due").length;
  const highRisk = meta.filter((m) => m.doc.riskLevel === "high").length;
  const attachments = meta.reduce((sum, m) => sum + m.doc.attachments, 0);
  const avgCompletion =
    total === 0
      ? 0
      : meta.reduce((sum, m) => sum + m.doc.metrics.completionRate, 0) / total;

  return {
    total,
    dueSoon,
    pastDue,
    highRisk,
    attachments,
    avgCompletion,
  };
}

function compareDocs(
  a: DocMeta,
  b: DocMeta,
  sortOption: SortOption,
  pinnedSet: Set<string>,
) {
  const pinnedDiff = Number(pinnedSet.has(a.doc.id)) - Number(pinnedSet.has(b.doc.id));
  if (pinnedDiff !== 0) {
    return -pinnedDiff;
  }

  switch (sortOption) {
    case "risk":
      return riskOrder[a.doc.riskLevel] - riskOrder[b.doc.riskLevel];
    case "recent-update":
      return b.lastUpdated.getTime() - a.lastUpdated.getTime();
    case "coverage":
      return b.doc.metrics.coverage - a.doc.metrics.coverage;
    case "next-review":
    default:
      return a.status.daysUntilReview - b.status.daysUntilReview;
  }
}

type DocStatsBoardProps = {
  stats: ReturnType<typeof buildStats>;
  attentionCount: number;
};

function DocStatsBoard({ stats, attentionCount }: DocStatsBoardProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={FileText}
        title="Documents in Library"
        metric={stats.total.toString()}
        description={`${stats.attachments} attachments stored`}
      />
      <MetricCard
        icon={AlertTriangle}
        title="Needs Attention"
        metric={attentionCount.toString()}
        description={`${stats.dueSoon} due soon · ${stats.pastDue} past due`}
        tone="warning"
      />
      <MetricCard
        icon={Shield}
        title="High-Risk Programs"
        metric={stats.highRisk.toString()}
        description="HACCP, inspections, allergen matrix"
        tone="destructive"
      />
      <MetricCard
        icon={BarChart3}
        title="Avg Completion"
        metric={`${Math.round(stats.avgCompletion * 100)}%`}
        description="Completion across active docs"
      />
    </div>
  );
}

type MetricCardProps = {
  icon: typeof FileText;
  title: string;
  metric: string;
  description: string;
  tone?: "default" | "warning" | "destructive";
};

function MetricCard({ icon: Icon, title, metric, description, tone = "default" }: MetricCardProps) {
  return (
    <Card
      className={cn(
        "border border-border/70 bg-card/70 backdrop-blur-sm",
        tone === "warning" && "border-amber-400/80 bg-amber-50/40 dark:border-amber-400/30 dark:bg-amber-900/10",
        tone === "destructive" && "border-red-500/70 bg-red-50/50 dark:border-red-500/30 dark:bg-red-900/10",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight text-foreground">{metric}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

type DocFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  categoryCounts: Map<string, number>;
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onClearFilters: () => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  attentionCount: number;
};

function DocFilterBar({
  search,
  onSearchChange,
  categories,
  categoryCounts,
  selectedCategories,
  onToggleCategory,
  onClearFilters,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortChange,
  attentionCount,
}: DocFilterBarProps) {
  return (
    <Card className="border border-border/70 bg-card/70 backdrop-blur-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Filter className="hidden h-4 w-4 text-muted-foreground lg:block" aria-hidden />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search documents, owners, or tags"
              className="flex-1"
              suggestionScope={["documents", "people", "tags", "systems"]}
              minSuggestionQueryLength={1}
              suggestionLimit={10}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortOption} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger className="w-[200px]">
                <LayoutList className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="next-review">Next review</SelectItem>
                <SelectItem value="recent-update">Last updated</SelectItem>
                <SelectItem value="risk">Risk level</SelectItem>
                <SelectItem value="coverage">Coverage score</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
              <X className="h-4 w-4" aria-hidden />
              Reset
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange((value as StatusFilter) || "all")}
          >
            <ToggleGroupItem value="all" className="text-xs">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="attention" className="text-xs">
              Attention ({attentionCount})
            </ToggleGroupItem>
            <ToggleGroupItem value="due-soon" className="text-xs">
              Due soon
            </ToggleGroupItem>
            <ToggleGroupItem value="past-due" className="text-xs">
              Past due
            </ToggleGroupItem>
            <ToggleGroupItem value="on-track" className="text-xs">
              On track
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((category) => {
            const selected = selectedCategories.includes(category);
            const count = categoryCounts.get(category) ?? 0;
            return (
              <Button
                key={category}
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border-dashed text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onToggleCategory(category)}
              >
                <Tag className="h-3.5 w-3.5" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-[0.22em]">
                  {category}
                </span>
                <Badge variant={selected ? "secondary" : "outline"}>{count}</Badge>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

type DocCardProps = {
  meta: DocMeta;
  isPinned: boolean;
  isActive: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
};

function DocCard({ meta, isPinned, isActive, onSelect, onTogglePin }: DocCardProps) {
  const { doc, status } = meta;
  return (
    <Card
      role="button"
      aria-pressed={isActive}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex h-full cursor-pointer flex-col border border-border/70 bg-card/80 p-4 transition",
        isActive && "border-primary shadow-lg shadow-primary/10",
        !isActive && "hover:border-primary/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <Badge variant="outline" className="font-semibold uppercase tracking-[0.26em]">
            {doc.docType}
          </Badge>
          <h3 className="text-base font-semibold leading-tight text-foreground">
            {doc.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{doc.summary}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isPinned ? "Unpin document" : "Pin document"}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin();
          }}
        >
          {isPinned ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
      <Separator className="my-3" />
      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <InfoRow icon={CalendarClock} label="Next review" value={formatRelative(status.daysUntilReview, status.nextReview)} />
        <InfoRow icon={Users} label="Watchers" value={`${doc.watchers}`} />
        <InfoRow icon={Paperclip} label="Attachments" value={`${doc.attachments}`} />
        <InfoRow icon={Shield} label="Risk" value={toTitle(doc.riskLevel)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1">
        {doc.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-[0.22em]">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-medium uppercase tracking-[0.32em]">
        <StatusBadge status={status} />
        <div className="flex items-center gap-1 text-primary">
          View
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
    </Card>
  );
}

type InfoRowProps = {
  icon: typeof FileText;
  label: string;
  value: string;
};

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/80">{label}</span>
        <span className="text-[12px] font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

type StatusBadgeProps = {
  status: DocStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const toneClasses = {
    "on-track": "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
    "due-soon": "bg-amber-500/20 text-amber-600 dark:text-amber-300",
    "past-due": "bg-red-500/25 text-red-600 dark:text-red-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em]",
        toneClasses[status.id],
      )}
    >
      {status.label}
    </span>
  );
}

type DocDetailPanelProps = {
  meta: DocMeta | null;
  onExport: (doc: OperationsDoc) => void;
  onShare: (doc: OperationsDoc) => void;
  onScheduleReview: (doc: OperationsDoc, status: DocStatus) => void;
};

function DocDetailPanel({ meta, onExport, onShare, onScheduleReview }: DocDetailPanelProps) {
  if (!meta) {
    return (
      <Card className="sticky top-[88px] h-fit border border-dashed border-border/70 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Operations Docs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Adjust your filters or pick a document from the library to review workflows,
            ownership, and compliance history.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { doc, status } = meta;
  const nextReviewLabel = dateFormatter.format(status.nextReview);

  return (
    <Card className="sticky top-[88px] h-fit border border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Badge variant="outline" className="font-semibold uppercase tracking-[0.26em]">
              {doc.docType}
            </Badge>
            <CardTitle className="text-xl font-semibold leading-tight text-foreground">
              {doc.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-[0.28em]">Owner: {doc.owner}</span>
              <Separator orientation="vertical" className="hidden h-4 lg:block" />
              <span className="hidden uppercase tracking-[0.28em] text-muted-foreground lg:block">
                Frequency: {doc.frequencyLabel}
              </span>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <ActionButton onClick={() => onExport(doc)} icon={Download} label="Export packet" />
          <ActionButton onClick={() => onShare(doc)} icon={Share2} label="Share workspace" />
          <ActionButton
            onClick={() => onScheduleReview(doc, status)}
            icon={CalendarClock}
            label="Schedule review"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border border-border/60 bg-background/50 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="uppercase tracking-[0.28em]">
                  Next review · {nextReviewLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{formatRelative(status.daysUntilReview, status.nextReview)}</TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="uppercase tracking-[0.28em]">
              Cadence · {doc.frequencyLabel}
            </Badge>
            <Badge variant="outline" className="uppercase tracking-[0.28em]">
              Risk · {toTitle(doc.riskLevel)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{doc.summary}</p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">Metrics</h4>
          <div className="space-y-2">
            <MetricProgress label="Completion" value={doc.metrics.completionRate} />
            <MetricProgress label="Adoption" value={doc.metrics.adoption} />
            <MetricProgress label="Coverage" value={doc.metrics.coverage} />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">Linked systems</h4>
          <div className="flex flex-wrap gap-2">
            {doc.linkedSystems.map((system) => (
              <Badge key={system} variant="outline" className="text-[10px] uppercase tracking-[0.26em]">
                {system}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">Playbook focus</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {doc.playbookFocus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">History</h4>
          <div className="space-y-3">
            {doc.history.map((entry, index) => (
              <div key={`${entry.date}-${entry.author}`} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-[0.28em]">
                    {dateFormatter.format(new Date(entry.date))}
                  </span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="uppercase tracking-[0.28em]">{entry.author}</span>
                </div>
                <p className="text-sm text-foreground">{entry.note}</p>
                {index < doc.history.length - 1 ? <Separator /> : null}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ActionButtonProps = {
  onClick: () => void;
  icon: typeof FileText;
  label: string;
};

function ActionButton({ onClick, icon: Icon, label }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start gap-2 border border-border/60 bg-background/60"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="text-xs font-semibold uppercase tracking-[0.28em]">{label}</span>
    </Button>
  );
}

type MetricProgressProps = {
  label: string;
  value: number;
};

function MetricProgress({ label, value }: MetricProgressProps) {
  const percentage = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-[0.28em]">{label}</span>
        <span className="font-semibold text-foreground">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

type EmptyStateProps = {
  onReset: () => void;
};

function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <Card className="border border-dashed border-border/70 bg-card/60 p-6 text-center">
      <CardContent className="space-y-4 p-0">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/60">
          <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">No documents found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or clearing search to see the full operations playbook.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onReset} className="gap-1">
          <Filter className="h-4 w-4" aria-hidden />
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}

function formatRelative(daysUntil: number, nextReview: Date) {
  if (daysUntil === 0) {
    return "Due today";
  }
  if (daysUntil > 0) {
    if (daysUntil === 1) return "In 1 day";
    return `In ${daysUntil} days`;
  }
  const daysOverdue = Math.abs(daysUntil);
  if (daysOverdue === 1) {
    return "1 day overdue";
  }
  return `${daysOverdue} days overdue`;
}

function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
