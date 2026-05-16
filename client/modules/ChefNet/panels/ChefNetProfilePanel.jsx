import React, { useState, useEffect } from "react";
import badges from "../../../../shared/chefnet_badges.json";
import { getUserProfile } from "../api/apiClient";

export default function ChefNetProfilePanel({ user = {} }) {
  const [profileData, setProfileData] = useState(user);
  const [loading, setLoading] = useState(!user?.name && !user?.id);

  const refreshProfile = () => {
    if (user?.id) {
      setLoading(true);
      getUserProfile(user.id)
        .then((data) => {
          setProfileData({ ...user, ...data });
        })
        .catch((error) => {
          console.error("Error loading user profile:", error);
          setProfileData(user);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [user?.id]);

  useEffect(() => {
    const handleRecognitionCreated = () => {
      refreshProfile();
    };

    window.addEventListener("recognition-created", handleRecognitionCreated);
    return () => window.removeEventListener("recognition-created", handleRecognitionCreated);
  }, [user?.id]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-600 dark:text-slate-400 text-center">
        Loading your badges...
      </div>
    );
  }

  if (!profileData?.name && !profileData?.id) {
    return (
      <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
        No profile loaded. Your badges will appear here.
      </div>
    );
  }

  const getLevel = (points) => {
    if (points >= 60) return { label: "Beacon", color: "text-amber-600 dark:text-amber-400" };
    if (points >= 15) return { label: "Glow", color: "text-blue-600 dark:text-blue-400" };
    if (points >= 3) return { label: "Spark", color: "text-emerald-600 dark:text-emerald-400" };
    return { label: "None", color: "text-slate-400" };
  };

  return (
    <div className="space-y-4 text-xs">
      <section className="border border-blue-200 dark:border-blue-700 rounded-xl p-3 bg-blue-50/50 dark:bg-blue-950/30">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-800 dark:text-blue-200 mb-2">
          Your Impact & Badges
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          {profileData.name || "Anonymous Chef"}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Earn badges by contributing to ChefNet and living our cultural values.
        </p>
      </section>

      <div className="space-y-2">
        {badges.categories.map((category) => {
          const points = profileData.scores?.[category.id] || 0;
          const level = getLevel(points);

          return (
            <div
              key={category.id}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white/50 dark:bg-slate-900/50"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {category.label}
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {category.description}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${level.color}`}>
                  {level.label}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-600 dark:text-slate-400">Progress</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {points} / 60 points
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${Math.min((points / 60) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300 mb-2">
          How to Earn
        </h4>
        <ul className="space-y-1 text-[10px] text-slate-600 dark:text-slate-400">
          <li>✓ Send recognition to teammates</li>
          <li>✓ Share helpful posts in the feed</li>
          <li>✓ Mentor others and share knowledge</li>
          <li>✓ Support wellbeing in your team</li>
          <li>✓ Celebrate wins and culture moments</li>
        </ul>
      </section>
    </div>
  );
}
