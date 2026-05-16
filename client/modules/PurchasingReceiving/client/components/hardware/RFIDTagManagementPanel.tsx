import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useRFIDTags,
  useTagProductAssignments,
  useHighValueTags,
} from "@/hooks/useRFIDTags";
import { AlertTriangle, Tag, BarChart3, Shield } from "lucide-react";
interface RFIDTagManagementPanelProps {
  organizationId: string;
  outletId?: string;
}
export function RFIDTagManagementPanel({
  organizationId,
  outletId,
}: RFIDTagManagementPanelProps) {
  const { tags, summary: tagsSummary } = useRFIDTags({
    organizationId,
    status: "active",
    autoRefresh: true,
    refreshInterval: 300,
  });
  const { assignments, summary: assignmentsSummary } = useTagProductAssignments(
    {
      organizationId,
      outletId,
      highValueOnly: false,
      autoRefresh: true,
      refreshInterval: 300,
    },
  );
  const { tags: highValueTags } = useHighValueTags({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 60,
  });
  const [showHighValueOnly, setShowHighValueOnly] = useState(false);
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <Tag className="w-4 h-4" /> Total Tags{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{tagsSummary.total}</div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              {tagsSummary.active} active
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <Shield className="w-4 h-4" /> High-Value Items{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {assignmentsSummary.highValue}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              tracked items
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <BarChart3 className="w-4 h-4" /> Spoilage Tracking{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {assignmentsSummary.trackingSpoilage}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              products monitored
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <AlertTriangle className="w-4 h-4" /> Lost Items{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {tagsSummary.lost}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              missing tags
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Tab Toggle */}{" "}
      <div className="flex gap-2">
        {" "}
        <Button
          variant={!showHighValueOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowHighValueOnly(false)}
        >
          {" "}
          All Tags ({assignments.length}){" "}
        </Button>{" "}
        <Button
          variant={showHighValueOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowHighValueOnly(true)}
        >
          {" "}
          High-Value ({highValueTags.length}){" "}
        </Button>{" "}
      </div>{" "}
      {/* Tags List */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Tag Assignments</CardTitle>{" "}
          <CardDescription>
            {" "}
            {showHighValueOnly
              ? "High-value items being tracked for theft prevention"
              : "All product tags and their assignments"}{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {(showHighValueOnly ? highValueTags : assignments).length === 0 ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              {" "}
              {showHighValueOnly
                ? "No high-value tags found"
                : "No tag assignments found"}{" "}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {" "}
              {(showHighValueOnly ? highValueTags : assignments).map(
                (item: any) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg hover:bg-surface"
                  >
                    {" "}
                    <div className="flex items-start justify-between">
                      {" "}
                      <div className="flex-1">
                        {" "}
                        <div className="font-medium">
                          {item.product_name || "Unknown Product"}
                        </div>{" "}
                        <div className="text-sm text-muted-foreground mt-1">
                          {" "}
                          <div>
                            Tag: {item.epc || item.tag_id?.substring(0, 8)}
                          </div>{" "}
                          {item.zone && <div>Zone: {item.zone}</div>}{" "}
                        </div>{" "}
                        <div className="flex gap-2 mt-2">
                          {" "}
                          {item.high_value && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              High Value
                            </Badge>
                          )}{" "}
                          {item.track_spoilage && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              Spoilage
                            </Badge>
                          )}{" "}
                          {item.track_movement && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Movement
                            </Badge>
                          )}{" "}
                        </div>{" "}
                      </div>{" "}
                      {item.signal_strength && (
                        <div className="text-right text-sm">
                          {" "}
                          <div className="text-muted-foreground">
                            Signal: {item.signal_strength}
                          </div>{" "}
                          {item.read_at && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {" "}
                              {new Date(item.read_at).toLocaleTimeString()}{" "}
                            </div>
                          )}{" "}
                        </div>
                      )}{" "}
                    </div>{" "}
                  </div>
                ),
              )}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* High-Value Security Info */}{" "}
      {!showHighValueOnly && assignmentsSummary.highValue > 0 && (
        <Card className="border-red-200 bg-red-50">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2 text-red-900">
              {" "}
              <Shield className="w-5 h-5" /> High-Value Items Security{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <p className="text-sm text-red-800 mb-3">
              {" "}
              {assignmentsSummary.highValue} high-value items are being
              monitored for theft prevention. Any unauthorized movements or
              removals will trigger alerts.{" "}
            </p>{" "}
            <Button variant="outline" size="sm">
              {" "}
              View Security Rules{" "}
            </Button>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
