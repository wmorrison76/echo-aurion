import React, { useState, useEffect } from "react";
import { getCultureDashboard } from "../api/apiClient";
import { sendCultureMetricSnapshot } from "../ai/echoHooks";
import { useChefNetState } from "../state/chefnetStore";

export default function CultureDashboardPanel({ stats = {}, organizationId = null }) {
  const [dashboardStats, setDashboardStats] = useState(stats);
  const [loading, setLoading] = useState(false);
  const chefNetState = useChefNetState();

  const refreshDashboard = (orgId) => {
    if (orgId) {
      setLoading(true);
      getCultureDashboard(orgId)
        .then((data) => {
          setDashboardStats(data);
          sendCultureMetricSnapshot({
            organizationId: orgId,
            ...data,
          });
        })
        .catch((error) => {
          console.error("Error loading culture dashboard:", error);
          setDashboardStats({
            totalPosts: 0,
            totalRecognitions: 0,
            activeMembers: 0,
            cultureScore: 0,
            topCategory: "Gratitude",
            recentMilestone: "Start building culture today!",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    if (organizationId) {
      refreshDashboard(organizationId);
    } else {
      setDashboardStats({
        totalPosts: 0,
        totalRecognitions: 0,
        activeMembers: 0,
        cultureScore: 0,
        topCategory: "Gratitude",
        recentMilestone: "Start building culture today!",
      });
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId && chefNetState.recognitions.length > 0) {
      refreshDashboard(organizationId);
    }
  }, [chefNetState.recognitions.length, organizationId]);

  useEffect(() => {
    const handleRecognitionCreated = () => {
      if (organizationId) {
        refreshDashboard(organizationId);
      }
    };

    window.addEventListener("recognition-created", handleRecognitionCreated);
    return () => window.removeEventListener("recognition-created", handleRecognitionCreated);
  }, [organizationId]);

  const {
    totalPosts = 0,
    totalRecognitions = 0,
    activeMembers = 0,
    cultureScore = 0,
    topCategory = "Recognition",
    recentMilestone = null,
  } = dashboardStats;

  const getCultureColor = (score) => {
    if (score >= 80) return "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300";
    if (score >= 60) return "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300";
    if (score >= 40) return "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300";
    return "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300";
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-600 dark:text-slate-400 text-center">
        Loading culture metrics...
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <section className="border border-indigo-200 dark:border-indigo-700 rounded-xl p-3 bg-indigo-50/50 dark:bg-indigo-950/30">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-800 dark:text-indigo-200 mb-2">
          Culture Health Dashboard
        </div>
        <p className="text-xs text-indigo-900/80 dark:text-indigo-100/80">
          Real-time insights into your team's culture and engagement.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Open Forum Posts" value={totalPosts} icon="💬" />
        <MetricCard label="Recognitions Given" value={totalRecognitions} icon="⭐" />
        <MetricCard label="Active Members" value={activeMembers} icon="👥" />
        <MetricCard label="Culture Score" value={`${cultureScore}%`} icon="📈" />
      </div>

      {recentMilestone && (
        <div className="border border-cyan-200 dark:border-cyan-700 rounded-lg p-3 bg-cyan-50/50 dark:bg-cyan-950/30">
          <div className="text-[11px] font-semibold text-cyan-800 dark:text-cyan-200 mb-1">
            🎉 Recent Milestone
          </div>
          <p className="text-xs text-cyan-900/80 dark:text-cyan-100/80">
            {recentMilestone}
          </p>
        </div>
      )}

      <div className={`border rounded-lg p-3 ${getCultureColor(cultureScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Overall Culture Score</span>
          <span className="text-lg font-bold">{cultureScore}%</span>
        </div>
        <div className="h-2 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-500"
            style={{ width: `${cultureScore}%` }}
          />
        </div>
      </div>

      <section className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white/50 dark:bg-slate-900/50">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300 mb-2">
          Top Contributors
        </h4>
        <p className="text-[10px] text-slate-600 dark:text-slate-400">
          {topCategory} is the most active category this week. Keep building!
        </p>
      </section>

      <section className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300 mb-2">
          Echo Integration
        </h4>
        <p className="text-[10px] text-slate-600 dark:text-slate-400">
          This data feeds into Echo's culture engine to track wellbeing, spot trends, and suggest interventions.
        </p>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white/50 dark:bg-slate-900/50 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-lg text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
