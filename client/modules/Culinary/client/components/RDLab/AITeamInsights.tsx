"use client";

import React, { useState } from "react";
import { Users, Zap, Award, TrendingUp, MessageSquare } from "lucide-react";

interface TeamMember {
  name: string;
  expertise: string[];
  experimentsOwned: number;
  successRate: number;
  lastActive: string;
}

interface ExpertiseArea {
  domain: string;
  memberCount: number;
  successRate: number;
  trend: "up" | "down" | "stable";
}

export function AITeamInsights() {
  // Mock team data - in production would come from API
  const teamMembers: TeamMember[] = [
    {
      name: "Chef Alex",
      expertise: ["Molecular Gastronomy", "Emulsions", "Flavor Science"],
      experimentsOwned: 12,
      successRate: 83,
      lastActive: "2h ago",
    },
    {
      name: "Pastry Chef Maria",
      expertise: ["Pastry Techniques", "Fermentation", "Texture"],
      experimentsOwned: 8,
      successRate: 87,
      lastActive: "30m ago",
    },
    {
      name: "Sous Chef James",
      expertise: ["Scaling", "Cost Optimization", "Technique"],
      experimentsOwned: 6,
      successRate: 79,
      lastActive: "Today",
    },
  ];

  const expertiseAreas: ExpertiseArea[] = [
    {
      domain: "Molecular Gastronomy",
      memberCount: 2,
      successRate: 85,
      trend: "up",
    },
    { domain: "Fermentation", memberCount: 3, successRate: 81, trend: "up" },
    {
      domain: "Texture Engineering",
      memberCount: 2,
      successRate: 78,
      trend: "stable",
    },
    { domain: "Flavor Science", memberCount: 2, successRate: 82, trend: "up" },
  ];

  const collaborationOpportunities = [
    {
      title: "Koji + Molecular Emulsion",
      members: ["Chef Alex", "Pastry Chef Maria"],
      potentialImpact: "High",
      confidence: 92,
    },
    {
      title: "Scaling Molecular Foam",
      members: ["Chef Alex", "Sous Chef James"],
      potentialImpact: "Very High",
      confidence: 88,
    },
    {
      title: "Advanced Fermentation Techniques",
      members: ["Pastry Chef Maria", "Sous Chef James"],
      potentialImpact: "Medium",
      confidence: 76,
    },
  ];

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-rose-500/10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <Users className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Team Insights & Collaboration
            </h2>
            <p className="text-xs text-slate-400">
              Expertise map and collaboration opportunities
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-rose-300">Team Members</h3>
        <div className="space-y-2">
          {teamMembers.map((member, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-white">{member.name}</p>
                  <p className="text-xs text-slate-400">
                    Active {member.lastActive}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-300">
                      {member.successRate}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {member.experimentsOwned} experiments
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {member.expertise.map((exp, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-slate-700/40 text-slate-300"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expertise Areas */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[#c8a97e]">
          Expertise Domains
        </h3>
        <div className="space-y-2">
          {expertiseAreas.map((area, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-white text-sm">{area.domain}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#c8a97e]">
                    {area.successRate}%
                  </span>
                  {area.trend === "up" && (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  )}
                  {area.trend === "stable" && (
                    <Zap className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                {area.memberCount} team member
                {area.memberCount !== 1 ? "s" : ""} specialized
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Collaboration Opportunities */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-green-300">
          Collaboration Opportunities
        </h3>
        <div className="space-y-2">
          {collaborationOpportunities.map((collab, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                collab.confidence >= 88
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-blue-500/10 border-blue-500/20"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-white text-sm">{collab.title}</p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    collab.potentialImpact === "Very High"
                      ? "bg-red-500/30 text-red-300"
                      : collab.potentialImpact === "High"
                        ? "bg-orange-500/30 text-orange-300"
                        : "bg-blue-500/30 text-blue-300"
                  }`}
                >
                  {collab.potentialImpact} Impact
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  <strong>Team:</strong> {collab.members.join(", ")}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        collab.confidence >= 88
                          ? "bg-green-400"
                          : collab.confidence >= 80
                            ? "bg-blue-400"
                            : "bg-yellow-400"
                      }`}
                      style={{ width: `${collab.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {collab.confidence}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge Gaps */}
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <h4 className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Knowledge Gaps
        </h4>
        <ul className="space-y-1 text-sm text-slate-300">
          <li>• No team expertise in sous-vide precision at scale</li>
          <li>• Limited experience with 3D food printing techniques</li>
          <li>• No training in advanced plating automation</li>
        </ul>
      </div>
    </div>
  );
}
