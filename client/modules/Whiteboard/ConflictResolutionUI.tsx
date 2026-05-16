/** * Phase 11: Conflict Resolution UI * Visual interface for resolving merge conflicts */ import React, {
  useState,
} from "react";
import { MergeConflict, BranchMetadata } from "./types/BranchTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/glass";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
interface ConflictResolutionUIProps {
  conflicts: MergeConflict[];
  sourceBranch: BranchMetadata;
  targetBranch: BranchMetadata;
  onResolve: (conflicts: MergeConflict[]) => void;
  onCancel: () => void;
}
export const ConflictResolutionUI: React.FC<ConflictResolutionUIProps> = ({
  conflicts,
  sourceBranch,
  targetBranch,
  onResolve,
  onCancel,
}) => {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set(conflicts.slice(0, 3).map((c) => c.conflictId)),
  );
  const [resolvedConflicts, setResolvedConflicts] = useState<
    Map<string, MergeConflict>
  >(new Map());
  const allResolved = resolvedConflicts.size === conflicts.length;
  const toggleExpanded = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };
  const resolveConflict = (
    conflictId: string,
    resolution: "keep-source" | "keep-target" | "merge" | "custom",
  ) => {
    const conflict = conflicts.find((c) => c.conflictId === conflictId);
    if (!conflict) return;
    const resolved = { ...conflict, isResolved: true, resolution };
    const newResolved = new Map(resolvedConflicts);
    newResolved.set(conflictId, resolved);
    setResolvedConflicts(newResolved);
  };
  const handleResolveAll = () => {
    const allResolved = Array.from(resolvedConflicts.values());
    if (allResolved.length === conflicts.length) {
      onResolve(allResolved);
    }
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };
  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200";
      case "medium":
        return "bg-yellow-50 border-yellow-200";
      case "low":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-surface border-gray-200";
    }
  };
  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case "position":
        return "Position Conflict";
      case "properties":
        return "Property Conflict";
      case "deletion":
        return "Deletion Conflict";
      case "content":
        return "Content Conflict";
      default:
        return "Unknown Conflict";
    }
  };
  return (
    <div className="w-full max-w-4xl space-y-4">
      {" "}
      {/* Header */}{" "}
      <div className="space-y-2">
        {" "}
        <h2 className="text-2xl font-bold text-foreground">
          {" "}
          Resolve Conflicts{" "}
        </h2>{" "}
        <p className="text-sm text-muted-foreground">
          {" "}
          Found {conflicts.length} conflict(s) between{""}{" "}
          <span className="font-semibold">{sourceBranch.name}</span> and{""}{" "}
          <span className="font-semibold">{targetBranch.name}</span>{" "}
        </p>{" "}
      </div>{" "}
      {/* Conflict Summary */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-lg">Summary</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="grid grid-cols-4 gap-4">
            {" "}
            <div>
              {" "}
              <div className="text-2xl font-bold text-foreground">
                {" "}
                {conflicts.length}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                Total Conflicts{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <div className="text-2xl font-bold text-red-500">
                {" "}
                {conflicts.filter((c) => c.severity === "high").length}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                High Severity
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <div className="text-2xl font-bold text-yellow-500">
                {" "}
                {conflicts.filter((c) => c.severity === "medium").length}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                Medium Severity{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <div className="text-2xl font-bold text-blue-500">
                {" "}
                {resolvedConflicts.size}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">Resolved</div>{" "}
            </div>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Conflicts List */}{" "}
      <div className="space-y-2">
        {" "}
        {conflicts.map((conflict) => {
          const isExpanded = expandedConflicts.has(conflict.conflictId);
          const isResolved = resolvedConflicts.has(conflict.conflictId);
          const resolution = resolvedConflicts.get(conflict.conflictId);
          return (
            <Card
              key={conflict.conflictId}
              className={cn(
                "transition-all border-l-4",
                isResolved
                  ? "border-l-green-500 bg-green-50/30"
                  : `border-l-orange-500 ${getSeverityBg(conflict.severity)}`,
              )}
            >
              {" "}
              <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-accent/20 transition-colors"
                onClick={() => toggleExpanded(conflict.conflictId)}
              >
                {" "}
                <div className="flex items-center gap-3 flex-1">
                  {" "}
                  {isResolved ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle
                      className={cn(
                        "w-5 h-5 flex-shrink-0",
                        getSeverityColor(conflict.severity),
                      )}
                    />
                  )}{" "}
                  <div className="flex-1">
                    {" "}
                    <h3 className="font-semibold text-foreground">
                      {" "}
                      {getConflictTypeLabel(conflict.conflictType)}{" "}
                    </h3>{" "}
                    <p className="text-sm text-muted-foreground">
                      {" "}
                      Element ID: {conflict.sourceElementId.substring(0, 12)}...
                      ({conflict.elementType}){" "}
                    </p>{" "}
                    {isResolved && (
                      <p className="text-xs text-green-600 mt-1">
                        {" "}
                        Resolved: {resolution?.resolution}{" "}
                      </p>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <span className="text-xs px-2 py-1 rounded-full bg-background border">
                    {" "}
                    {conflict.severity}{" "}
                  </span>{" "}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}{" "}
                </div>{" "}
              </div>{" "}
              {isExpanded && (
                <div className="border-t bg-background/50 p-4 space-y-4">
                  {" "}
                  {/* Conflict Details */}{" "}
                  <Tabs defaultValue="details" className="w-full">
                    {" "}
                    <TabsList className="grid w-full grid-cols-2">
                      {" "}
                      <TabsTrigger value="details">Details</TabsTrigger>{" "}
                      <TabsTrigger value="resolution">
                        Resolution
                      </TabsTrigger>{" "}
                    </TabsList>{" "}
                    <TabsContent value="details" className="space-y-3 mt-3">
                      {" "}
                      <div>
                        {" "}
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          {" "}
                          {sourceBranch.name} (Source){" "}
                        </h4>{" "}
                        <div className="bg-accent/30 p-2 rounded text-xs font-mono overflow-auto max-h-32">
                          {" "}
                          <pre>
                            {" "}
                            {JSON.stringify(
                              conflict.sourceBranchVersion,
                              null,
                              2,
                            )}{" "}
                          </pre>{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          {" "}
                          {targetBranch.name} (Target){" "}
                        </h4>{" "}
                        <div className="bg-accent/30 p-2 rounded text-xs font-mono overflow-auto max-h-32">
                          {" "}
                          <pre>
                            {" "}
                            {JSON.stringify(
                              conflict.targetBranchVersion,
                              null,
                              2,
                            )}{" "}
                          </pre>{" "}
                        </div>{" "}
                      </div>{" "}
                    </TabsContent>{" "}
                    <TabsContent value="resolution" className="space-y-3 mt-3">
                      {" "}
                      {isResolved ? (
                        <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
                          {" "}
                          <CheckCircle2 className="w-5 h-5 text-green-600" />{" "}
                          <span className="text-sm text-green-700">
                            {" "}
                            Resolved as:{""}{" "}
                            <span className="font-semibold">
                              {" "}
                              {resolution?.resolution}{" "}
                            </span>{" "}
                          </span>{" "}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {" "}
                          <p className="text-sm text-muted-foreground">
                            {" "}
                            Choose how to resolve this conflict:{" "}
                          </p>{" "}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() =>
                              resolveConflict(
                                conflict.conflictId,
                                "keep-source",
                              )
                            }
                          >
                            {" "}
                            <Zap className="w-4 h-4 mr-2" /> Keep{" "}
                            {sourceBranch.name} version{" "}
                          </Button>{" "}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() =>
                              resolveConflict(
                                conflict.conflictId,
                                "keep-target",
                              )
                            }
                          >
                            {" "}
                            <Zap className="w-4 h-4 mr-2" /> Keep{" "}
                            {targetBranch.name} version{" "}
                          </Button>{" "}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() =>
                              resolveConflict(conflict.conflictId, "merge")
                            }
                          >
                            {" "}
                            <Zap className="w-4 h-4 mr-2" /> Merge both
                            versions{" "}
                          </Button>{" "}
                        </div>
                      )}{" "}
                    </TabsContent>{" "}
                  </Tabs>{" "}
                </div>
              )}{" "}
            </Card>
          );
        })}{" "}
      </div>{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2 justify-end pt-4 border-t">
        {" "}
        <Button variant="outline" onClick={onCancel}>
          {" "}
          Cancel{" "}
        </Button>{" "}
        <Button
          onClick={handleResolveAll}
          disabled={!allResolved}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {" "}
          <CheckCircle2 className="w-4 h-4 mr-2" /> Merge (
          {resolvedConflicts.size}/{conflicts.length}){" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
};
export default ConflictResolutionUI;
