import { Lightbulb, TrendingUp } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
import { cn } from "@/lib/utils";
interface Opportunity {
  id: string;
  title: string;
  potential: string;
  confidence: number;
  client?: string;
  stage?: "lead" | "qualified" | "proposed" | "negotiating";
}
interface OpportunitiesPanelProps {
  opportunities?: Opportunity[];
  onOpportunityClick?: (opportunityId: string) => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: "1",
    title: "Annual Summer Events Series",
    potential: "$125K",
    confidence: 85,
    client: "Premier Hotels",
    stage: "proposed",
  },
  {
    id: "2",
    title: "Corporate Wellness Program",
    potential: "$48K",
    confidence: 72,
    client: "Tech Startups Inc",
    stage: "qualified",
  },
  {
    id: "3",
    title: "Wedding Season Package",
    potential: "$32K",
    confidence: 58,
    client: "Engaged Couples Network",
    stage: "lead",
  },
  {
    id: "4",
    title: "Holiday Party Series",
    potential: "$95K",
    confidence: 91,
    client: "Corporate Clients",
    stage: "negotiating",
  },
];
const stageColors = {
  lead: "bg-primary/20 text-primary",
  qualified: "bg-cyan-500/20 text-cyan-300",
  proposed: "bg-purple-500/20 text-purple-300",
  negotiating: "bg-orange-500/20 text-orange-300",
};
export function OpportunitiesPanel({
  opportunities = DEFAULT_OPPORTUNITIES,
  onOpportunityClick,
  isMinimized,
  onMinimize,
  onClose,
  size = "medium",
  onSizeChange,
}: OpportunitiesPanelProps) {
  const totalPotential = opportunities.reduce((sum, opp) => {
    const amount = parseInt(opp.potential.replace(/[^0-9]/g, ""));
    return sum + amount;
  }, 0);
  return (
    <MiniPanel
      id="opportunities"
      title="Opportunities"
      icon={<Lightbulb className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      <div className="mb-3 p-2 rounded-lg bg-background border border-white/10">
        {" "}
        <p className="text-xs text-white/60 mb-1">Total Pipeline Value</p>{" "}
        <div className="flex items-baseline gap-2">
          {" "}
          <span className="text-lg font-bold text-white">
            {" "}
            ${(totalPotential / 1000).toFixed(0)}K{" "}
          </span>{" "}
          <TrendingUp className="h-4 w-4 text-green-400" />{" "}
        </div>{" "}
      </div>{" "}
      <div className="space-y-2">
        {" "}
        {opportunities.length === 0 ? (
          <p className="text-xs text-white/50 py-4 text-center">
            {" "}
            No opportunities{" "}
          </p>
        ) : (
          opportunities.map((opp) => (
            <button
              key={opp.id}
              onClick={() => onOpportunityClick?.(opp.id)}
              className="w-full text-left p-2.5 rounded-lg bg-background border border-white/10 hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {" "}
              <div className="flex items-start justify-between gap-2 mb-1">
                {" "}
                <div className="flex-1 min-w-0">
                  {" "}
                  <p className="text-xs font-semibold text-white truncate">
                    {" "}
                    {opp.title}{" "}
                  </p>{" "}
                  {opp.client && (
                    <p className="text-xs text-white/60 truncate">
                      {" "}
                      {opp.client}{" "}
                    </p>
                  )}{" "}
                </div>{" "}
                <span className="text-xs font-bold text-green-400 flex-shrink-0">
                  {" "}
                  {opp.potential}{" "}
                </span>{" "}
              </div>{" "}
              <div className="flex items-center justify-between gap-2">
                {" "}
                {opp.stage && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      stageColors[opp.stage],
                    )}
                  >
                    {" "}
                    {opp.stage}{" "}
                  </span>
                )}{" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <div className="w-12 h-1.5 rounded-full bg-background overflow-hidden">
                    {" "}
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                      style={{ width: `${opp.confidence}%` }}
                    />{" "}
                  </div>{" "}
                  <span className="text-xs text-white/60">
                    {" "}
                    {opp.confidence}%{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </button>
          ))
        )}{" "}
      </div>{" "}
    </MiniPanel>
  );
}
