import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SettingsStore } from "@/lib/settings";
import { RoleGuard } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function Conversions() {
  const [from, setFrom] = useState("lb");
  const [to, setTo] = useState("oz");
  const [factor, setFactor] = useState(16);
  const [version, setVersion] = useState(0);
  const conversions = useMemo(() => SettingsStore.get().conversions, [version]);
  const add = () => {
    SettingsStore.upsertConversion({ from, to, factor });
    setVersion((v) => v + 1);
  };
  const remove = (f: string, t: string) => {
    SettingsStore.removeConversion({ from: f, to: t, factor: 1 });
    setVersion((v) => v + 1);
  };
  return (
    <AppLayout>
      {" "}
      <RoleGuard roles={["Admin", "Manager"]}>
        {" "}
        <div className="space-y-6">
          {" "}
          <Card className="border-2">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Unit & Pack Conversions</CardTitle>{" "}
              <CardDescription>
                {" "}
                Rules override defaults; future: AI learns conversions per
                vendor and moves under Settings gear.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                {" "}
                <div>
                  {" "}
                  <Label>From</Label>{" "}
                  <Input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <Label>To</Label>{" "}
                  <Input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <Label>Factor</Label>{" "}
                  <Input
                    type="number"
                    value={factor}
                    onChange={(e) => setFactor(Number(e.target.value))}
                  />{" "}
                </div>{" "}
                <div className="self-end">
                  {" "}
                  <Button onClick={add}>Save</Button>{" "}
                </div>{" "}
              </div>{" "}
              <div className="mt-4 rounded-lg border">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow>
                      {" "}
                      <TableHead>From</TableHead> <TableHead>To</TableHead>{" "}
                      <TableHead className="text-right">Factor</TableHead>{" "}
                      <TableHead></TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {conversions.map((r, i) => (
                      <TableRow key={`${r.from}->${r.to}-${i}`}>
                        {" "}
                        <TableCell>{r.from}</TableCell>{" "}
                        <TableCell>{r.to}</TableCell>{" "}
                        <TableCell className="text-right">{r.factor}</TableCell>{" "}
                        <TableCell className="text-right">
                          {" "}
                          <Button
                            variant="ghost"
                            onClick={() => remove(r.from, r.to)}
                          >
                            {" "}
                            Delete{" "}
                          </Button>{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ))}{" "}
                    {!conversions.length && (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={4}
                          className="text-center text-sm text-muted-foreground"
                        >
                          {" "}
                          No custom rules yet.{" "}
                        </TableCell>{" "}
                      </TableRow>
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
      </RoleGuard>{" "}
    </AppLayout>
  );
}
