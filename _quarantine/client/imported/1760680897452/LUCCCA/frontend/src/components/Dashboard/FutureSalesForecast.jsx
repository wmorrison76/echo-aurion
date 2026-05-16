// File: src/components/Dashboard/widgets/FutureSalesForecast.jsx
// Purpose: LUCCCA Forecasting Whiteboard Module (7d, 30d, 12mo + Tomorrow Prediction)

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// [🔮 Forecasting Whiteboard Module]
export default function FutureSalesForecast() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getForecastData(range);
        setData(res);
      } catch (e) {
        console.error("Forecast fetch error:", e);
      }
    };
    fetchData();
  }, [range]);

  return (
    <div className="w-full h-full p-4">
      <Tabs defaultValue={range} onValueChange={setRange} className="mb-4">
        <TabsList>
          <TabsTrigger value="1d">Tomorrow</TabsTrigger>
          <TabsTrigger value="7d">7-Day</TabsTrigger>
          <TabsTrigger value="30d">30-Day</TabsTrigger>
          <TabsTrigger value="12mo">12-Month</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="w-full h-[400px]">
        <CardContent className="h-full pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// [🧠 Placeholder Fetch] - Replace with predictive engine
async function getForecastData(range) {
  const now = new Date();
  let days = 7;
  if (range === "1d") days = 1;
  if (range === "30d") days = 30;
  if (range === "12mo") days = 365;

  const result = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return {
      label,
      sales: Math.floor(Math.random() * 4000 + 2000),
    };
  });

  return result;
}
