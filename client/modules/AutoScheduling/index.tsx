import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Loader, Users } from "lucide-react";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface Schedule {
  date: string;
  shifts: {
    time: string;
    position: string;
    assignedStaff: string;
    skills: string[];
  }[];
}
export const AutoScheduling: React.FC = () => {
  const { t } = useI18n();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const generateSchedule = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/scheduling/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks: 4 }),
      });
      if (response.ok) {
        setSchedules(await response.json());
      }
    } catch (error) {
      console.error("Scheduling error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      <div className="flex items-center justify-between mb-2">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400" />{" "}
          <div>
            {" "}
            <h1 className="text-3xl font-bold text-foreground dark:text-white">
              {" "}
              {t("module.auto-scheduling.title")}{" "}
            </h1>{" "}
            <p className="text-muted-foreground mt-1">
              {" "}
              {t("module.auto-scheduling.description")}{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <ModuleChatButton
          moduleId="auto-scheduling"
          moduleName={t("module.auto-scheduling.title")}
        />{" "}
      </div>{" "}
      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <Calendar className="w-16 h-16 text-purple-600 dark:text-purple-400 opacity-50 mx-auto mb-4" />{" "}
          <Button
            onClick={generateSchedule}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {" "}
            {isGenerating ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" /> Generating...{" "}
              </>
            ) : (
              t("module.auto-scheduling.generateButton")
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {" "}
          {schedules.map((schedule, idx) => (
            <div
              key={idx}
              className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border p-4"
            >
              {" "}
              <h3 className="font-semibold text-foreground dark:text-white mb-3">
                {" "}
                {schedule.date}{" "}
              </h3>{" "}
              <div className="space-y-2 text-sm">
                {" "}
                {schedule.shifts.map((shift, i) => (
                  <div
                    key={i}
                    className="flex justify-between p-2 bg-slate-50 dark:bg-surface rounded"
                  >
                    {" "}
                    <div>
                      {" "}
                      <p className="font-medium">{shift.time}</p>{" "}
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        {shift.assignedStaff} - {shift.position}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          ))}{" "}
          <Button onClick={() => setSchedules([])} variant="outline" size="sm">
            {" "}
            {t("module.auto-scheduling.generateNew")}{" "}
          </Button>{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default AutoScheduling;
