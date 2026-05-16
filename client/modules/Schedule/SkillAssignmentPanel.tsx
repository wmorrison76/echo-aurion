import React from "react";
import {
  Award,
  TrendingUp,
  Users,
  Star,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
interface SkillAssignment {
  staffId: string;
  station: string;
  skillLevel: 1 | 2 | 3 | 4 | 5;
  trainedDate: string;
  trainedBy: string;
  performanceScore: number;
  shiftsWorked: number;
  consistency: number;
}
interface CompetencyMetrics {
  avgSkillLevel: number;
  avgPerformance: number;
  totalStations: number;
  totalShiftsWorked: number;
}
interface OptimizedAssignment {
  staffId: string;
  name: string;
  skillLevel: number;
  performanceScore: number;
  totalScore: number;
  reason: string;
}
const SkillAssignmentPanel: React.FC = () => {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("staff-1");
  const [staffSkills, setStaffSkills] = React.useState<SkillAssignment[]>([]);
  const [metrics, setMetrics] = React.useState<CompetencyMetrics | null>(null);
  const [optimizedAssignments, setOptimizedAssignments] = React.useState<
    OptimizedAssignment[]
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedPosition, setSelectedPosition] = React.useState<string>("");
  const [availableStaff] = React.useState<string[]>([
    "staff-1",
    "staff-2",
    "staff-3",
    "staff-4",
  ]);
  React.useEffect(() => {
    fetchStaffSkills(selectedStaffId);
  }, [selectedStaffId]);
  const fetchStaffSkills = async (staffId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/skill-assignments/${staffId}`);
      if (response.ok) {
        const data = await response.json();
        setStaffSkills(data.skills);
        setMetrics(data.competencyMetrics);
      }
    } catch (error) {
      console.error("[SkillAssignment] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleOptimizeAssignment = async (position: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/skill-assignments/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position,
          date: new Date().toISOString().split("T")[0],
          mealPeriod: "lunch",
          availableStaff,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setOptimizedAssignments(data.optimization.recommendedStaff);
        setSelectedPosition(position);
      }
    } catch (error) {
      console.error("[SkillAssignment] Optimize error:", error);
    } finally {
      setLoading(false);
    }
  };
  const renderStarRating = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {" "}
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={12}
            className={
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-foreground/20"
            }
          />
        ))}{" "}
      </div>
    );
  };
  const getSkillLevelColor = (level: number) => {
    switch (level) {
      case 5:
        return "text-green-400";
      case 4:
        return "text-blue-400";
      case 3:
        return "text-yellow-400";
      case 2:
        return "text-orange-400";
      case 1:
        return "text-red-400";
      default:
        return "text-foreground/60";
    }
  };
  const getSkillLevelLabel = (level: number) => {
    const labels = [
      "Untrained",
      "Novice",
      "Intermediate",
      "Advanced",
      "Expert",
    ];
    return labels[level] || "Unknown";
  };
  return (
    <div className="w-full h-full bg-background/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg flex flex-col overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-cyan-400/5">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Award size={18} className="text-cyan-400" />{" "}
            <h2 className="font-semibold text-sm text-foreground">
              Skill Analytics
            </h2>{" "}
          </div>{" "}
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="text-xs bg-background/60 border border-cyan-400/20 rounded px-2 py-1 text-foreground"
          >
            {" "}
            <option value="staff-1">Staff 1</option>{" "}
            <option value="staff-2">Staff 2</option>{" "}
            <option value="staff-3">Staff 3</option>{" "}
            <option value="staff-4">Staff 4</option>{" "}
          </select>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-y-auto">
        {" "}
        {loading && !staffSkills.length ? (
          <div className="p-6 text-center text-foreground/60">
            {" "}
            <p className="text-sm">Loading skill data...</p>{" "}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {" "}
            {/* Competency Metrics */}{" "}
            {metrics && (
              <Card className="p-3 border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                {" "}
                <p className="text-xs font-semibold text-cyan-400 mb-3">
                  {" "}
                  COMPETENCY METRICS{" "}
                </p>{" "}
                <div className="grid grid-cols-2 gap-2">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-[10px] text-foreground/60">
                      Avg Skill
                    </p>{" "}
                    <p
                      className={cn(
                        "text-lg font-bold",
                        getSkillLevelColor(
                          Math.round(Number(metrics.avgSkillLevel)),
                        ),
                      )}
                    >
                      {" "}
                      {metrics.avgSkillLevel}/5{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-[10px] text-foreground/60">
                      Performance
                    </p>{" "}
                    <p className="text-lg font-bold text-green-400">
                      {" "}
                      {Number(metrics.avgPerformance).toFixed(1)}/5{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-[10px] text-foreground/60">
                      Stations
                    </p>{" "}
                    <p className="text-lg font-bold text-blue-400">
                      {" "}
                      {metrics.totalStations}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-[10px] text-foreground/60">
                      Shifts
                    </p>{" "}
                    <p className="text-lg font-bold text-yellow-400">
                      {" "}
                      {metrics.totalShiftsWorked}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </Card>
            )}{" "}
            {/* Skills Grid */}{" "}
            <div>
              {" "}
              <p className="text-xs font-semibold text-cyan-400 mb-2">
                {" "}
                TRAINED STATIONS ({staffSkills.length}){" "}
              </p>{" "}
              {staffSkills.length === 0 ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-400/20 rounded text-xs text-yellow-400">
                  {" "}
                  No stations trained{" "}
                </div>
              ) : (
                <div className="space-y-2">
                  {" "}
                  {staffSkills.map((skill) => (
                    <Card
                      key={`${skill.staffId}-${skill.station}`}
                      className="p-3 border-blue-400/20 hover:border-blue-400/40 transition cursor-pointer"
                      onClick={() => handleOptimizeAssignment(skill.station)}
                    >
                      {" "}
                      <div className="flex items-start justify-between mb-2">
                        {" "}
                        <div>
                          {" "}
                          <p className="text-xs font-medium text-foreground">
                            {" "}
                            {skill.station}{" "}
                          </p>{" "}
                          <p className="text-[10px] text-foreground/60 mt-1">
                            {" "}
                            Trained by: {skill.trainedBy} on{""}{" "}
                            {new Date(
                              skill.trainedDate,
                            ).toLocaleDateString()}{" "}
                          </p>{" "}
                        </div>{" "}
                        <span
                          className={cn(
                            "text-xs font-bold",
                            getSkillLevelColor(skill.skillLevel),
                          )}
                        >
                          {" "}
                          {skill.skillLevel}⭐{" "}
                        </span>{" "}
                      </div>{" "}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {" "}
                        <div className="flex items-center gap-1">
                          {" "}
                          <TrendingUp
                            size={10}
                            className="text-green-400"
                          />{" "}
                          <span className="text-green-400">
                            {skill.performanceScore.toFixed(1)}/5
                          </span>{" "}
                        </div>{" "}
                        <div className="flex items-center gap-1">
                          {" "}
                          <Users size={10} className="text-blue-400" />{" "}
                          <span className="text-blue-400">
                            {skill.shiftsWorked} shifts
                          </span>{" "}
                        </div>{" "}
                      </div>{" "}
                      {/* Consistency indicator */}{" "}
                      <div className="mt-2 bg-background/30 rounded p-1">
                        {" "}
                        <div className="flex items-center justify-between text-[10px]">
                          {" "}
                          <span className="text-foreground/60">
                            Consistency
                          </span>{" "}
                          <span className="text-cyan-400 font-medium">
                            {" "}
                            {(skill.consistency * 100).toFixed(0)}%{" "}
                          </span>{" "}
                        </div>{" "}
                        <div className="w-full bg-background/40 rounded h-1 mt-1 overflow-hidden">
                          {" "}
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            style={{ width: `${skill.consistency * 100}%` }}
                          />{" "}
                        </div>{" "}
                      </div>{" "}
                    </Card>
                  ))}{" "}
                </div>
              )}{" "}
            </div>{" "}
            {/* Optimized Assignments */}{" "}
            {optimizedAssignments.length > 0 && (
              <div>
                {" "}
                <p className="text-xs font-semibold text-green-400 mb-2">
                  {" "}
                  OPTIMAL ASSIGNMENT FOR {selectedPosition}{" "}
                </p>{" "}
                <div className="space-y-2">
                  {" "}
                  {optimizedAssignments.map((assignment, idx) => (
                    <Card
                      key={idx}
                      className="p-3 border-green-400/20 bg-green-500/10"
                    >
                      {" "}
                      <div className="flex items-start justify-between mb-2">
                        {" "}
                        <div>
                          {" "}
                          <div className="flex items-center gap-2">
                            {" "}
                            <CheckCircle
                              size={14}
                              className="text-green-400"
                            />{" "}
                            <p className="text-xs font-medium text-foreground">
                              {" "}
                              {assignment.name}{" "}
                            </p>{" "}
                          </div>{" "}
                          <p className="text-[10px] text-foreground/60 mt-1">
                            {" "}
                            {assignment.reason}{" "}
                          </p>{" "}
                        </div>{" "}
                        <span className="text-xs font-bold text-green-400">
                          {" "}
                          {assignment.totalScore.toFixed(0)}/100{" "}
                        </span>{" "}
                      </div>{" "}
                    </Card>
                  ))}{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Footer */}{" "}
      <div className="p-3 border-t border-cyan-400/10 bg-background/20">
        {" "}
        <button
          onClick={() => fetchStaffSkills(selectedStaffId)}
          className="w-full text-xs text-cyan-400 hover:text-cyan-300 py-2 transition"
        >
          {" "}
          Refresh Skills{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
export default SkillAssignmentPanel;
