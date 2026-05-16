import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  Award,
  Loader,
  CheckCircle,
  BookOpen,
} from "lucide-react";
interface JobSharingAnalysis {
  sharedJobs: Array<{
    jobId: string;
    title: string;
    department: string;
    schedule: { daysPerWeek: number; hoursPerWeek: number; shifts: string[] };
    employees: Array<{
      employeeId: string;
      name: string;
      allocation: number;
      skills: Array<{
        skillId: string;
        name: string;
        level: "beginner" | "intermediate" | "expert";
        certifications: string[];
        yearsExperience: number;
        lastUsed: string;
      }>;
      availability: string[];
    }>;
    requiredSkills: Array<{
      skillId: string;
      name: string;
      level: "beginner" | "intermediate" | "expert";
      certifications: string[];
      yearsExperience: number;
      lastUsed: string;
    }>;
    coverage: number;
    efficiency: number;
  }>;
  totalJobs: number;
  optimalMatches: Array<{
    jobId: string;
    recommendedEmployee: string;
    matchScore: number;
    reason: string;
  }>;
  crossTrainingOpportunities: Array<{
    employee: string;
    skill: string;
    benefit: string;
  }>;
  insights: string[];
  recommendations: string[];
}
export const JobSharing: React.FC = () => {
  // Use the new Job Share Platform as default return ( <Suspense fallback={ <div className="flex items-center justify-center w-full h-full"> <div className="text-center"> <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" /> <p className="text-foreground/60">Loading Job Share Platform...</p> </div> </div> } > <JobSharePlatform /> </Suspense> );
}; // Legacy analytics component (kept for backward compatibility)
export const JobSharingAnalytics: React.FC = () => {
  const [analysis, setAnalysis] = useState<JobSharingAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateAnalytics = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/job-sharing/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: "dept-culinary",
          optimizationStrategy: "coverage",
        }),
      });
      if (response.ok) {
        setAnalysis(await response.json());
      }
    } catch (error) {
      console.error("Job sharing analytics error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "expert":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "intermediate":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "beginner":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      default:
        return "bg-slate-100 dark:bg-slate-700 text-slate-800";
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      <div className="mb-6">
        {" "}
        <div className="flex items-center gap-3 mb-2">
          {" "}
          <Users className="w-8 h-8 text-primary dark:text-blue-400" />{" "}
          <h1 className="text-3xl font-bold text-foreground dark:text-white">
            {" "}
            Job Sharing & Skills{" "}
          </h1>{" "}
        </div>{" "}
        <p className="text-muted-foreground">
          {" "}
          Advanced job sharing model with skill-based assignments{" "}
        </p>{" "}
      </div>{" "}
      {!analysis ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <Users className="w-16 h-16 text-primary dark:text-blue-400 mx-auto mb-4 opacity-50" />{" "}
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-6">
            {" "}
            Analyze Job Sharing Opportunities{" "}
          </h2>{" "}
          <Button
            onClick={handleGenerateAnalytics}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-primary hover:opacity-90"
          >
            {" "}
            {isGenerating ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" /> Analyzing...{" "}
              </>
            ) : (
              <>
                {" "}
                <Users className="w-4 h-4" /> Analyze Job Sharing{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <>
          {" "}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Shared Jobs{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analysis.totalJobs}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Optimal Matches{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {" "}
                {analysis.optimalMatches.length}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Training Opportunities{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-primary dark:text-blue-400">
                {" "}
                {analysis.crossTrainingOpportunities.length}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                Avg Coverage{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {Math.round(
                  analysis.sharedJobs.reduce((sum, j) => sum + j.coverage, 0) /
                    analysis.totalJobs,
                )}{" "}
                %{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 flex-1 overflow-y-auto">
            {" "}
            {analysis.sharedJobs.map((job) => (
              <div
                key={job.jobId}
                className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border"
              >
                {" "}
                <div className="flex justify-between items-start mb-3">
                  {" "}
                  <div>
                    {" "}
                    <h3 className="font-semibold text-foreground dark:text-white">
                      {" "}
                      {job.title}{" "}
                    </h3>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      {job.department}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Coverage{" "}
                    </p>{" "}
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {" "}
                      {job.coverage}%{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="mb-3 pb-3 border-b border-slate-200 dark:border-border">
                  {" "}
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {" "}
                    Sharing: {job.employees.length} Employees{" "}
                  </p>{" "}
                  <div className="space-y-2">
                    {" "}
                    {job.employees.map((emp) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-start gap-2"
                      >
                        {" "}
                        <div className="flex-1">
                          {" "}
                          <p className="text-sm font-medium text-foreground dark:text-white">
                            {" "}
                            {emp.name}{" "}
                          </p>{" "}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {" "}
                            {emp.skills.map((skill) => (
                              <span
                                key={skill.skillId}
                                className={`text-xs px-2 py-0.5 rounded ${getSkillLevelColor(skill.level)}`}
                              >
                                {" "}
                                {skill.level}{" "}
                              </span>
                            ))}{" "}
                          </div>{" "}
                        </div>{" "}
                        <span className="text-xs font-bold text-foreground dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                          {" "}
                          {emp.allocation}%{" "}
                        </span>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="text-xs text-muted-foreground">
                  {" "}
                  <p>
                    {" "}
                    📅 {job.schedule.daysPerWeek} days/week •{""}{" "}
                    {job.schedule.hoursPerWeek} hrs/week{" "}
                  </p>{" "}
                  <p>⚡ Efficiency: {job.efficiency}%</p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          {analysis.optimalMatches.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 mb-4 border border-green-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                {" "}
                <CheckCircle className="w-4 h-4" /> Optimal Matches{" "}
              </h3>{" "}
              <div className="space-y-2">
                {" "}
                {analysis.optimalMatches.map((match, i) => (
                  <div
                    key={i}
                    className="text-sm text-green-800 dark:text-green-300"
                  >
                    {" "}
                    <p className="font-medium">
                      {" "}
                      {match.recommendedEmployee} - Match Score:{""}{" "}
                      {match.matchScore}%{" "}
                    </p>{" "}
                    <p className="text-xs opacity-90">{match.reason}</p>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
          {analysis.crossTrainingOpportunities.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 mb-4 border border-blue-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                {" "}
                <BookOpen className="w-4 h-4" /> Cross-Training
                Opportunities{" "}
              </h3>{" "}
              <div className="space-y-2">
                {" "}
                {analysis.crossTrainingOpportunities.map((opp, i) => (
                  <div
                    key={i}
                    className="text-sm text-blue-800 dark:text-primary"
                  >
                    {" "}
                    <p className="font-medium">{opp.employee}</p>{" "}
                    <p className="text-xs">
                      {" "}
                      Skill:{" "}
                      <span className="font-semibold">{opp.skill}</span>{" "}
                    </p>{" "}
                    <p className="text-xs opacity-90">✓ {opp.benefit}</p>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
          <div className="grid grid-cols-1 gap-4 mb-4">
            {" "}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-purple-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
                {" "}
                Insights{" "}
              </h3>{" "}
              <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-300">
                {" "}
                {analysis.insights.map((insight, i) => (
                  <li key={i}>• {insight}</li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
          </div>{" "}
          <Button
            onClick={() => setAnalysis(null)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {" "}
            Generate New Analysis{" "}
          </Button>{" "}
        </>
      )}{" "}
    </div>
  );
};
export default JobSharing;
