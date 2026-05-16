import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchWithLucccaSession } from "../../auth";
interface GLEntry {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  department?: string;
  memo?: string;
  date: string;
}
interface DrillDownProps {
  entityId: string;
  entityName: string;
  period: string;
  onBack: () => void;
}
export function ConsolidationDrillDown({
  entityId,
  entityName,
  period,
  onBack,
}: DrillDownProps) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [glEntries, setGLEntries] = useState<GLEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchGLDetail = async (accountCode: string) => {
    setLoading(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/gl?entityId=${entityId}&periodDate=${period}&accountCode=${accountCode}`,
      );
      if (response.ok) {
        const data = await response.json();
        setGLEntries(data.entries || []);
        setSelectedAccount(accountCode);
      }
    } catch (error) {
      console.error("Error fetching GL detail:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex items-center gap-4">
        {" "}
        <Button onClick={onBack} variant="outline">
          {" "}
          ← Back to Consolidation{" "}
        </Button>{" "}
        <div>
          {" "}
          <h3 className="text-lg font-semibold">{entityName}</h3>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            GL Detail for {period}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
      {selectedAccount ? (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <CardTitle>GL Entries for {selectedAccount}</CardTitle>{" "}
              <Button
                onClick={() => setSelectedAccount(null)}
                variant="ghost"
                size="sm"
              >
                {" "}
                Clear{" "}
              </Button>{" "}
            </div>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            {loading ? (
              <div className="text-center py-8">Loading GL detail...</div>
            ) : (
              <div className="overflow-x-auto">
                {" "}
                <table className="w-full text-sm">
                  {" "}
                  <thead className="border-b bg-muted">
                    {" "}
                    <tr>
                      {" "}
                      <th className="px-4 py-2 text-left">Date</th>{" "}
                      <th className="px-4 py-2 text-left">Debit</th>{" "}
                      <th className="px-4 py-2 text-left">Credit</th>{" "}
                      <th className="px-4 py-2 text-left">Department</th>{" "}
                      <th className="px-4 py-2 text-left">Memo</th>{" "}
                    </tr>{" "}
                  </thead>{" "}
                  <tbody>
                    {" "}
                    {glEntries.map((entry, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        {" "}
                        <td className="px-4 py-2">{entry.date}</td>{" "}
                        <td className="px-4 py-2">
                          {" "}
                          {entry.debitAmount > 0
                            ? `$${entry.debitAmount.toFixed(2)}`
                            : "-"}{" "}
                        </td>{" "}
                        <td className="px-4 py-2">
                          {" "}
                          {entry.creditAmount > 0
                            ? `$${entry.creditAmount.toFixed(2)}`
                            : "-"}{" "}
                        </td>{" "}
                        <td className="px-4 py-2">{entry.department || "-"}</td>{" "}
                        <td className="px-4 py-2 text-muted-foreground">
                          {" "}
                          {entry.memo}{" "}
                        </td>{" "}
                      </tr>
                    ))}{" "}
                  </tbody>{" "}
                </table>{" "}
              </div>
            )}{" "}
          </CardContent>{" "}
        </Card>
      ) : (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Select GL Account to Drill Down</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {" "}
              {["4100", "4101", "4200", "6010", "6011", "7000", "7100"].map(
                (code) => (
                  <Button
                    key={code}
                    onClick={() => fetchGLDetail(code)}
                    variant="outline"
                    className="justify-start"
                  >
                    {" "}
                    {code}{" "}
                  </Button>
                ),
              )}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
