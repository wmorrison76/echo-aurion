import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  Download,
  Clock,
  Columns3,
} from "lucide-react";
interface ReportColumn {
  id: string;
  name: string;
  type: "currency" | "percentage" | "text" | "number" | "date";
  accountCode?: string;
}
interface ReportFilter {
  id: string;
  field: string;
  operator: "=" | ">" | "<" | "between" | "contains";
  value: string;
}
interface CustomReport {
  id?: string;
  name: string;
  description: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  sortBy?: string;
  scheduleFrequency?: "once" | "daily" | "weekly" | "monthly";
}
interface CustomReportBuilderProps {
  entityId: string;
  onSave?: (report: CustomReport) => void;
}
export function CustomReportBuilder({
  entityId,
  onSave,
}: CustomReportBuilderProps) {
  const [report, setReport] = useState<CustomReport>({
    name: "",
    description: "",
    columns: [
      { id: "col_1", name: "Account", type: "text" },
      { id: "col_2", name: "Amount", type: "currency" },
    ],
    filters: [],
    scheduleFrequency: "once",
  });
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const handleAddColumn = () => {
    const newColumn: ReportColumn = {
      id: `col_${Date.now()}`,
      name: "New Column",
      type: "text",
    };
    setReport({ ...report, columns: [...report.columns, newColumn] });
  };
  const handleRemoveColumn = (columnId: string) => {
    setReport({
      ...report,
      columns: report.columns.filter((col) => col.id !== columnId),
    });
  };
  const handleUpdateColumn = (
    columnId: string,
    updates: Partial<ReportColumn>,
  ) => {
    setReport({
      ...report,
      columns: report.columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col,
      ),
    });
  };
  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}`,
      field: "",
      operator: "=",
      value: "",
    };
    setReport({ ...report, filters: [...report.filters, newFilter] });
  };
  const handleRemoveFilter = (filterId: string) => {
    setReport({
      ...report,
      filters: report.filters.filter((f) => f.id !== filterId),
    });
  };
  const handleUpdateFilter = (
    filterId: string,
    updates: Partial<ReportFilter>,
  ) => {
    setReport({
      ...report,
      filters: report.filters.map((f) =>
        f.id === filterId ? { ...f, ...updates } : f,
      ),
    });
  };
  const handleDragStart = (columnId: string) => {
    setDraggedColumnId(columnId);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (targetColumnId: string) => {
    if (!draggedColumnId || draggedColumnId === targetColumnId) return;
    const draggedIndex = report.columns.findIndex(
      (c) => c.id === draggedColumnId,
    );
    const targetIndex = report.columns.findIndex(
      (c) => c.id === targetColumnId,
    );
    const newColumns = [...report.columns];
    [newColumns[draggedIndex], newColumns[targetIndex]] = [
      newColumns[targetIndex],
      newColumns[draggedIndex],
    ];
    setReport({ ...report, columns: newColumns });
    setDraggedColumnId(null);
  };
  const handleSave = () => {
    if (!report.name.trim()) {
      alert("Please enter a report name");
      return;
    }
    onSave?.(report);
  };
  return (
    <div className="space-y-6">
      {" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-lg sm:text-xl">
            {" "}
            Report Configuration{" "}
          </CardTitle>{" "}
          <CardDescription>
            {" "}
            Create custom GL reports with drag-and-drop columns{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-6">
          {" "}
          {/* Basic Info */}{" "}
          <div className="space-y-3">
            {" "}
            <div>
              {" "}
              <label className="text-sm font-medium mb-2 block">
                {" "}
                Report Name{" "}
              </label>{" "}
              <Input
                value={report.name}
                onChange={(e) => setReport({ ...report, name: e.target.value })}
                placeholder="e.g., Monthly Revenue Summary"
                className="text-sm"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-sm font-medium mb-2 block">
                {" "}
                Description{" "}
              </label>{" "}
              <Textarea
                value={report.description}
                onChange={(e) =>
                  setReport({ ...report, description: e.target.value })
                }
                placeholder="Optional description of this report..."
                className="h-16 text-sm"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-sm font-medium mb-2 block">
                Schedule
              </label>{" "}
              <Select
                value={report.scheduleFrequency || "once"}
                onValueChange={(val) =>
                  setReport({ ...report, scheduleFrequency: val as any })
                }
              >
                {" "}
                <SelectTrigger className="text-sm">
                  {" "}
                  <SelectValue />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  <SelectItem value="once">One-time</SelectItem>{" "}
                  <SelectItem value="daily">Daily</SelectItem>{" "}
                  <SelectItem value="weekly">Weekly</SelectItem>{" "}
                  <SelectItem value="monthly">Monthly</SelectItem>{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
          </div>{" "}
          {/* Columns */}{" "}
          <div className="border-t pt-4">
            {" "}
            <div className="flex items-center justify-between mb-3">
              {" "}
              <h3 className="font-medium text-sm">Report Columns</h3>{" "}
              <Button
                onClick={handleAddColumn}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                {" "}
                <Plus className="w-3 h-3 mr-1" /> Add Column{" "}
              </Button>{" "}
            </div>{" "}
            <div className="space-y-2 bg-surface dark:bg-gray-900 rounded-lg p-3">
              {" "}
              {report.columns.map((column) => (
                <div
                  key={column.id}
                  draggable
                  onDragStart={() => handleDragStart(column.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(column.id)}
                  className="bg-background dark:bg-gray-800 rounded border p-2 flex items-center gap-2 cursor-move hover:shadow-sm transition-shadow"
                >
                  {" "}
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />{" "}
                  <Input
                    value={column.name}
                    onChange={(e) =>
                      handleUpdateColumn(column.id, { name: e.target.value })
                    }
                    placeholder="Column name"
                    className="h-8 text-xs flex-1"
                  />{" "}
                  <Select
                    value={column.type}
                    onValueChange={(val) =>
                      handleUpdateColumn(column.id, { type: val as any })
                    }
                  >
                    {" "}
                    <SelectTrigger className="w-24 h-8 text-xs">
                      {" "}
                      <SelectValue />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="text">Text</SelectItem>{" "}
                      <SelectItem value="currency">Currency</SelectItem>{" "}
                      <SelectItem value="percentage">Percentage</SelectItem>{" "}
                      <SelectItem value="number">Number</SelectItem>{" "}
                      <SelectItem value="date">Date</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                  <Button
                    onClick={() => handleRemoveColumn(column.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {" "}
                    <Trash2 className="w-4 h-4 text-red-600" />{" "}
                  </Button>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Filters */}{" "}
          <div className="border-t pt-4">
            {" "}
            <div className="flex items-center justify-between mb-3">
              {" "}
              <h3 className="font-medium text-sm">Filters</h3>{" "}
              <Button
                onClick={handleAddFilter}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                {" "}
                <Plus className="w-3 h-3 mr-1" /> Add Filter{" "}
              </Button>{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              {report.filters.map((filter) => (
                <div
                  key={filter.id}
                  className="bg-surface dark:bg-gray-900 rounded p-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
                >
                  {" "}
                  <Input
                    value={filter.field}
                    onChange={(e) =>
                      handleUpdateFilter(filter.id, { field: e.target.value })
                    }
                    placeholder="Field"
                    className="h-8 text-xs flex-1 sm:flex-none sm:w-24"
                  />{" "}
                  <Select
                    value={filter.operator}
                    onValueChange={(val) =>
                      handleUpdateFilter(filter.id, { operator: val as any })
                    }
                  >
                    {" "}
                    <SelectTrigger className="h-8 text-xs w-full sm:w-20">
                      {" "}
                      <SelectValue />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="=">=</SelectItem>{" "}
                      <SelectItem value=">">&gt;</SelectItem>{" "}
                      <SelectItem value="<">&lt;</SelectItem>{" "}
                      <SelectItem value="between">Between</SelectItem>{" "}
                      <SelectItem value="contains">Contains</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                  <Input
                    value={filter.value}
                    onChange={(e) =>
                      handleUpdateFilter(filter.id, { value: e.target.value })
                    }
                    placeholder="Value"
                    className="h-8 text-xs flex-1"
                  />{" "}
                  <Button
                    onClick={() => handleRemoveFilter(filter.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {" "}
                    <Trash2 className="w-4 h-4 text-red-600" />{" "}
                  </Button>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Actions */}{" "}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            {" "}
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="text-xs sm:text-sm flex-1 sm:flex-none h-9 sm:h-10"
            >
              {" "}
              <Eye className="w-4 h-4 mr-2" />{" "}
              {showPreview ? "Hide Preview" : "Preview"}{" "}
            </Button>{" "}
            <Button
              variant="outline"
              className="text-xs sm:text-sm flex-1 sm:flex-none h-9 sm:h-10"
            >
              {" "}
              <Download className="w-4 h-4 mr-2" /> Export{" "}
            </Button>{" "}
            <Button
              onClick={handleSave}
              className="text-xs sm:text-sm flex-1 h-9 sm:h-10"
            >
              {" "}
              <Columns3 className="w-4 h-4 mr-2" /> Save Report{" "}
            </Button>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Preview */}{" "}
      {showPreview && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-sm sm:text-base">Preview</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="overflow-x-auto">
              {" "}
              <table className="w-full text-xs sm:text-sm">
                {" "}
                <thead className="bg-surface dark:bg-gray-800">
                  {" "}
                  <tr>
                    {" "}
                    {report.columns.map((col) => (
                      <th
                        key={col.id}
                        className="px-2 py-2 text-left font-medium text-foreground dark:text-gray-300"
                      >
                        {" "}
                        {col.name}{" "}
                      </th>
                    ))}{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  <tr className="border-t">
                    {" "}
                    {report.columns.map((col) => (
                      <td
                        key={col.id}
                        className="px-2 py-2 text-muted-foreground"
                      >
                        {" "}
                        [Sample Data]{" "}
                      </td>
                    ))}{" "}
                  </tr>{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
