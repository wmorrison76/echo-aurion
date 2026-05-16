import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithLucccaSession } from "../../auth";
interface VarianceNarrative {
  account: string;
  variance: number;
  percent: number;
  aiNarrative: string;
  userOverride?: string;
  guardianStatus: "passed" | "warning" | "failed";
  guardianNotes?: string;
}
interface VarianceNarrativePanelProps {
  entityId: string;
  currentPeriod: string;
  priorPeriod: string;
}
export function VarianceNarrativePanel({
  entityId,
  currentPeriod,
  priorPeriod,
}: VarianceNarrativePanelProps) {
  const [narratives, setNarratives] = useState<VarianceNarrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  useEffect(() => {
    fetchNarratives();
  }, [entityId, currentPeriod]);
  const fetchNarratives = async () => {
    setLoading(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/reports/variance-narrative?entityId=${entityId}&currentPeriod=${currentPeriod}&priorPeriod=${priorPeriod}`,
      );
      if (response.ok) {
        const data = await response.json();
        setNarratives(data.narratives || []);
      }
    } catch (error) {
      console.error("Error fetching narratives:", error);
    } finally {
      setLoading(false);
    }
  };
  const saveOverride = async (account: string, override: string) => {
    try {
      await fetchWithLucccaSession(
        `/api/aurum/reports/variance-narrative/${account}`,
        {
          method: "POST",
          body: JSON.stringify({ entityId, account, userOverride: override }),
        },
      );
      setNarratives(
        narratives.map((n) =>
          n.account === account ? { ...n, userOverride: override } : n,
        ),
      );
      setEditingAccount(null);
    } catch (error) {
      console.error("Error saving override:", error);
    }
  };
  if (loading) {
    return (
      <Card>
        {" "}
        <CardContent className="pt-6">
          {" "}
          <div className="text-center">Loading variance narratives...</div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center justify-between">
            {" "}
            <span>Variance Narratives</span>{" "}
            <Badge>{narratives.length} items</Badge>{" "}
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          {narratives.map((narrative) => (
            <div
              key={narrative.account}
              className="border rounded-lg p-4 hover:bg-muted/50"
            >
              {" "}
              <div className="flex items-start justify-between mb-2">
                {" "}
                <div>
                  {" "}
                  <h4 className="font-semibold">{narrative.account}</h4>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    Variance: ${narrative.variance.toFixed(2)} ({" "}
                    {narrative.percent.toFixed(1)}%){" "}
                  </p>{" "}
                </div>{" "}
                <div className="flex gap-2">
                  {" "}
                  <Badge
                    variant={
                      narrative.guardianStatus === "passed"
                        ? "default"
                        : narrative.guardianStatus === "warning"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {" "}
                    {narrative.guardianStatus === "passed"
                      ? "✓ OK"
                      : `⚠ ${narrative.guardianStatus}`}{" "}
                  </Badge>{" "}
                </div>{" "}
              </div>{" "}
              {editingAccount === narrative.account ? (
                <div className="space-y-2">
                  {" "}
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-24"
                    placeholder="Edit or add narrative..."
                  />{" "}
                  <div className="flex gap-2">
                    {" "}
                    <Button
                      size="sm"
                      onClick={() => saveOverride(narrative.account, editText)}
                    >
                      {" "}
                      Save{" "}
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAccount(null)}
                    >
                      {" "}
                      Cancel{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>
              ) : (
                <>
                  {" "}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                    {" "}
                    <p className="text-sm">
                      {" "}
                      <span className="font-semibold">AI Narrative:</span>
                      {""}{" "}
                      {narrative.userOverride || narrative.aiNarrative}{" "}
                    </p>{" "}
                    {narrative.userOverride && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {" "}
                        (Edited by user){" "}
                      </p>
                    )}{" "}
                  </div>{" "}
                  {narrative.guardianNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                      {" "}
                      <p className="text-xs text-amber-900">
                        {" "}
                        Guardian note: {narrative.guardianNotes}{" "}
                      </p>{" "}
                    </div>
                  )}{" "}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingAccount(narrative.account);
                      setEditText(
                        narrative.userOverride || narrative.aiNarrative,
                      );
                    }}
                  >
                    {" "}
                    Edit Narrative{" "}
                  </Button>{" "}
                </>
              )}{" "}
            </div>
          ))}{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
