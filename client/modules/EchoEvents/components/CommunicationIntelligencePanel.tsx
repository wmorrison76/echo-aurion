import React from "react";
/** * Communication Intelligence Panel * Displays sentiment analysis, signals, risks, and opportunities from client communications * Part of the Apple-inspired workflow system */ import {
  useEffect,
  useState,
} from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Zap,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
interface CommunicationAnalysis {
  overallSignal: {
    sentiment: "positive" | "neutral" | "negative";
    sentimentScore: number;
    tone: string;
    keyPhrases: string[];
    redFlags: string[];
    opportunities: string[];
    engagementLevel: number;
    trustLevel: number;
  };
  sentimentTrend: {
    trend: string[];
    scores: number[];
    direction: "improving" | "declining" | "stable";
    magnitude: number;
  };
  identifiedRisks: string[];
  upsellOpportunities: string[];
  summary: {
    riskLevel: "high" | "medium" | "low";
    opportunityLevel: "high" | "medium" | "low";
    recommendedAction: string;
  };
}
interface CommunicationIntelligencePanelProps {
  clientId: string;
  clientName?: string;
  compact?: boolean;
}
export default function CommunicationIntelligencePanel({
  clientId,
  clientName = "Client",
  compact = false,
}: CommunicationIntelligencePanelProps) {
  const [analysis, setAnalysis] = useState<CommunicationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/communications/client/${clientId}`);
        const json = await response.json();
        if (json.success && json.data) {
          setAnalysis(json.data);
        } else {
          setError(json.error || "Failed to load communication analysis");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [clientId]);
  if (loading) {
    return (
      <Card className="glass-panel border-0">
        {" "}
        <CardContent className="p-6">
          {" "}
          <div className="space-y-3 animate-pulse">
            {" "}
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded w-1/2"></div>{" "}
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded w-3/4"></div>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (error || !analysis) {
    return (
      <Card className="glass-panel border-0 border-l-4 border-l-destructive">
        {" "}
        <CardContent className="p-6">
          {" "}
          <div className="flex items-center gap-2 text-sm text-destructive">
            {" "}
            <AlertTriangle className="h-4 w-4" />{" "}
            {error || "Unable to load communication analysis"}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  const sentimentColor = {
    positive: "text-green-600 bg-green-500/10",
    neutral: "text-muted-foreground bg-surface/10",
    negative: "text-destructive bg-destructive/10",
  };
  const riskColor = {
    high: "border-destructive/50 bg-destructive/5",
    medium: "border-amber-500/50 bg-amber-500/5",
    low: "border-emerald-500/50 bg-emerald-500/5",
  };
  return (
    <div className="space-y-4">
      {" "}
      {/* Main Header Card */}{" "}
      <Card className="glass-panel border-0">
        {" "}
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-background transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <MessageSquare className="h-5 w-5 text-blue-500" />{" "}
              <div>
                {" "}
                <CardTitle className="text-base">
                  {clientName} - Communication Pattern
                </CardTitle>{" "}
                <CardDescription className="text-xs">
                  {" "}
                  Last 90 days analysis{" "}
                </CardDescription>{" "}
              </div>{" "}
            </div>{" "}
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                expanded ? "rotate-180" : "",
              )}
            />{" "}
          </div>{" "}
        </CardHeader>{" "}
        {expanded && (
          <CardContent className="pt-0 space-y-4">
            {" "}
            {/* Sentiment Overview */}{" "}
            <div className="p-4 rounded-lg bg-background">
              {" "}
              <div className="flex items-center justify-between mb-3">
                {" "}
                <h4 className="font-semibold text-sm">Sentiment</h4>{" "}
                <Badge
                  className={cn(
                    "capitalize",
                    sentimentColor[analysis.overallSignal.sentiment],
                  )}
                >
                  {" "}
                  {analysis.overallSignal.sentiment}{" "}
                </Badge>{" "}
              </div>{" "}
              <Progress
                value={(analysis.overallSignal.sentimentScore + 1) * 50}
                className="h-2 mb-2"
              />{" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                Score: {analysis.overallSignal.sentimentScore.toFixed(2)}{" "}
              </p>{" "}
            </div>{" "}
            {/* Sentiment Trend */}{" "}
            <SentimentTrendChart trend={analysis.sentimentTrend} />{" "}
            {/* Engagement & Trust */}{" "}
            <div className="grid grid-cols-2 gap-3">
              {" "}
              <div className="p-3 rounded-lg border border-border/50">
                {" "}
                <p className="text-xs text-muted-foreground mb-2">
                  Engagement
                </p>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Progress
                    value={analysis.overallSignal.engagementLevel * 100}
                    className="h-1 flex-1"
                  />{" "}
                  <span className="text-xs font-semibold">
                    {" "}
                    {(analysis.overallSignal.engagementLevel * 100).toFixed(0)}
                    %{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              <div className="p-3 rounded-lg border border-border/50">
                {" "}
                <p className="text-xs text-muted-foreground mb-2">Trust</p>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Progress
                    value={analysis.overallSignal.trustLevel * 100}
                    className="h-1 flex-1"
                  />{" "}
                  <span className="text-xs font-semibold">
                    {" "}
                    {(analysis.overallSignal.trustLevel * 100).toFixed(0)}%{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            {/* Tone & Key Phrases */}{" "}
            <div>
              {" "}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {" "}
                Communication Style{" "}
              </p>{" "}
              <div className="flex items-center gap-2 mb-3">
                {" "}
                <Badge variant="outline" className="text-xs capitalize">
                  {" "}
                  {analysis.overallSignal.tone}{" "}
                </Badge>{" "}
              </div>{" "}
              {analysis.overallSignal.keyPhrases.length > 0 && (
                <div className="space-y-1">
                  {" "}
                  <p className="text-xs text-muted-foreground">
                    Key Topics:
                  </p>{" "}
                  <div className="flex flex-wrap gap-1">
                    {" "}
                    {analysis.overallSignal.keyPhrases
                      .slice(0, 4)
                      .map((phrase) => (
                        <Badge
                          key={phrase}
                          variant="secondary"
                          className="text-xs"
                        >
                          {" "}
                          {phrase}{" "}
                        </Badge>
                      ))}{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </CardContent>
        )}{" "}
      </Card>{" "}
      {/* Risks Card */}{" "}
      {(analysis.identifiedRisks.length > 0 ||
        analysis.summary.riskLevel !== "low") && (
        <Card
          className={cn(
            "glass-panel border-0 border-l-4",
            riskColor[analysis.summary.riskLevel],
          )}
        >
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <AlertTriangle className="h-5 w-5 text-amber-500" />{" "}
              <div>
                {" "}
                <CardTitle className="text-base">
                  Areas of Concern
                </CardTitle>{" "}
                <CardDescription className="text-xs capitalize">
                  {" "}
                  Risk Level: {analysis.summary.riskLevel}{" "}
                </CardDescription>{" "}
              </div>{" "}
            </div>{" "}
          </CardHeader>{" "}
          {analysis.identifiedRisks.length > 0 && (
            <CardContent className="pt-0">
              {" "}
              <ul className="space-y-2">
                {" "}
                {analysis.identifiedRisks.slice(0, 3).map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    {" "}
                    <span className="text-amber-500 mt-0.5">•</span>{" "}
                    <span className="text-muted-foreground">{risk}</span>{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
              {analysis.identifiedRisks.length > 3 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {" "}
                  +{analysis.identifiedRisks.length - 3} more concerns{" "}
                </p>
              )}{" "}
            </CardContent>
          )}{" "}
        </Card>
      )}{" "}
      {/* Opportunities Card */}{" "}
      {(analysis.upsellOpportunities.length > 0 ||
        analysis.summary.opportunityLevel !== "low") && (
        <Card className="glass-panel border-0">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <Lightbulb className="h-5 w-5 text-amber-500" />{" "}
              <div>
                {" "}
                <CardTitle className="text-base">
                  Growth Opportunities
                </CardTitle>{" "}
                <CardDescription className="text-xs capitalize">
                  {" "}
                  Opportunity Level: {analysis.summary.opportunityLevel}{" "}
                </CardDescription>{" "}
              </div>{" "}
            </div>{" "}
          </CardHeader>{" "}
          {analysis.upsellOpportunities.length > 0 && (
            <CardContent className="pt-0">
              {" "}
              <ul className="space-y-2">
                {" "}
                {analysis.upsellOpportunities.slice(0, 3).map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    {" "}
                    <span className="text-emerald-500 mt-0.5">→</span>{" "}
                    <span className="text-muted-foreground">{opp}</span>{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
              {analysis.upsellOpportunities.length > 3 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {" "}
                  +{analysis.upsellOpportunities.length - 3} more
                  opportunities{" "}
                </p>
              )}{" "}
            </CardContent>
          )}{" "}
        </Card>
      )}{" "}
      {/* Recommended Action Card */}{" "}
      <Card className="glass-panel border-0 bg-primary/5 border border-primary/20">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <div className="flex items-start gap-2">
            {" "}
            <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />{" "}
            <div className="flex-1">
              {" "}
              <CardTitle className="text-base text-primary">
                Recommended Next Step
              </CardTitle>{" "}
              <p className="text-sm text-foreground mt-1">
                {analysis.summary.recommendedAction}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </CardHeader>{" "}
      </Card>{" "}
      {/* Red Flags Inline */}{" "}
      {analysis.overallSignal.redFlags.length > 0 && (
        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          {" "}
          <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
            {" "}
            <AlertTriangle className="h-3 w-3" /> Flags{" "}
          </p>{" "}
          <div className="flex flex-wrap gap-1">
            {" "}
            {analysis.overallSignal.redFlags.map((flag) => (
              <Badge key={flag} variant="destructive" className="text-xs">
                {" "}
                {flag}{" "}
              </Badge>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Opportunities Inline */}{" "}
      {analysis.overallSignal.opportunities.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          {" "}
          <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
            {" "}
            <Lightbulb className="h-3 w-3" /> Quick Wins{" "}
          </p>{" "}
          <div className="flex flex-wrap gap-1">
            {" "}
            {analysis.overallSignal.opportunities.map((opp) => (
              <Badge key={opp} variant="outline" className="text-xs">
                {" "}
                {opp}{" "}
              </Badge>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
} /** * Sentiment Trend Chart Component */
function SentimentTrendChart({
  trend,
}: {
  trend: {
    trend: string[];
    scores: number[];
    direction: "improving" | "declining" | "stable";
    magnitude: number;
  };
}) {
  const trendIcon =
    trend.direction === "improving" ? (
      <TrendingUp className="h-4 w-4 text-emerald-500" />
    ) : trend.direction === "declining" ? (
      <TrendingDown className="h-4 w-4 text-destructive" />
    ) : (
      <BarChart3 className="h-4 w-4 text-muted-foreground" />
    );
  return (
    <div className="p-3 rounded-lg border border-border/50">
      {" "}
      <div className="flex items-center justify-between mb-3">
        {" "}
        <p className="text-xs font-semibold text-muted-foreground">
          Sentiment Trend
        </p>{" "}
        <div className="flex items-center gap-1">{trendIcon}</div>{" "}
      </div>{" "}
      {/* Mini Chart - Visual Representation */}{" "}
      <div className="flex items-end justify-between gap-1 h-12 mb-2">
        {" "}
        {trend.scores.slice(-7).map((score, idx) => (
          <div
            key={idx}
            className={cn(
              "flex-1 rounded-t",
              score > 0.2
                ? "bg-emerald-500/60"
                : score < -0.2
                  ? "bg-destructive/60"
                  : "bg-muted/60",
            )}
            style={{ height: `${Math.max(20, Math.abs(score) * 100)}%` }}
          />
        ))}{" "}
      </div>{" "}
      <p className="text-xs text-muted-foreground capitalize">
        {" "}
        {trend.direction} ({(trend.magnitude * 100).toFixed(0)}%){" "}
      </p>{" "}
    </div>
  );
}
