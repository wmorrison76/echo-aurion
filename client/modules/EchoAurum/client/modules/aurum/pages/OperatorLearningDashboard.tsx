import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
export interface LearningStatistics {
  recent_overrides: number;
  total_overrides: number;
  user_created_rules: number;
  ai_rules_active: number;
  ai_rules_pending: number;
}
export interface DetectedPattern {
  pattern_type: string;
  feature: string;
  override_reason: string;
  occurrence_count: number;
  consistency_pct: number;
  examples: string[];
}
export function OperatorLearningDashboard() {
  const [stats, setStats] = useState<LearningStatistics | null>(null);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadLearningData();
  }, []);
  const loadLearningData = async () => {
    setLoading(true);
    try {
      const [statsRes, patternsRes] = await Promise.all([
        fetch("/api/aurum/learning/statistics"),
        fetch("/api/aurum/learning/patterns"),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (patternsRes.ok) {
        const patternsData = await patternsRes.json();
        setPatterns(patternsData);
      }
    } catch (error) {
      console.error("Error loading learning data:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading learning dashboard...
      </div>
    );
  }
  return (
    <div className="learning-dashboard p-6">
      {" "}
      <div className="mb-8">
        {" "}
        <h1 className="text-3xl font-bold mb-2">
          Echo AI³ Learning Dashboard
        </h1>{" "}
        <p className="text-muted-foreground">
          Watch how Echo AI³ learns from your decisions and creates automated
          rules.
        </p>{" "}
      </div>{" "}
      {/* Learning Statistics Cards */}{" "}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {" "}
        <Card className="p-4">
          {" "}
          <p className="text-xs text-muted-foreground font-semibold mb-2">
            RECENT OVERRIDES
          </p>{" "}
          <p className="text-3xl font-bold">{stats?.recent_overrides || 0}</p>{" "}
          <p className="text-xs text-muted-foreground mt-2">
            Last 30 days
          </p>{" "}
        </Card>{" "}
        <Card className="p-4">
          {" "}
          <p className="text-xs text-muted-foreground font-semibold mb-2">
            YOUR RULES
          </p>{" "}
          <p className="text-3xl font-bold">{stats?.user_created_rules || 0}</p>{" "}
          <p className="text-xs text-muted-foreground mt-2">
            Manually created
          </p>{" "}
        </Card>{" "}
        <Card className="p-4">
          {" "}
          <p className="text-xs text-muted-foreground font-semibold mb-2">
            AI RULES ACTIVE
          </p>{" "}
          <p className="text-3xl font-bold text-purple-600">
            {stats?.ai_rules_active || 0}
          </p>{" "}
          <p className="text-xs text-muted-foreground mt-2">
            Learning active
          </p>{" "}
        </Card>{" "}
        <Card className="p-4">
          {" "}
          <p className="text-xs text-muted-foreground font-semibold mb-2">
            AI PENDING
          </p>{" "}
          <p className="text-3xl font-bold text-orange-600">
            {stats?.ai_rules_pending || 0}
          </p>{" "}
          <p className="text-xs text-muted-foreground mt-2">
            Awaiting review
          </p>{" "}
        </Card>{" "}
        <Card className="p-4">
          {" "}
          <p className="text-xs text-muted-foreground font-semibold mb-2">
            TIME SAVED
          </p>{" "}
          <p className="text-3xl font-bold text-green-600">
            ~{Math.round((stats?.ai_rules_active || 0) * 2)}h
          </p>{" "}
          <p className="text-xs text-muted-foreground mt-2">
            Est. per month
          </p>{" "}
        </Card>{" "}
      </div>{" "}
      <Tabs defaultValue="patterns" className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {" "}
          <TabsTrigger value="patterns">Detected Patterns</TabsTrigger>{" "}
          <TabsTrigger value="learning">Learning Activity</TabsTrigger>{" "}
          <TabsTrigger value="insights">Insights</TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="patterns" className="space-y-4">
          {" "}
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            {" "}
            <p className="text-sm text-blue-900">
              {" "}
              💡 <strong>Detected Patterns:</strong> Echo AI³ analyzes your
              override history to identify consistent patterns. When a pattern
              is detected 3+ times with 70%+ consistency, a rule is
              suggested.{" "}
            </p>{" "}
          </div>{" "}
          {patterns.length === 0 ? (
            <Card className="p-8 text-center">
              {" "}
              <p className="text-muted-foreground">
                No patterns detected yet.
              </p>{" "}
              <p className="text-sm text-muted-foreground mt-2">
                Continue using the system to help Echo AI³ learn your
                preferences.
              </p>{" "}
            </Card>
          ) : (
            <div className="space-y-4">
              {" "}
              {patterns.map((pattern, idx) => (
                <Card key={idx} className="p-5">
                  {" "}
                  <div className="flex justify-between items-start mb-3">
                    {" "}
                    <div>
                      {" "}
                      <h3 className="font-semibold">
                        {pattern.override_reason}
                      </h3>{" "}
                      <p className="text-sm text-muted-foreground mt-1">
                        {" "}
                        Feature:{" "}
                        <Badge variant="outline">{pattern.feature}</Badge>{" "}
                      </p>{" "}
                    </div>{" "}
                    <Badge
                      className={`text-lg font-bold ${pattern.consistency_pct >= 80 ? "bg-green-100 text-green-800" : pattern.consistency_pct >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-surface text-gray-800"}`}
                    >
                      {" "}
                      {pattern.consistency_pct}%{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground font-semibold">
                        OCCURRENCES
                      </p>{" "}
                      <p className="text-lg font-bold">
                        {pattern.occurrence_count}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-xs text-muted-foreground font-semibold">
                        CONSISTENCY
                      </p>{" "}
                      <p className="text-lg font-bold">
                        {pattern.consistency_pct}%
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="bg-surface rounded p-3 mb-3">
                    {" "}
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      EXAMPLES:
                    </p>{" "}
                    <ul className="text-xs space-y-1">
                      {" "}
                      {pattern.examples.map((example, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {example}
                        </li>
                      ))}{" "}
                    </ul>{" "}
                  </div>{" "}
                  {pattern.consistency_pct >= 70 && (
                    <div className="text-sm text-purple-600 font-semibold">
                      {" "}
                      ✅ Rule suggestion pending review in AI Suggestions
                      tab{" "}
                    </div>
                  )}{" "}
                </Card>
              ))}{" "}
            </div>
          )}{" "}
        </TabsContent>{" "}
        <TabsContent value="learning" className="space-y-4">
          {" "}
          <Card className="p-6">
            {" "}
            <h3 className="font-semibold mb-4">Your Learning Activity</h3>{" "}
            <div className="space-y-6">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-semibold text-foreground mb-3">
                  Override Pattern Distribution
                </p>{" "}
                <ResponsiveContainer width="100%" height={300}>
                  {" "}
                  <BarChart
                    data={patterns.map((p) => ({
                      name: p.override_reason.substring(0, 15),
                      occurrences: p.occurrence_count,
                    }))}
                  >
                    {" "}
                    <CartesianGrid strokeDasharray="3 3" />{" "}
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />{" "}
                    <YAxis /> <Tooltip />{" "}
                    <Bar dataKey="occurrences" fill="#8884d8" />{" "}
                  </BarChart>{" "}
                </ResponsiveContainer>{" "}
              </div>{" "}
              <div className="border-t pt-4">
                {" "}
                <p className="text-sm font-semibold text-foreground mb-3">
                  Pattern Consistency Trend
                </p>{" "}
                <ResponsiveContainer width="100%" height={300}>
                  {" "}
                  <LineChart
                    data={patterns.map((p, i) => ({
                      name: i + 1,
                      consistency: p.consistency_pct,
                    }))}
                  >
                    {" "}
                    <CartesianGrid strokeDasharray="3 3" />{" "}
                    <XAxis dataKey="name" /> <YAxis domain={[0, 100]} />{" "}
                    <Tooltip /> <Legend />{" "}
                    <Line
                      type="monotone"
                      dataKey="consistency"
                      stroke="#10b981"
                      dot={{ fill: "#10b981", r: 4 }}
                    />{" "}
                  </LineChart>{" "}
                </ResponsiveContainer>{" "}
              </div>{" "}
            </div>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="insights" className="space-y-4">
          {" "}
          <Card className="p-6">
            {" "}
            <h3 className="font-semibold mb-4">Learning Insights</h3>{" "}
            <div className="space-y-4">
              {" "}
              <div className="bg-green-50 border border-green-200 rounded p-4">
                {" "}
                <p className="font-semibold text-green-900">
                  ✅ Strong Learning Signal
                </p>{" "}
                <p className="text-sm text-green-800 mt-1">
                  {" "}
                  You have{" "}
                  {patterns.filter((p) => p.consistency_pct >= 80).length}{" "}
                  patterns with 80%+ consistency. These are excellent candidates
                  for automation rules.{" "}
                </p>{" "}
              </div>{" "}
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                {" "}
                <p className="font-semibold text-blue-900">
                  💡 Recommended Actions
                </p>{" "}
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  {" "}
                  <li>
                    • Accept pending AI-suggested rules to activate automation
                  </li>{" "}
                  <li>
                    • Review override patterns to understand your
                    decision-making
                  </li>{" "}
                  <li>• Create custom rules for unique business processes</li>{" "}
                  <li>
                    • Monitor rule success rates and adjust as needed
                  </li>{" "}
                </ul>{" "}
              </div>{" "}
              <div className="bg-purple-50 border border-purple-200 rounded p-4">
                {" "}
                <p className="font-semibold text-purple-900">
                  🚀 Next Steps
                </p>{" "}
                <p className="text-sm text-purple-800 mt-1">
                  {" "}
                  Go to the"AI Suggestions" tab in Rule Management to review and
                  accept the pending rules. Each accepted rule will save you
                  time on repetitive decisions.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
export default OperatorLearningDashboard;
