import React, { useState } from "react";
import { CanvasState } from "./types";
import {
  Clock,
  RotateCcw,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
export interface CanvasVersion {
  id: string;
  timestamp: number;
  label: string;
  canvasState: CanvasState;
  changesSummary: string;
  author?: string;
  isAutoSave: boolean;
}
interface VersionHistoryPanelProps {
  versions: CanvasVersion[];
  currentVersion: CanvasVersion;
  onRestore: (version: CanvasVersion) => void;
  onDelete: (versionId: string) => void;
  onExport: (version: CanvasVersion) => void;
}
export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  versions,
  currentVersion,
  onRestore,
  onDelete,
  onExport,
}) => {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(
    null,
  );
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  const getTimeDiff = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };
  const sortedVersions = [...versions].sort(
    (a, b) => b.timestamp - a.timestamp,
  );
  return (
    <div className="flex flex-col h-full bg-background">
      {" "}
      <div className="p-4 border-b border-border/30">
        {" "}
        <div className="flex items-center gap-2 mb-2">
          {" "}
          <Clock size={18} className="text-primary" />{" "}
          <h3 className="font-semibold text-foreground">
            Version History
          </h3>{" "}
        </div>{" "}
        <p className="text-xs text-foreground/60">
          {" "}
          {versions.length} version{versions.length !== 1 ? "s" : ""} saved{" "}
        </p>{" "}
      </div>{" "}
      <div className="flex-1 overflow-y-auto">
        {" "}
        {sortedVersions.length === 0 ? (
          <div className="p-4 text-center text-foreground/40 text-sm">
            {" "}
            No version history yet{" "}
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {" "}
            {sortedVersions.map((version, index) => {
              const isExpanded = expandedVersionId === version.id;
              const isCurrent = version.id === currentVersion.id;
              return (
                <div
                  key={version.id}
                  className={`p-3 transition-colors ${isCurrent ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-foreground/5"}`}
                >
                  {" "}
                  {/* Version Header */}{" "}
                  <div
                    className="flex items-center justify-between cursor-pointer gap-2"
                    onClick={() =>
                      setExpandedVersionId(isExpanded ? null : version.id)
                    }
                  >
                    {" "}
                    <div className="flex-1 min-w-0">
                      {" "}
                      <div className="flex items-center gap-2">
                        {" "}
                        <p className="font-medium text-sm text-foreground truncate">
                          {" "}
                          {version.label ||
                            `Version ${versions.length - index}`}{" "}
                        </p>{" "}
                        {isCurrent && (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold text-white bg-primary rounded-full">
                            {" "}
                            Current{" "}
                          </span>
                        )}{" "}
                        {version.isAutoSave && (
                          <span className="inline-block px-2 py-0.5 text-xs text-foreground/60 bg-foreground/10 rounded">
                            {" "}
                            Auto{" "}
                          </span>
                        )}{" "}
                      </div>{" "}
                      <p className="text-xs text-foreground/50 mt-1">
                        {" "}
                        {getTimeDiff(version.timestamp)}{" "}
                      </p>{" "}
                    </div>{" "}
                    <button
                      className="p-1 hover:bg-foreground/10 rounded text-foreground/60 hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedVersionId(isExpanded ? null : version.id);
                      }}
                    >
                      {" "}
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}{" "}
                    </button>{" "}
                  </div>{" "}
                  {/* Version Details */}{" "}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
                      {" "}
                      <p className="text-xs text-foreground/70">
                        {" "}
                        <span className="font-medium">Changes:</span>
                        {""} {version.changesSummary}{" "}
                      </p>{" "}
                      {version.author && (
                        <p className="text-xs text-foreground/60">
                          {" "}
                          <span className="font-medium">By:</span>
                          {""} {version.author}{" "}
                        </p>
                      )}{" "}
                      <p className="text-xs text-foreground/50">
                        {" "}
                        {formatDate(version.timestamp)}{" "}
                      </p>{" "}
                      {/* Action Buttons */}{" "}
                      <div className="flex gap-2 mt-3 pt-2 border-t border-border/20">
                        {" "}
                        {!isCurrent && (
                          <button
                            onClick={() => onRestore(version)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                          >
                            {" "}
                            <RotateCcw size={14} /> Restore{" "}
                          </button>
                        )}{" "}
                        <button
                          onClick={() => onExport(version)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
                          title="Export this version"
                        >
                          {" "}
                          <Download size={14} />{" "}
                        </button>{" "}
                        {!isCurrent && (
                          <button
                            onClick={() => onDelete(version.id)}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                            title="Delete this version"
                          >
                            {" "}
                            <Trash2 size={14} />{" "}
                          </button>
                        )}{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
                </div>
              );
            })}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
