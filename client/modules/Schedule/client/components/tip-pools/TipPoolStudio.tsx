/** * Tip Pool Studio UI * Configure pools, run scenarios (hours / revenue / hybrid), compare fairness metrics. */
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useEchoAI } from "@/hooks/useEchoAI";
import { useTenancy } from "@/hooks/useTenancy";
interface Member {
  name: string;
  employee_id: string;
  hours_worked: number;
  revenue_attrib: number;
  tier_weight: number;
}
interface ScenarioResult {
  id: string;
  label: string;
  rule: "HOURS" | "REVENUE" | "HYBRID";
  hours_weight: number;
  revenue_weight: number;
  results?: Array<Member & { payout: number }>;
  fairnessScore?: number;
  minMax?: { min: number; max: number };
}
export const TipPoolStudio: React.FC = () => {
  const { tenancy } = useTenancy();
  const { generateScenarios } = useEchoAI();
  const [members, setMembers] = React.useState<Array<Member & { _key?: string }>>([
    {
      name: "Server 1",
      employee_id: "emp1",
      hours_worked: 8,
      revenue_attrib: 500,
      tier_weight: 1,
    },
    {
      name: "Server 2",
      employee_id: "emp2",
      hours_worked: 6,
      revenue_attrib: 300,
      tier_weight: 1,
    },
    {
      name: "Busser",
      employee_id: "emp3",
      hours_worked: 8,
      revenue_attrib: 100,
      tier_weight: 0.5,
    },
  ]);
  const [totalTips, setTotalTips] = React.useState(500);
  const [scenarios, setScenarios] = React.useState<ScenarioResult[]>([
    {
      id: "a",
      label: "70% Hours / 30% Revenue",
      rule: "HYBRID",
      hours_weight: 70,
      revenue_weight: 30,
    },
    {
      id: "b",
      label: "50% Hours / 50% Revenue",
      rule: "HYBRID",
      hours_weight: 50,
      revenue_weight: 50,
    },
    {
      id: "c",
      label: "Hours Only",
      rule: "HOURS",
      hours_weight: 100,
      revenue_weight: 0,
    },
    {
      id: "d",
      label: "Revenue Only",
      rule: "REVENUE",
      hours_weight: 0,
      revenue_weight: 100,
    },
    {
      id: "e",
      label: "30% Hours / 70% Revenue",
      rule: "HYBRID",
      hours_weight: 30,
      revenue_weight: 70,
    },
  ]);
  const [loading, setLoading] = React.useState(false);
  const calculatePayouts = (scenario: ScenarioResult) => {
    const sumH = members.reduce(
      (a, m) => a + m.hours_worked * m.tier_weight,
      0,
    );
    const sumR = members.reduce(
      (a, m) => a + m.revenue_attrib * m.tier_weight,
      0,
    );
    return members.map((m) => {
      let frac = 0;
      if (scenario.rule === "HOURS") {
        frac = sumH > 0 ? (m.hours_worked * m.tier_weight) / sumH : 0;
      } else if (scenario.rule === "REVENUE") {
        frac = sumR > 0 ? (m.revenue_attrib * m.tier_weight) / sumR : 0;
      } else {
        const hoursFrac =
          sumH > 0 ? (m.hours_worked * m.tier_weight) / sumH : 0;
        const revenueFrac =
          sumR > 0 ? (m.revenue_attrib * m.tier_weight) / sumR : 0;
        frac =
          (scenario.hours_weight / 100) * hoursFrac +
          (scenario.revenue_weight / 100) * revenueFrac;
      }
      return { ...m, payout: parseFloat((totalTips * frac).toFixed(2)) };
    });
  };
  const runAllScenarios = async () => {
    setLoading(true);
    const updated = scenarios.map((sc) => {
      const results = calculatePayouts(sc);
      const payouts = results.map((r) => r.payout);
      const fairnessScore =
        payouts.length > 0
          ? 1 - (Math.max(...payouts) - Math.min(...payouts)) / totalTips
          : 1;
      return {
        ...sc,
        results,
        fairnessScore: parseFloat((fairnessScore * 100).toFixed(1)),
        minMax: { min: Math.min(...payouts), max: Math.max(...payouts) },
      };
    });
    setScenarios(updated);
    setLoading(false);
  };
  const addMember = () => {
    const newMember: Member = {
      name: `Staff ${members.length + 1}`,
      employee_id: `emp${members.length + 1}`,
      hours_worked: 8,
      revenue_attrib: 300,
      tier_weight: 1,
    };
    setMembers([...members, newMember]);
  };
  const updateMember = (idx: number, field: keyof Member, value: any) => {
    const updated = [...members];
    const member = { ...updated[idx] };
    if (field === "name") {
      (member as any)[field] = String(value);
    } else {
      (member as any)[field] = Number(value);
    }
    updated[idx] = member;
    setMembers(updated);
  };
  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };
  return (
    <div className="space-y-6 p-4">
      {" "}
      <div className="space-y-2">
        {" "}
        <h2 className="text-2xl font-bold">Tip Pool Studio</h2>{" "}
        <p className="text-muted-foreground">
          {" "}
          Configure tip pools and compare fairness across scenarios{" "}
        </p>{" "}
      </div>{" "}
      {/* Input Section */}{" "}
      <Card className="p-4 space-y-4">
        {" "}
        <div className="grid grid-cols-2 gap-4">
          {" "}
          <div>
            {" "}
            <label className="text-sm font-medium block mb-1">
              Total Tips ($)
            </label>{" "}
            <Input
              type="number"
              value={totalTips}
              onChange={(e) => setTotalTips(parseFloat(e.target.value))}
              className="w-full"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-3">
          {" "}
          <h3 className="font-semibold">Team Members</h3>{" "}
          {members.map((m, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2 items-end">
              {" "}
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="Name"
                value={m.name}
                onChange={(e) => updateMember(idx, "name", e.target.value)}
              />{" "}
              <input
                className="border rounded px-2 py-1 text-sm"
                type="number"
                placeholder="Hours"
                value={String(Number(m.hours_worked) || 0)}
                onChange={(e) =>
                  updateMember(
                    idx,
                    "hours_worked",
                    parseFloat(e.target.value) || 0,
                  )
                }
              />{" "}
              <input
                className="border rounded px-2 py-1 text-sm"
                type="number"
                placeholder="Revenue $"
                value={String(Number(m.revenue_attrib) || 0)}
                onChange={(e) =>
                  updateMember(
                    idx,
                    "revenue_attrib",
                    parseFloat(e.target.value) || 0,
                  )
                }
              />{" "}
              <input
                className="border rounded px-2 py-1 text-sm"
                type="number"
                placeholder="Weight"
                step={0.5}
                value={String(Number(m.tier_weight) || 1)}
                onChange={(e) =>
                  updateMember(
                    idx,
                    "tier_weight",
                    parseFloat(e.target.value) || 1,
                  )
                }
              />{" "}
              <Button
                variant="destructive"
                onClick={() => removeMember(idx)}
                size="sm"
              >
                {" "}
                Remove{" "}
              </Button>{" "}
            </div>
          ))}{" "}
          <Button onClick={addMember} variant="outline" className="w-full">
            {" "}
            + Add Member{" "}
          </Button>{" "}
        </div>{" "}
        <Button
          onClick={runAllScenarios}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {" "}
          {loading ? "Computing..." : "Run All 5 Scenarios"}{" "}
        </Button>{" "}
      </Card>{" "}
      {/* Scenarios Grid */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {" "}
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="p-4 space-y-3">
            {" "}
            <div className="space-y-1">
              {" "}
              <h4 className="font-semibold text-sm">{scenario.label}</h4>{" "}
              <p className="text-xs text-muted-foreground">
                {scenario.rule}
              </p>{" "}
            </div>{" "}
            {scenario.fairnessScore !== undefined && (
              <div className="bg-muted p-2 rounded">
                {" "}
                <div className="text-xs text-muted-foreground">
                  Fairness
                </div>{" "}
                <div className="text-lg font-bold text-green-600">
                  {" "}
                  {scenario.fairnessScore}%{" "}
                </div>{" "}
              </div>
            )}{" "}
            {scenario.results ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {" "}
                {scenario.results.map((r) => (
                  <div
                    key={r.employee_id}
                    className="flex justify-between items-center text-sm border-b pb-1"
                  >
                    {" "}
                    <span className="truncate">{r.name}</span>{" "}
                    <span className="font-medium">
                      ${r.payout.toFixed(2)}
                    </span>{" "}
                  </div>
                ))}{" "}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">
                {" "}
                Run scenarios to see results{" "}
              </div>
            )}{" "}
            {scenario.minMax && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                {" "}
                Range: ${scenario.minMax.min.toFixed(2)} – ${" "}
                {scenario.minMax.max.toFixed(2)}{" "}
              </div>
            )}{" "}
          </Card>
        ))}{" "}
      </div>{" "}
    </div>
  );
};
