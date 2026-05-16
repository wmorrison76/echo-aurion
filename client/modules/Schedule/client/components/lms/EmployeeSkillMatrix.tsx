/** * Employee Skill Matrix Component * Displays and manages employee skills and certifications */ import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
interface Skill {
  id: string;
  employee_id: string;
  skill_name: string;
  level: number;
  target_level: number;
  expires_at: string | null;
  certified_at: string | null;
}
interface EmployeeSkillMatrixProps {
  emp_id: string;
  showActions?: boolean;
  onSkillUpdate?: (skill: Skill) => void;
}
export const EmployeeSkillMatrix: React.FC<EmployeeSkillMatrixProps> = ({
  emp_id,
  showActions = true,
  onSkillUpdate,
}) => {
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetchSkills();
  }, [emp_id]);
  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lms/${emp_id}`);
      if (!res.ok) throw new Error("Failed to fetch skills");
      const data = await res.json();
      setSkills(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const isExpiringSoon = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    const days =
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  };
  const isExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };
  const getSkillColor = (level: number, targetLevel: number): string => {
    if (level >= targetLevel) return "text-green-400";
    if (level >= targetLevel - 1) return "text-yellow-400";
    return "text-red-400";
  };
  if (loading) {
    return (
      <Card className="shadow-lg">
        {" "}
        <CardContent className="p-4">
          {" "}
          <div className="text-center text-muted-foreground">
            Loading skills...
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <Card className="shadow-xl bg-surface text-white border-cyan-500/20">
      {" "}
      <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800">
        {" "}
        <h3 className="text-lg font-semibold text-cyan-300">
          {" "}
          Skills & Certifications{" "}
        </h3>{" "}
      </CardHeader>{" "}
      <CardContent className="pt-4">
        {" "}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm mb-4">
            {" "}
            <AlertCircle className="h-4 w-4" /> {error}{" "}
          </div>
        )}{" "}
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {" "}
            No skills recorded yet{" "}
          </div>
        ) : (
          <div className="space-y-2">
            {" "}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 border-b border-border pb-2">
              {" "}
              <div className="col-span-4">Skill</div>{" "}
              <div className="col-span-2">Level</div>{" "}
              <div className="col-span-2">Target</div>{" "}
              <div className="col-span-2">Expires</div>{" "}
              <div className="col-span-2">Status</div>{" "}
            </div>{" "}
            {skills.map((skill) => {
              const expired = isExpired(skill.expires_at);
              const expiring = isExpiringSoon(skill.expires_at);
              const gap = (skill.target_level || 0) - (skill.level || 0);
              return (
                <div
                  key={skill.id}
                  className={`grid grid-cols-12 gap-2 p-3 rounded border transition-all ${expired ? "bg-red-900/30 border-red-500/30" : expiring ? "bg-yellow-900/30 border-yellow-500/30" : "bg-slate-800/50 border-border"}`}
                >
                  {" "}
                  <div className="col-span-4 font-medium text-sm">
                    {" "}
                    {skill.skill_name}{" "}
                  </div>{" "}
                  <div
                    className={`col-span-2 text-center font-semibold ${getSkillColor(skill.level, skill.target_level || skill.level)}`}
                  >
                    {" "}
                    {skill.level}/5{" "}
                  </div>{" "}
                  <div className="col-span-2 text-center text-gray-400">
                    {" "}
                    {skill.target_level || "—"}{" "}
                  </div>{" "}
                  <div className="col-span-2 text-center text-xs">
                    {" "}
                    {skill.expires_at
                      ? new Date(skill.expires_at).toLocaleDateString()
                      : "No expiry"}{" "}
                  </div>{" "}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {" "}
                    {expired ? (
                      <div className="flex items-center gap-1 text-red-400">
                        {" "}
                        <AlertCircle className="h-3 w-3" />{" "}
                        <span className="text-xs">Expired</span>{" "}
                      </div>
                    ) : expiring ? (
                      <div className="flex items-center gap-1 text-yellow-400">
                        {" "}
                        <Clock className="h-3 w-3" />{" "}
                        <span className="text-xs">Expiring</span>{" "}
                      </div>
                    ) : gap > 0 ? (
                      <div className="flex items-center gap-1 text-blue-400">
                        {" "}
                        <AlertCircle className="h-3 w-3" />{" "}
                        <span className="text-xs">{gap} gaps</span>{" "}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-400">
                        {" "}
                        <CheckCircle2 className="h-3 w-3" />{" "}
                        <span className="text-xs">Complete</span>{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>
        )}{" "}
        {showActions && (
          <div className="border-t border-border mt-4 pt-4">
            {" "}
            <Button
              onClick={fetchSkills}
              variant="outline"
              className="w-full text-xs"
            >
              {" "}
              Refresh Skills{" "}
            </Button>{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
};
export default EmployeeSkillMatrix;
