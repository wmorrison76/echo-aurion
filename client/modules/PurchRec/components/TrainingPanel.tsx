import React, { useState } from "react";
import { GraduationCap, PlayCircle, FileText, CheckCircle2, Lock, BarChart3 } from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  duration: string;
  completed: boolean;
  videos: number;
  documents: number;
}

export interface TrainingPanelProps {
  panelId?: string;
}

export function TrainingPanel({ panelId = "TRN-1" }: TrainingPanelProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const trainingModules: TrainingModule[] = [
    {
      id: "T001",
      title: "Receiving Best Practices",
      category: "receiving",
      duration: "45 min",
      completed: true,
      videos: 3,
      documents: 2,
    },
    {
      id: "T002",
      title: "Quality Assurance Standards",
      category: "quality",
      duration: "30 min",
      completed: true,
      videos: 2,
      documents: 3,
    },
    {
      id: "T003",
      title: "Supplier Management",
      category: "purchasing",
      duration: "60 min",
      completed: false,
      videos: 4,
      documents: 5,
    },
    {
      id: "T004",
      title: "Inventory Management Systems",
      category: "inventory",
      duration: "50 min",
      completed: false,
      videos: 3,
      documents: 4,
    },
    {
      id: "T005",
      title: "Cost Control & Auditing",
      category: "compliance",
      duration: "75 min",
      completed: false,
      videos: 5,
      documents: 6,
    },
    {
      id: "T006",
      title: "Food Safety Certification",
      category: "compliance",
      duration: "120 min",
      completed: false,
      videos: 6,
      documents: 8,
    },
  ];

  const categories = [
    { id: "all", label: "All Modules", count: trainingModules.length },
    {
      id: "receiving",
      label: "Receiving",
      count: trainingModules.filter((m) => m.category === "receiving").length,
    },
    {
      id: "purchasing",
      label: "Purchasing",
      count: trainingModules.filter((m) => m.category === "purchasing").length,
    },
    {
      id: "compliance",
      label: "Compliance",
      count: trainingModules.filter((m) => m.category === "compliance").length,
    },
  ];

  const filteredModules =
    activeCategory === "all"
      ? trainingModules
      : trainingModules.filter((m) => m.category === activeCategory);

  const completedCount = trainingModules.filter((m) => m.completed).length;
  const completionPercentage = Math.round((completedCount / trainingModules.length) * 100);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold">Training & Compliance</h1>
        </div>
        <p className="text-slate-400">Professional development and certification materials</p>
      </div>

      {/* Progress Card */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Your Training Progress</p>
            <p className="text-3xl font-bold">{completionPercentage}%</p>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-purple-400" />
            <div className="text-right">
              <p className="text-sm text-slate-400">Completed</p>
              <p className="text-xl font-bold">
                {completedCount}/{trainingModules.length}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-purple-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Training Modules */}
      <div className="flex-1 overflow-auto p-6 space-y-3">
        {filteredModules.map((module) => (
          <div
            key={module.id}
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              module.completed
                ? "bg-slate-700/50 border-slate-600 opacity-75"
                : "bg-slate-700 border-slate-600 hover:border-purple-500/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 pt-1">
                {module.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <PlayCircle className="h-6 w-6 text-purple-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{module.title}</h3>
                    <p className="text-sm text-slate-400">{module.duration}</p>
                  </div>
                  {module.completed && (
                    <span className="flex-shrink-0 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <PlayCircle className="h-3 w-3" />
                    <span>{module.videos} videos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{module.documents} documents</span>
                  </div>
                </div>
              </div>

              {!module.completed && (
                <button className="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors">
                  Start
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
