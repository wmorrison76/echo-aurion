import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
  Loader2,
  BarChart3,
} from "lucide-react";
import type { PnLDriver, Outlet } from "@shared/outlets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchWithLucccaSession } from "../../auth";
interface NewDriverForm {
  name: string;
  description: string;
  unit: string;
  januaryValue: number;
  februaryValue: number;
  marchValue: number;
  aprilValue: number;
  mayValue: number;
  juneValue: number;
  julyValue: number;
  augustValue: number;
  septemberValue: number;
  octoberValue: number;
  novemberValue: number;
  decemberValue: number;
}
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_KEYS: (keyof NewDriverForm)[] = [
  "januaryValue",
  "februaryValue",
  "marchValue",
  "aprilValue",
  "mayValue",
  "juneValue",
  "julyValue",
  "augustValue",
  "septemberValue",
  "octoberValue",
  "novemberValue",
  "decemberValue",
];
export function DriverConfiguration({ outletId }: { outletId: string }) {
  const [drivers, setDrivers] = useState<PnLDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewDriverForm>({
    name: "",
    description: "",
    unit: "",
    januaryValue: 0,
    februaryValue: 0,
    marchValue: 0,
    aprilValue: 0,
    mayValue: 0,
    juneValue: 0,
    julyValue: 0,
    augustValue: 0,
    septemberValue: 0,
    octoberValue: 0,
    novemberValue: 0,
    decemberValue: 0,
  });
  useEffect(() => {
    fetchDrivers();
  }, [outletId]);
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/outlets/${outletId}/drivers`,
      );
      if (response.ok) {
        const data = await response.json();
        setDrivers(data.drivers);
      }
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleAddDriver = async () => {
    if (!form.name || !form.unit) {
      return;
    }
    try {
      const response = await fetchWithLucccaSession(
        `/api/outlets/${outletId}/drivers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drivers: [form] }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        setDrivers([...drivers, ...data.drivers]);
        setForm({
          name: "",
          description: "",
          unit: "",
          januaryValue: 0,
          februaryValue: 0,
          marchValue: 0,
          aprilValue: 0,
          mayValue: 0,
          juneValue: 0,
          julyValue: 0,
          augustValue: 0,
          septemberValue: 0,
          octoberValue: 0,
          novemberValue: 0,
          decemberValue: 0,
        });
        setShowForm(false);
      }
    } catch (error) {
      console.error("Failed to create driver:", error);
    }
  };
  const handleDeleteDriver = async (driverId: string) => {
    setDrivers(drivers.filter((d) => d.id !== driverId));
  };
  const getAnnualTotal = (driverKey: keyof NewDriverForm) => {
    return MONTH_KEYS.reduce((sum, month) => sum + (form[month] as number), 0);
  };
  const getDriverAnnualTotal = (driver: PnLDriver) => {
    return MONTH_KEYS.reduce(
      (sum, month) => sum + (driver[month] as number),
      0,
    );
  };
  const calculateMonthlyChange = (driverKey: keyof NewDriverForm) => {
    const monthIndex = MONTH_KEYS.indexOf(driverKey);
    if (monthIndex === 0) return 0;
    const current = form[driverKey] as number;
    const previous = form[MONTH_KEYS[monthIndex - 1]] as number;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            {" "}
            Driver Configuration{" "}
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            P&L Drivers{" "}
          </h3>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Define key drivers (room nights, covers, occupancy) to forecast P&L
            based on historical trends.{" "}
          </p>{" "}
        </div>{" "}
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-aurum-500 hover:bg-aurum-400"
        >
          {" "}
          <Plus className="mr-2 h-4 w-4" /> Add Driver{" "}
        </Button>{" "}
      </div>{" "}
      {showForm && (
        <div className="space-y-4 rounded-2xl border border-border/40 bg-surface-variant/60 p-5">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div>
              {" "}
              <label className="text-xs font-semibold text-muted-foreground">
                {" "}
                Driver Name{" "}
              </label>{" "}
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Room Nights, Covers, etc."
                className="mt-1"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-xs font-semibold text-muted-foreground">
                {" "}
                Unit of Measure{" "}
              </label>{" "}
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="nights, covers, %"
                className="mt-1"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-xs font-semibold text-muted-foreground">
              {" "}
              Description{" "}
            </label>{" "}
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="What does this driver measure?"
              className="mt-1"
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-xs font-semibold text-muted-foreground mb-3 block">
              {" "}
              Monthly Values{" "}
            </label>{" "}
            <div className="grid gap-3 sm:grid-cols-6">
              {" "}
              {MONTHS.map((month, idx) => (
                <div key={month}>
                  {" "}
                  <label className="text-[0.65rem] text-muted-foreground">
                    {" "}
                    {month.slice(0, 3)}{" "}
                  </label>{" "}
                  <Input
                    type="number"
                    value={form[MONTH_KEYS[idx]]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [MONTH_KEYS[idx]]: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className="mt-1 text-sm"
                  />{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            <Button onClick={handleAddDriver} className="flex-1">
              {" "}
              Create Driver{" "}
            </Button>{" "}
            <Button
              onClick={() => setShowForm(false)}
              variant="outline"
              className="flex-1"
            >
              {" "}
              Cancel{" "}
            </Button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      <div className="space-y-4">
        {" "}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            {" "}
            <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />{" "}
          </div>
        ) : drivers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
            {" "}
            <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground/40" />{" "}
            <p className="mt-3 text-sm text-muted-foreground">
              {" "}
              No drivers configured yet{" "}
            </p>{" "}
          </div>
        ) : (
          drivers.map((driver) => {
            const annualTotal = getDriverAnnualTotal(driver);
            const monthlyValues = MONTH_KEYS.map(
              (key) => driver[key] as number,
            );
            const avgValue = annualTotal / 12;
            const maxValue = Math.max(...monthlyValues);
            const minValue = Math.min(...monthlyValues);
            return (
              <div
                key={driver.id}
                className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5"
              >
                {" "}
                <div className="flex items-start justify-between mb-4">
                  {" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold text-foreground">
                      {" "}
                      {driver.name}{" "}
                    </h4>{" "}
                    <p className="text-sm text-muted-foreground">
                      {" "}
                      {driver.description}{" "}
                    </p>{" "}
                  </div>{" "}
                  <Button
                    onClick={() => handleDeleteDriver(driver.id)}
                    variant="ghost"
                    size="sm"
                  >
                    {" "}
                    <Trash2 className="h-4 w-4 text-red-400" />{" "}
                  </Button>{" "}
                </div>{" "}
                <div className="grid gap-3 sm:grid-cols-4 mb-4 pb-4 border-b border-border/40">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Annual Total{" "}
                    </p>{" "}
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {" "}
                      {annualTotal.toFixed(0)} {driver.unit}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      Monthly Avg
                    </p>{" "}
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {" "}
                      {avgValue.toFixed(1)} {driver.unit}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      Peak Month
                    </p>{" "}
                    <p className="mt-1 text-lg font-semibold text-aurum-300">
                      {" "}
                      {maxValue.toFixed(1)} {driver.unit}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      Low Month
                    </p>{" "}
                    <p className="mt-1 text-lg font-semibold text-yellow-400">
                      {" "}
                      {minValue.toFixed(1)} {driver.unit}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="overflow-x-auto">
                  {" "}
                  <div className="flex gap-2 min-w-max">
                    {" "}
                    {MONTHS.map((month, idx) => {
                      const value = monthlyValues[idx];
                      const heightPercent = (value / maxValue) * 100;
                      return (
                        <div
                          key={month}
                          className="flex flex-col items-center gap-1"
                        >
                          {" "}
                          <div
                            className="w-8 rounded-t-md bg-gradient-to-t from-aurum-500 to-aurum-300"
                            style={{
                              height: `${Math.max(heightPercent, 10)}px`,
                            }}
                          />{" "}
                          <span className="text-[0.6rem] text-muted-foreground">
                            {" "}
                            {month.slice(0, 1)}{" "}
                          </span>{" "}
                          <span className="text-[0.65rem] font-medium text-foreground">
                            {" "}
                            {value.toFixed(0)}{" "}
                          </span>{" "}
                        </div>
                      );
                    })}{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            );
          })
        )}{" "}
      </div>{" "}
    </div>
  );
}
