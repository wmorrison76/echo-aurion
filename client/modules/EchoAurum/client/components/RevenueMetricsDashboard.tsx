import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
export function RevenueMetricsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadMetrics();
  }, []);
  const loadMetrics = async () => {
    try {
      setLoading(true);
      const mockMetrics = {
        occupancy: 78.5,
        adr: 185.5,
        revpar: 145.62,
        roomRevenue: 14100,
        fbRevenue: 3540,
        totalRevenue: 18240,
        occupiedRooms: 117,
        totalRooms: 150,
        occupancyTrend: 2.3,
        adrTrend: 1.5,
        revparTrend: 3.2,
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error("Failed to load metrics:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading)
    return (
      <div className="text-muted-foreground">Loading revenue metrics...</div>
    );
  if (!metrics) return null;
  return (
    <div className="bg-background rounded-lg shadow p-6">
      {" "}
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        {" "}
        Revenue Metrics (Today){" "}
      </h3>{" "}
      {/* Key KPIs */}{" "}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {" "}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          {" "}
          <p className="text-sm text-muted-foreground mb-1">Occupancy</p>{" "}
          <p className="text-3xl font-bold text-primary">
            {" "}
            {metrics.occupancy.toFixed(1)}%{" "}
          </p>{" "}
          <div className="flex items-center gap-1 mt-2 text-sm">
            {" "}
            <TrendingUp className="w-4 h-4 text-green-500" />{" "}
            <span className="text-green-600">
              {" "}
              +{metrics.occupancyTrend.toFixed(1)}%{" "}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          {" "}
          <p className="text-sm text-muted-foreground mb-1">
            ADR (Avg Daily Rate)
          </p>{" "}
          <p className="text-3xl font-bold text-purple-600">
            {" "}
            ${metrics.adr.toFixed(2)}{" "}
          </p>{" "}
          <div className="flex items-center gap-1 mt-2 text-sm">
            {" "}
            <TrendingUp className="w-4 h-4 text-green-500" />{" "}
            <span className="text-green-600">
              {" "}
              +{metrics.adrTrend.toFixed(1)}%{" "}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          {" "}
          <p className="text-sm text-muted-foreground mb-1">RevPAR</p>{" "}
          <p className="text-3xl font-bold text-green-600">
            {" "}
            ${metrics.revpar.toFixed(2)}{" "}
          </p>{" "}
          <div className="flex items-center gap-1 mt-2 text-sm">
            {" "}
            <TrendingUp className="w-4 h-4 text-green-500" />{" "}
            <span className="text-green-600">
              {" "}
              +{metrics.revparTrend.toFixed(1)}%{" "}
            </span>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Revenue Breakdown */}{" "}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {" "}
        <div className="p-4 border border-gray-200 rounded-lg">
          {" "}
          <p className="text-sm font-semibold text-foreground mb-3">
            {" "}
            Revenue by Source{" "}
          </p>{" "}
          <div className="space-y-2">
            {" "}
            <div className="flex justify-between items-center">
              {" "}
              <span className="text-sm text-muted-foreground">
                Room Revenue
              </span>{" "}
              <span className="font-semibold">
                {" "}
                ${metrics.roomRevenue.toLocaleString()}{" "}
              </span>{" "}
            </div>{" "}
            <div className="w-full bg-surface rounded-full h-2">
              {" "}
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: "77%" }}
              />{" "}
            </div>{" "}
            <div className="flex justify-between items-center">
              {" "}
              <span className="text-sm text-muted-foreground">
                F&B Revenue
              </span>{" "}
              <span className="font-semibold">
                {" "}
                ${metrics.fbRevenue.toLocaleString()}{" "}
              </span>{" "}
            </div>{" "}
            <div className="w-full bg-surface rounded-full h-2">
              {" "}
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: "19%" }}
              />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="p-4 border border-gray-200 rounded-lg">
          {" "}
          <p className="text-sm font-semibold text-foreground mb-3">
            {" "}
            Occupancy Detail{" "}
          </p>{" "}
          <div className="flex items-center gap-4">
            {" "}
            <div className="relative w-24 h-24">
              {" "}
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                {" "}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />{" "}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={`${(metrics.occupancy / 100) * 282.7} 282.7`}
                />{" "}
              </svg>{" "}
              <div className="absolute inset-0 flex items-center justify-center">
                {" "}
                <span className="text-lg font-bold text-gray-900">
                  {" "}
                  {metrics.occupancy.toFixed(0)}%{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div className="text-sm">
              {" "}
              <p className="text-muted-foreground">
                {" "}
                {metrics.occupiedRooms} of {metrics.totalRooms} rooms{" "}
              </p>{" "}
              <p className="text-muted-foreground">occupied today</p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Total Revenue */}{" "}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg">
        {" "}
        <p className="text-sm text-muted-foreground mb-2">
          Total Revenue (Today)
        </p>{" "}
        <p className="text-3xl font-bold text-gray-900">
          {" "}
          ${metrics.totalRevenue.toLocaleString()}{" "}
        </p>{" "}
        <p className="text-sm text-muted-foreground mt-2">
          {" "}
          All revenue sources combined{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
