import React, { useState, useEffect } from "react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { SKILLS, LEARNING_PROGRAMS } from "@shared/echo/help/skill-config";
import type { LearningProgram } from "@shared/echo/help/types";
interface ProgramLaunchModalProps {
  isOpen: boolean;
  program?: LearningProgram;
  onClose: () => void;
  onStart: (program: LearningProgram) => void;
}
export default function ProgramLaunchModal({
  isOpen,
  program,
  onClose,
  onStart,
}: ProgramLaunchModalProps) {
  const [isStarting, setIsStarting] = useState(false);
  if (!isOpen || !program) return null;
  const skillDefs = program.requiredSkillIds
    .map((skillId) => SKILLS.find((s) => s.id === skillId))
    .filter(Boolean);
  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStart(program);
    } finally {
      setIsStarting(false);
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {" "}
      <div className="glass-card w-full max-w-2xl mx-4 rounded-lg border border-border/30 overflow-hidden shadow-xl">
        {" "}
        {/* Header */}{" "}
        <div className="bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border-b border-border/30 px-6 py-4">
          {" "}
          <h2 className="text-xl font-bold text-foreground">
            {program.name}
          </h2>{" "}
          <p className="text-sm text-foreground/60 mt-1">
            {program.description}
          </p>{" "}
        </div>{" "}
        {/* Content */}{" "}
        <div className="px-6 py-6 space-y-6">
          {" "}
          {/* Skills Required */}{" "}
          <div>
            {" "}
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {" "}
              Skills You'll Master{" "}
            </h3>{" "}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {" "}
              {skillDefs.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-surface border border-slate-800 rounded-lg p-3"
                >
                  {" "}
                  <h4 className="font-medium text-sky-300 text-sm">
                    {skill.name}
                  </h4>{" "}
                  <p className="text-xs text-foreground/60 mt-1">
                    {skill.description}
                  </p>{" "}
                  <div className="flex items-center justify-between mt-2">
                    {" "}
                    <span className="text-xs text-foreground/50">
                      Max XP
                    </span>{" "}
                    <span className="text-xs font-semibold text-amber-400">
                      {" "}
                      {skill.maxXp}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Program Stats */}{" "}
          <div className="grid grid-cols-3 gap-3">
            {" "}
            <div className="bg-surface border border-slate-800 rounded-lg p-3 text-center">
              {" "}
              <div className="text-2xl font-bold text-sky-300">
                {" "}
                {program.requiredSkillIds.length}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/60 mt-1">Skills</div>{" "}
            </div>{" "}
            <div className="bg-surface border border-slate-800 rounded-lg p-3 text-center">
              {" "}
              <div className="text-2xl font-bold text-amber-400">
                {" "}
                {skillDefs.reduce((sum, s) => sum + s.maxXp, 0)}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/60 mt-1">Max XP</div>{" "}
            </div>{" "}
            <div className="bg-surface border border-slate-800 rounded-lg p-3 text-center">
              {" "}
              <div className="text-2xl font-bold text-emerald-400">
                {" "}
                {program.minTotalXp}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/60 mt-1">
                Min to Complete
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Description */}{" "}
          <div>
            {" "}
            <h3 className="text-sm font-semibold text-foreground mb-2">
              What You'll Learn
            </h3>{" "}
            <p className="text-sm text-foreground/70 leading-relaxed">
              {" "}
              Complete all required skills to earn this certification. Work
              through missions to gain XP, unlock achievements, and master your
              craft.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        {/* Footer */}{" "}
        <div className="bg-surface border-t border-border/30 px-6 py-4 flex items-center justify-between">
          {" "}
          <Button variant="outline" onClick={onClose}>
            {" "}
            Cancel{" "}
          </Button>{" "}
          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="bg-sky-600 hover:bg-sky-700"
          >
            {" "}
            {isStarting ? "Starting..." : "Start Program"}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
