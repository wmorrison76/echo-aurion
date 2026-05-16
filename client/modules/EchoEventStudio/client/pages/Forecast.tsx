import React, { useCallback, useEffect, useMemo, useState } from "react";
import { get, put } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Target } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type ForecastMonth = {
  month: string; // YYYY-MM-01
  pipeline: number;
  weighted: number;
  goal: number;
  gap: number;
  byStage: Record<string, number>;
};

type ForecastResponse = {
  success: boolean;
  data: {
    start: string;
    months: ForecastMonth[];
  };
};

export default function ForecastPage() {
  const { toast } = useToast();
  const [months, setMonths] = useState<ForecastMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingMonth, setSavingMonth] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await get<ForecastResponse>("/api/crm/forecast?months=18");
      setMonths(Array.isArray(res?.data?.months) ? res.data.months : []);
    } catch (err) {
      toast({
        title: "Forecast error",
        description:
          err instanceof Error ? err.message : "Failed to load forecast",
        variant: "destructive",
      });
      setMonths([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const chartData = useMemo(
    () =>
      months.map((m) => ({
        month: m.month.slice(0, 7),
        pipeline: Math.round(m.pipeline),
        weighted: Math.round(m.weighted),
        goal: Math.round(m.goal || 0),
        gap: Math.round(m.gap || 0),
      })),
    [months],
  );

  const saveGoal = async (month: string, goalRevenue: number) => {
    try {
      setSavingMonth(month);
      await put("/api/crm/goals", { month, goalRevenue });
      await fetchForecast();
      toast({ title: "Goal saved" });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Failed to save goal",
        variant: "destructive",
      });
    } finally {
      setSavingMonth(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">18‑Month Forecast</h1>
            <p className="text-muted-foreground">
              Pipeline forecast computed from Prospects (event date + estimated
              revenue) with stage weighting.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchForecast}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forecast vs Goals</CardTitle>
            <CardDescription>
              Set monthly revenue goals to surface gaps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="pipeline"
                      stroke="#3b82f6"
                      name="Pipeline"
                    />
                    <Line
                      type="monotone"
                      dataKey="weighted"
                      stroke="#10b981"
                      name="Weighted"
                    />
                    <Line
                      type="monotone"
                      dataKey="goal"
                      stroke="#f59e0b"
                      name="Goal"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Monthly Detail
            </CardTitle>
            <CardDescription>
              Goals are stored in `crm_monthly_revenue_goals`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? null : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Pipeline</TableHead>
                      <TableHead className="text-right">Weighted</TableHead>
                      <TableHead className="text-right">Goal</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead className="text-right">Set goal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((m) => (
                      <GoalRow
                        key={m.month}
                        month={m}
                        onSave={saveGoal}
                        saving={savingMonth === m.month}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoalRow({
  month,
  onSave,
  saving,
}: {
  month: ForecastMonth;
  onSave: (month: string, goalRevenue: number) => Promise<void>;
  saving: boolean;
}) {
  const [value, setValue] = useState<string>(
    String(Math.round(month.goal || 0)),
  );

  useEffect(() => {
    setValue(String(Math.round(month.goal || 0)));
  }, [month.goal]);

  return (
    <TableRow>
      <TableCell className="font-medium">{month.month.slice(0, 7)}</TableCell>
      <TableCell className="text-right">
        ${Math.round(month.pipeline).toLocaleString()}
      </TableCell>
      <TableCell className="text-right">
        ${Math.round(month.weighted).toLocaleString()}
      </TableCell>
      <TableCell className="text-right">
        ${Math.round(month.goal || 0).toLocaleString()}
      </TableCell>
      <TableCell
        className={`text-right ${month.gap > 0 ? "text-red-600" : "text-green-600"}`}
      >
        ${Math.round(month.gap || 0).toLocaleString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Input
            className="w-32 text-right"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <Button
            size="sm"
            onClick={() => onSave(month.month, Number(value || 0))}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
