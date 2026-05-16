import React, { useState } from "react";
import { JiraEmbed } from "./types";
import {
  RefreshCw,
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
interface JiraEmbedComponentProps {
  embed: JiraEmbed;
  isSelected?: boolean;
  onUpdate?: (embed: Partial<JiraEmbed>) => void;
  onDelete?: (id: string) => void;
  onOpenInJira?: (url: string) => void;
}
const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case "critical":
    case "blocker":
      return "bg-red-100 text-red-800 border-red-300";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "low":
      return "bg-blue-100 text-blue-800 border-primary";
    default:
      return "bg-surface text-gray-800 border-border";
  }
};
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "done":
    case "closed":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "in progress":
      return <Clock className="w-4 h-4 text-primary" />;
    case "blocked":
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};
export const JiraEmbedComponent: React.FC<JiraEmbedComponentProps> = ({
  embed,
  isSelected = false,
  onUpdate,
  onDelete,
  onOpenInJira,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embed }),
      });
      if (!response.ok) {
        throw new Error("Failed to sync Jira issue");
      }
      const updates = await response.json();
      onUpdate?.(updates);
    } catch (error) {
      console.error("[JiraEmbed] Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };
  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 transition-all bg-background ${isSelected ? "border-blue-500 shadow-lg" : "border-border"}`}
      style={{ width: `${embed.width}px`, height: `${embed.height}px` }}
    >
      {" "}
      <div className="h-full flex flex-col p-3">
        {" "}
        {/* Header */}{" "}
        <div className="flex items-start justify-between mb-2">
          {" "}
          <div className="flex-1 min-w-0">
            {" "}
            <div className="flex items-center gap-2 mb-1">
              {" "}
              <span className="text-xs font-bold text-muted-foreground bg-surface px-2 py-1 rounded">
                {" "}
                {embed.issueKey}{" "}
              </span>{" "}
              <span
                className={`text-xs px-2 py-1 rounded border ${getPriorityColor(embed.priority)}`}
              >
                {" "}
                {embed.priority}{" "}
              </span>{" "}
            </div>{" "}
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {" "}
              {embed.summary}{" "}
            </h3>{" "}
          </div>{" "}
          {isSelected && (
            <div className="flex gap-1 ml-2">
              {" "}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-50"
                title="Sync with Jira"
              >
                {" "}
                <RefreshCw
                  className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`}
                />{" "}
              </button>{" "}
              <button
                onClick={() => onOpenInJira?.(embed.jiraUrl)}
                className="p-1 hover:bg-surface rounded transition-colors"
                title="Open in Jira"
              >
                {" "}
                <ExternalLink className="w-3 h-3" />{" "}
              </button>{" "}
              <button
                onClick={() => onDelete?.(embed.id)}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Delete"
              >
                {" "}
                <X className="w-3 h-3 text-red-500" />{" "}
              </button>{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Status */}{" "}
        <div className="flex items-center gap-2 mb-2">
          {" "}
          {getStatusIcon(embed.status)}{" "}
          <span className="text-xs text-muted-foreground">
            {embed.status}
          </span>{" "}
        </div>{" "}
        {/* Assignee and Due Date */}{" "}
        <div className="text-xs text-muted-foreground space-y-1 mb-2">
          {" "}
          {embed.assignee && (
            <div>
              {" "}
              <span className="font-medium">Assignee:</span>{" "}
              {embed.assignee}{" "}
            </div>
          )}{" "}
          {embed.dueDate && (
            <div>
              {" "}
              <span className="font-medium">Due:</span>
              {""} {new Date(embed.dueDate).toLocaleDateString()}{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Labels */}{" "}
        {embed.labels && embed.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {" "}
            {embed.labels.slice(0, 3).map((label, idx) => (
              <span
                key={idx}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
              >
                {" "}
                {label}{" "}
              </span>
            ))}{" "}
            {embed.labels.length > 3 && (
              <span className="text-xs text-muted-foreground">
                {" "}
                +{embed.labels.length - 3}{" "}
              </span>
            )}{" "}
          </div>
        )}{" "}
        {/* Description Preview */}{" "}
        {embed.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
            {" "}
            {embed.description}{" "}
          </p>
        )}{" "}
        {/* Last Synced */}{" "}
        {embed.lastSyncedAt && (
          <div className="text-xs text-gray-400 mt-auto pt-2 border-t border-gray-200">
            {" "}
            Last synced {new Date(embed.lastSyncedAt).toLocaleDateString()}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default JiraEmbedComponent;
