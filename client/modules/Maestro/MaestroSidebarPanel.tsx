import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  BarChart3,
  Settings,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
interface BQTItem {
  id: string;
  name: string;
  status: "ready" | "in-progress" | "blocked" | "completed";
  priority: "high" | "medium" | "low";
  assignee?: string;
  dueDate?: string;
}
interface MetricsData {
  totalItems: number;
  completedItems: number;
  blockedItems: number;
  completionRate: number;
}
const MaestroSidebarPanel: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState({
    active: true,
    completed: false,
    blocked: false,
    metrics: true,
  });
  const [metrics, setMetrics] = useState<MetricsData>({
    totalItems: 42,
    completedItems: 28,
    blockedItems: 3,
    completionRate: 67,
  });
  const [bqtItems, setBQTItems] = useState<BQTItem[]>([
    {
      id: "1",
      name: "Maestro BQT Dashboard",
      status: "in-progress",
      priority: "high",
      assignee: "Chef Manager",
      dueDate: "2024-12-20",
    },
    {
      id: "2",
      name: "Production Sheet Import",
      status: "ready",
      priority: "high",
      assignee: "Kitchen Lead",
      dueDate: "2024-12-18",
    },
    {
      id: "3",
      name: "Staff Assignment Sync",
      status: "in-progress",
      priority: "medium",
      assignee: "Schedule Manager",
      dueDate: "2024-12-22",
    },
    {
      id: "4",
      name: "Real-time Updates",
      status: "ready",
      priority: "high",
      dueDate: "2024-12-19",
    },
  ]);
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in-progress":
        return "bg-primary/20 text-blue-400 border-blue-500/30";
      case "blocked":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "ready":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-foreground/10 text-foreground/60 border-foreground/20";
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-green-400";
      default:
        return "text-foreground/60";
    }
  };
  const handleRefresh = async () => {
    try {
      const response = await fetch("/api/maestro/metrics", { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        console.log("[Maestro Sidebar] Updated metrics:", data);
      }
    } catch (error) {
      console.log("[Maestro Sidebar] Failed to refresh:", error);
    }
  };
  const activeItems = bqtItems.filter((item) => item.status !== "completed");
  const completedItems = bqtItems.filter((item) => item.status === "completed");
  const blockedItems = bqtItems.filter((item) => item.status === "blocked");
  return (
    <div className="w-80 h-full bg-background/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg flex flex-col overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-cyan-400/5">
        {" "}
        <div className="flex items-center justify-between mb-3">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <BarChart3 size={18} className="text-cyan-400" />{" "}
            <h2 className="font-semibold text-sm text-foreground">
              BQT Monitor
            </h2>{" "}
          </div>{" "}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            className="h-6 w-6 p-0"
          >
            {" "}
            <RefreshCw size={14} className="text-cyan-400" />{" "}
          </Button>{" "}
        </div>{" "}
        <p className="text-xs text-foreground/60">
          {" "}
          Real-time production tracking{" "}
        </p>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-y-auto">
        {" "}
        {/* Metrics Card */}{" "}
        {expandedSections.metrics && (
          <div className="p-3 border-b border-cyan-400/10">
            {" "}
            <button
              onClick={() => toggleSection("metrics")}
              className="w-full flex items-center justify-between p-2 hover:bg-background/20 rounded transition"
            >
              {" "}
              <span className="text-xs font-semibold text-cyan-400">
                {" "}
                METRICS{" "}
              </span>{" "}
              {expandedSections.metrics ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}{" "}
            </button>{" "}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {" "}
              <div className="p-2 bg-background/40 rounded border border-cyan-400/20">
                {" "}
                <p className="text-xs text-foreground/60">Completion</p>{" "}
                <p className="text-lg font-bold text-cyan-400">
                  {" "}
                  {metrics.completionRate}%{" "}
                </p>{" "}
              </div>{" "}
              <div className="p-2 bg-background/40 rounded border border-cyan-400/20">
                {" "}
                <p className="text-xs text-foreground/60">Items</p>{" "}
                <p className="text-lg font-bold text-green-400">
                  {" "}
                  {metrics.completedItems}/{metrics.totalItems}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Active Items */}{" "}
        <div className="border-b border-cyan-400/10">
          {" "}
          <button
            onClick={() => toggleSection("active")}
            className="w-full flex items-center justify-between p-3 hover:bg-background/20 transition"
          >
            {" "}
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              {" "}
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>{" "}
              ACTIVE ({activeItems.length}){" "}
            </span>{" "}
            {expandedSections.active ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}{" "}
          </button>{" "}
          {expandedSections.active && (
            <div className="px-3 pb-3 space-y-2">
              {" "}
              {activeItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-background/30 rounded border border-blue-400/20 hover:border-blue-400/40 transition"
                >
                  {" "}
                  <div className="flex items-start justify-between mb-1">
                    {" "}
                    <p className="text-xs font-medium text-foreground">
                      {" "}
                      {item.name}{" "}
                    </p>{" "}
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded border",
                        getStatusColor(item.status),
                      )}
                    >
                      {" "}
                      {item.status.replace("-", "").toUpperCase()}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between text-[10px] text-foreground/60">
                    {" "}
                    <span className={getPriorityColor(item.priority)}>
                      {" "}
                      {item.priority.toUpperCase()}{" "}
                    </span>{" "}
                    {item.dueDate && (
                      <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                    )}{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Blocked Items */}{" "}
        {blockedItems.length > 0 && (
          <div className="border-b border-cyan-400/10">
            {" "}
            <button
              onClick={() => toggleSection("blocked")}
              className="w-full flex items-center justify-between p-3 hover:bg-background/20 transition"
            >
              {" "}
              <span className="text-xs font-semibold text-red-400 flex items-center gap-2">
                {" "}
                <span className="inline-block w-2 h-2 bg-red-400 rounded-full"></span>{" "}
                BLOCKED ({blockedItems.length}){" "}
              </span>{" "}
              {expandedSections.blocked ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}{" "}
            </button>{" "}
            {expandedSections.blocked && (
              <div className="px-3 pb-3 space-y-2">
                {" "}
                {blockedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-red-500/10 rounded border border-red-400/30"
                  >
                    {" "}
                    <p className="text-xs font-medium text-foreground mb-1">
                      {" "}
                      {item.name}{" "}
                    </p>{" "}
                    <p className="text-[10px] text-red-400">
                      {" "}
                      Needs attention{" "}
                    </p>{" "}
                  </div>
                ))}{" "}
              </div>
            )}{" "}
          </div>
        )}{" "}
        {/* Completed Items */}{" "}
        {completedItems.length > 0 && (
          <div>
            {" "}
            <button
              onClick={() => toggleSection("completed")}
              className="w-full flex items-center justify-between p-3 hover:bg-background/20 transition"
            >
              {" "}
              <span className="text-xs font-semibold text-green-400 flex items-center gap-2">
                {" "}
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>{" "}
                COMPLETED ({completedItems.length}){" "}
              </span>{" "}
              {expandedSections.completed ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}{" "}
            </button>{" "}
            {expandedSections.completed && (
              <div className="px-3 pb-3 space-y-2">
                {" "}
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-green-500/10 rounded border border-green-400/20 line-through text-foreground/50"
                  >
                    {" "}
                    <p className="text-xs font-medium">{item.name}</p>{" "}
                  </div>
                ))}{" "}
              </div>
            )}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Footer */}{" "}
      <div className="p-3 border-t border-cyan-400/10 bg-background/20">
        {" "}
        <button className="w-full text-xs text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-2 py-2">
          {" "}
          <Settings size={14} /> Configure BQT{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
export default MaestroSidebarPanel;
