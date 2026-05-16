import React from "react";
/** * Smart Assistant Widget * Displays intelligent context, recommendations, and relationship intelligence * Core component of the Apple-inspired workflow system */ import {
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  Zap,
  Target,
  Users,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import type {
  SmartAssistantData,
  RecommendedAction,
  RelationshipHealth,
} from "@/shared/assistant-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
interface SmartAssistantWidgetProps {
  userId: string;
  compact?: boolean;
  onActionClick?: (action: RecommendedAction) => void;
}
export default function SmartAssistantWidget({
  userId,
  compact = false,
  onActionClick,
}: SmartAssistantWidgetProps) {
  const [assistantData, setAssistantData] = useState<SmartAssistantData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(compact ? [] : ["actions", "schedule"]),
  ); // Fetch assistant data on mount and periodically useEffect(() => { const fetchAssistantData = async () => { try { setLoading(true); setError(null); const response = await fetch(`/api/assistant/data?userId=${userId}`); const json = await response.json(); if (json.success && json.data) { setAssistantData(json.data); } else { setError(json.error || 'Failed to fetch assistant data'); } } catch (err) { setError(err instanceof Error ? err.message : 'Network error'); } finally { setLoading(false); } }; fetchAssistantData(); // Refresh every 5 minutes const interval = setInterval(fetchAssistantData, 5 * 60 * 1000); return () => clearInterval(interval); }, [userId]); const toggleSection = useCallback((section: string) => { setExpandedSections((prev) => { const next = new Set(prev); if (next.has(section)) { next.delete(section); } else { next.add(section); } return next; }); }, []); if (loading) { return ( <Card className="glass-panel border-0 mb-6"> <CardContent className="p-6"> <div className="flex items-center justify-center py-8"> <div className="animate-pulse space-y-3 w-full"> <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded w-3/4"></div> <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded w-1/2"></div> </div> </div> </CardContent> </Card> ); } if (error || !assistantData) { return ( <Card className="glass-panel border-0 mb-6 border-l-4 border-l-destructive"> <CardContent className="p-6"> <div className="flex items-start gap-3"> <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" /> <div> <p className="font-semibold text-sm">Unable to load assistant</p> <p className="text-sm text-muted-foreground">{error || 'Unknown error'}</p> </div> </div> </CardContent> </Card> ); } return ( <div className="space-y-4 mb-6"> {/* Header Card - Key Metrics & Status */} <AssistantHeaderCard data={assistantData} /> {/* Actions Section */} <ActionsPrioritySection actions={assistantData.prioritizedActions} actionSummary={assistantData.actionSummary} isExpanded={expandedSections.has('actions')} onToggle={() => toggleSection('actions')} onActionClick={onActionClick} /> {/* Schedule Section */} {!compact && ( <ScheduleSection schedule={assistantData.todaySchedule} deadlines={assistantData.upcomingDeadlines} isExpanded={expandedSections.has('schedule')} onToggle={() => toggleSection('schedule')} /> )} {/* Relationships Section */} {!compact && assistantData.topClientsByEngagement.length > 0 && ( <RelationshipsSection clients={assistantData.topClientsByEngagement} atRiskClients={assistantData.atRiskClients} isExpanded={expandedSections.has('relationships')} onToggle={() => toggleSection('relationships')} /> )} {/* Opportunities Section */} {!compact && ( <OpportunitiesSection opportunities={assistantData.opportunityAnalysis} isExpanded={expandedSections.has('opportunities')} onToggle={() => toggleSection('opportunities')} /> )} </div> );
} /** * Header Card - Key metrics and status overview */
function AssistantHeaderCard({ data }: { data: SmartAssistantData }) {
  const urgentCount = data.actionSummary.urgent + data.actionSummary.high;
  const hasAtRiskClients = data.atRiskClients.length > 0;
  return (
    <Card className="glass-panel border-0 overflow-hidden">
      {" "}
      <CardHeader className="pb-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-lg flex items-center gap-2">
              {" "}
              <Zap className="h-5 w-5 text-amber-500" /> Daily Intelligence{" "}
            </CardTitle>{" "}
            <CardDescription>
              {" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
            </CardDescription>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            {hasAtRiskClients && (
              <Badge variant="destructive" className="gap-1">
                {" "}
                <AlertTriangle className="h-3 w-3" />{" "}
                {data.atRiskClients.length} At Risk{" "}
              </Badge>
            )}{" "}
            {urgentCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                {" "}
                <Clock className="h-3 w-3" /> {urgentCount} Urgent{" "}
              </Badge>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {" "}
          {/* Closing Rate */}{" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              {" "}
              Closing Rate{" "}
            </p>{" "}
            <p className="text-2xl font-bold text-emerald-600">
              {" "}
              {(data.metrics.closingRateThisMonth * 100).toFixed(0)}%{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>{" "}
          </div>{" "}
          {/* Avg Days to Close */}{" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              {" "}
              Avg Days{" "}
            </p>{" "}
            <p className="text-2xl font-bold text-primary">
              {" "}
              {data.metrics.averageDaysToClose}{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground mt-1">To close</p>{" "}
          </div>{" "}
          {/* Avg Deal Size */}{" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              {" "}
              Avg Deal{" "}
            </p>{" "}
            <p className="text-2xl font-bold text-purple-600">
              {" "}
              ${(data.metrics.averageDealSize / 1000).toFixed(1)}k{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground mt-1">Revenue</p>{" "}
          </div>{" "}
          {/* Pipeline Value */}{" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              {" "}
              Pipeline{" "}
            </p>{" "}
            <p className="text-2xl font-bold text-indigo-600">
              {" "}
              ${(data.metrics.totalPipelineValue / 1000).toFixed(0)}k{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Total value
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
} /** * Actions Priority Section */
interface ActionsPrioritySectionProps {
  actions: RecommendedAction[];
  actionSummary: { urgent: number; high: number; medium: number; low: number };
  isExpanded: boolean;
  onToggle: () => void;
  onActionClick?: (action: RecommendedAction) => void;
}
function ActionsPrioritySection({
  actions,
  actionSummary,
  isExpanded,
  onToggle,
  onActionClick,
}: ActionsPrioritySectionProps) {
  const urgentActions = actions.filter(
    (a) => a.priority === "urgent" || a.priority === "high",
  );
  const displayActions = isExpanded ? actions : urgentActions.slice(0, 3);
  return (
    <Card className="glass-panel border-0">
      {" "}
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-background transition-colors"
        onClick={onToggle}
      >
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Target className="h-5 w-5 text-blue-500" />{" "}
            <CardTitle className="text-base">Recommended Actions</CardTitle>{" "}
            <Badge variant="secondary" className="text-xs">
              {" "}
              {actions.length} total{" "}
            </Badge>{" "}
          </div>{" "}
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isExpanded ? "rotate-180" : "",
            )}
          />{" "}
        </div>{" "}
      </CardHeader>{" "}
      {isExpanded && (
        <CardContent className="pt-0">
          {" "}
          {/* Priority Summary */}{" "}
          <div className="mb-4 p-3 bg-background rounded-lg space-y-2">
            {" "}
            <div className="flex items-center justify-between text-sm">
              {" "}
              <span className="text-muted-foreground">Urgent</span>{" "}
              <span className="font-semibold text-destructive">
                {actionSummary.urgent}
              </span>{" "}
            </div>{" "}
            <div className="flex items-center justify-between text-sm">
              {" "}
              <span className="text-muted-foreground">High Priority</span>{" "}
              <span className="font-semibold">{actionSummary.high}</span>{" "}
            </div>{" "}
            <div className="flex items-center justify-between text-sm">
              {" "}
              <span className="text-muted-foreground">Medium</span>{" "}
              <span className="font-semibold">{actionSummary.medium}</span>{" "}
            </div>{" "}
            <div className="flex items-center justify-between text-sm">
              {" "}
              <span className="text-muted-foreground">Low</span>{" "}
              <span className="font-semibold">{actionSummary.low}</span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Action List */}{" "}
          <div className="space-y-3">
            {" "}
            {displayActions.length > 0 ? (
              displayActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onClick={() => onActionClick?.(action)}
                />
              ))
            ) : (
              <p className="text-center py-6 text-muted-foreground text-sm">
                {" "}
                No actions for today{" "}
              </p>
            )}{" "}
          </div>{" "}
          {actions.length > 3 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 gap-1"
              asChild
            >
              {" "}
              <a href="/actions">
                {" "}
                View all actions <ArrowRight className="h-3 w-3" />{" "}
              </a>{" "}
            </Button>
          )}{" "}
        </CardContent>
      )}{" "}
    </Card>
  );
} /** * Individual Action Card */
function ActionCard({
  action,
  onClick,
}: {
  action: RecommendedAction;
  onClick?: () => void;
}) {
  const priorityColor = {
    urgent: "bg-destructive/10 border-destructive/30 text-destructive",
    high: "bg-orange-500/10 border-orange-500/30 text-orange-700",
    medium: "bg-amber-500/10 border-amber-500/30 text-amber-700",
    low: "bg-primary/10 border-blue-500/30 text-blue-700",
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        priorityColor[action.priority],
      )}
    >
      {" "}
      <div className="flex items-start justify-between gap-2 mb-2">
        {" "}
        <h4 className="font-semibold text-sm leading-tight flex-1">
          {" "}
          {action.action}{" "}
        </h4>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Badge variant="outline" className="text-xs">
            {" "}
            {(action.confidenceScore * 100).toFixed(0)}%{" "}
          </Badge>{" "}
        </div>{" "}
      </div>{" "}
      <p className="text-xs mb-2 opacity-90">{action.description}</p>{" "}
      <div className="flex items-center justify-between text-xs">
        {" "}
        <span className="opacity-75">{action.clientName}</span>{" "}
        <span className="opacity-75">{action.timeEstimate} min</span>{" "}
      </div>{" "}
      {action.actionItems.length > 0 && (
        <div className="mt-2 pt-2 border-t border-current border-opacity-20 space-y-1">
          {" "}
          {action.actionItems.slice(0, 2).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 text-xs opacity-75"
            >
              {" "}
              <div className="w-3 h-3 rounded-full border border-current" />{" "}
              <span>{item.title}</span>{" "}
            </div>
          ))}{" "}
          {action.actionItems.length > 2 && (
            <div className="text-xs opacity-60">
              {" "}
              +{action.actionItems.length - 2} more items{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
    </div>
  );
} /** * Schedule Section */
interface ScheduleSectionProps {
  schedule: SmartAssistantData["todaySchedule"];
  deadlines: SmartAssistantData["upcomingDeadlines"];
  isExpanded: boolean;
  onToggle: () => void;
}
function ScheduleSection({
  schedule,
  deadlines,
  isExpanded,
  onToggle,
}: ScheduleSectionProps) {
  return (
    <Card className="glass-panel border-0">
      {" "}
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-background transition-colors"
        onClick={onToggle}
      >
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Clock className="h-5 w-5 text-purple-500" />{" "}
            <CardTitle className="text-base">Today's Schedule</CardTitle>{" "}
            <Badge variant="secondary" className="text-xs">
              {" "}
              {schedule.length} items{" "}
            </Badge>{" "}
          </div>{" "}
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isExpanded ? "rotate-180" : "",
            )}
          />{" "}
        </div>{" "}
      </CardHeader>{" "}
      {isExpanded && (
        <CardContent className="pt-0">
          {" "}
          {schedule.length > 0 ? (
            <div className="space-y-2">
              {" "}
              {schedule.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border/50 hover:bg-background transition-colors"
                >
                  {" "}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    {" "}
                    <h4 className="font-semibold text-sm">{item.title}</h4>{" "}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      {item.startTime.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                    </span>{" "}
                  </div>{" "}
                  <p className="text-xs text-muted-foreground mb-1">
                    {" "}
                    {item.clientName}{" "}
                    {item.eventName && ` • ${item.eventName}`}{" "}
                  </p>{" "}
                </div>
              ))}{" "}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {" "}
              No scheduled meetings today{" "}
            </p>
          )}{" "}
          {/* Upcoming Deadlines */}{" "}
          {(deadlines.proposalDeadlines.length > 0 ||
            deadlines.eventDateCountdowns.length > 0) && (
            <>
              {" "}
              <div className="mt-4 pt-4 border-t border-border/30">
                {" "}
                <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                  {" "}
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Upcoming
                  Deadlines{" "}
                </p>{" "}
                <div className="space-y-1">
                  {" "}
                  {deadlines.proposalDeadlines.map((deadline, idx) => (
                    <p
                      key={`proposal_${idx}`}
                      className="text-xs text-muted-foreground"
                    >
                      {" "}
                      • {deadline.clientName} proposal due in{" "}
                      <span className="font-semibold">
                        {deadline.daysUntil}d
                      </span>{" "}
                    </p>
                  ))}{" "}
                  {deadlines.eventDateCountdowns.map((countdown, idx) => (
                    <p
                      key={`event_${idx}`}
                      className="text-xs text-muted-foreground"
                    >
                      {" "}
                      • {countdown.eventName} in{" "}
                      <span className="font-semibold">
                        {countdown.daysUntil}d
                      </span>{" "}
                    </p>
                  ))}{" "}
                </div>{" "}
              </div>{" "}
            </>
          )}{" "}
        </CardContent>
      )}{" "}
    </Card>
  );
} /** * Relationships Section */
interface RelationshipsSectionProps {
  clients: SmartAssistantData["topClientsByEngagement"];
  atRiskClients: SmartAssistantData["atRiskClients"];
  isExpanded: boolean;
  onToggle: () => void;
}
function RelationshipsSection({
  clients,
  atRiskClients,
  isExpanded,
  onToggle,
}: RelationshipsSectionProps) {
  return (
    <Card className="glass-panel border-0">
      {" "}
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-background transition-colors"
        onClick={onToggle}
      >
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Users className="h-5 w-5 text-green-500" />{" "}
            <CardTitle className="text-base">
              Relationship Health
            </CardTitle>{" "}
          </div>{" "}
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isExpanded ? "rotate-180" : "",
            )}
          />{" "}
        </div>{" "}
      </CardHeader>{" "}
      {isExpanded && (
        <CardContent className="pt-0">
          {" "}
          {/* Top Engaged Clients */}{" "}
          <div className="mb-4">
            {" "}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {" "}
              Top Engaged{" "}
            </p>{" "}
            <div className="space-y-2">
              {" "}
              {clients.slice(0, 3).map((client) => (
                <ClientHealthCard
                  key={client.clientId}
                  name={client.clientName}
                  health={client.health}
                />
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* At Risk Clients */}{" "}
          {atRiskClients.length > 0 && (
            <div className="pt-4 border-t border-border/30">
              {" "}
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">
                {" "}
                Requires Attention{" "}
              </p>{" "}
              <div className="space-y-2">
                {" "}
                {atRiskClients.slice(0, 3).map((client) => (
                  <div
                    key={client.clientId}
                    className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    {" "}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {" "}
                      <p className="font-semibold text-sm">
                        {client.clientName}
                      </p>{" "}
                      <span className="text-xs font-semibold text-destructive">
                        {" "}
                        {(client.riskScore * 100).toFixed(0)}% risk{" "}
                      </span>{" "}
                    </div>{" "}
                    <p className="text-xs text-muted-foreground">
                      {client.reason}
                    </p>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </CardContent>
      )}{" "}
    </Card>
  );
} /** * Client Health Card */
function ClientHealthCard({
  name,
  health,
}: {
  name: string;
  health: RelationshipHealth;
}) {
  const tempColor = {
    hot: "text-red-500 bg-red-500/10",
    warm: "text-orange-500 bg-orange-500/10",
    neutral: "text-muted-foreground bg-surface/10",
    cold: "text-blue-500 bg-primary/10",
    "at-risk": "text-destructive bg-destructive/10",
  };
  return (
    <div className="p-3 rounded-lg border border-border/50 hover:bg-background transition-colors">
      {" "}
      <div className="flex items-center justify-between gap-2 mb-2">
        {" "}
        <p className="font-semibold text-sm">{name}</p>{" "}
        <Badge
          className={cn("text-xs capitalize", tempColor[health.temperature])}
        >
          {" "}
          {health.temperature}{" "}
        </Badge>{" "}
      </div>{" "}
      <Progress value={health.score} className="h-2" />{" "}
      <p className="text-xs text-muted-foreground mt-1">
        {" "}
        {health.suggestedAttentionLevel === "urgent"
          ? "⚡ Needs immediate attention"
          : `${health.daysInCurrentState}d in current state`}{" "}
      </p>{" "}
    </div>
  );
} /** * Opportunities Section */
interface OpportunitiesSectionProps {
  opportunities: SmartAssistantData["opportunityAnalysis"];
  isExpanded: boolean;
  onToggle: () => void;
}
function OpportunitiesSection({
  opportunities,
  isExpanded,
  onToggle,
}: OpportunitiesSectionProps) {
  const totalOpportunity = opportunities.upsellOpportunities.reduce(
    (sum, opp) => sum + opp.estimatedAdditionalRevenue * opp.probability,
    0,
  );
  return (
    <Card className="glass-panel border-0">
      {" "}
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-background transition-colors"
        onClick={onToggle}
      >
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Lightbulb className="h-5 w-5 text-amber-500" />{" "}
            <CardTitle className="text-base">Opportunities</CardTitle>{" "}
            <Badge variant="secondary" className="text-xs">
              {" "}
              ${(totalOpportunity / 1000).toFixed(0)}k potential{" "}
            </Badge>{" "}
          </div>{" "}
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isExpanded ? "rotate-180" : "",
            )}
          />{" "}
        </div>{" "}
      </CardHeader>{" "}
      {isExpanded && (
        <CardContent className="pt-0">
          {" "}
          <div className="space-y-3">
            {" "}
            {opportunities.upsellOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="p-3 rounded-lg border border-border/50 hover:bg-background transition-colors"
              >
                {" "}
                <div className="flex items-start justify-between gap-2 mb-1">
                  {" "}
                  <h4 className="font-semibold text-sm">
                    {opp.opportunity}
                  </h4>{" "}
                  <span className="text-xs font-semibold text-green-600">
                    {" "}
                    ${opp.estimatedAdditionalRevenue}{" "}
                  </span>{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mb-2">
                  {" "}
                  {opp.recommendedApproach}{" "}
                </p>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    Success probability:{" "}
                  </span>{" "}
                  <Progress
                    value={opp.probability * 100}
                    className="h-1 flex-1"
                  />{" "}
                  <span className="text-xs font-semibold">
                    {" "}
                    {(opp.probability * 100).toFixed(0)}%{" "}
                  </span>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>
      )}{" "}
    </Card>
  );
}
