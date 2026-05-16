import React, { useState, useEffect } from "react";
import { DataSourceEmbed } from "./types";
import {
  RefreshCw,
  X,
  AlertCircle,
  Loader,
  BarChart3,
  LineChart,
  PieChart,
  Table as TableIcon,
} from "lucide-react";
interface DataSourceEmbedComponentProps {
  embed: DataSourceEmbed;
  isSelected?: boolean;
  onUpdate?: (embed: Partial<DataSourceEmbed>) => void;
  onDelete?: (id: string) => void;
}
export const DataSourceEmbedComponent: React.FC<
  DataSourceEmbedComponentProps
> = ({ embed, isSelected = false, onUpdate, onDelete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [displayData, setDisplayData] = useState(embed.cachedData);
  useEffect(() => {
    if (embed.cachedData) {
      setDisplayData(embed.cachedData);
    }
  }, [embed.cachedData]);
  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/datasource/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embed }),
      });
      if (!response.ok) {
        throw new Error("Failed to sync data");
      }
      const updates = await response.json();
      onUpdate?.(updates);
      setDisplayData(updates.cachedData);
    } catch (error) {
      console.error("[DataSourceEmbed] Sync failed:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const getChartIcon = () => {
    switch (embed.chartType) {
      case "bar":
        return <BarChart3 className="w-4 h-4" />;
      case "line":
        return <LineChart className="w-4 h-4" />;
      case "pie":
        return <PieChart className="w-4 h-4" />;
      case "table":
        return <TableIcon className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };
  const renderTableData = () => {
    if (!displayData || !Array.isArray(displayData.rows)) {
      return null;
    }
    const rows = displayData.rows.slice(0, 10);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return (
      <div className="overflow-x-auto">
        {" "}
        <table className="w-full text-xs border-collapse">
          {" "}
          <thead>
            {" "}
            <tr className="bg-surface border-b">
              {" "}
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-2 py-1 text-left font-semibold text-foreground"
                >
                  {" "}
                  {col}{" "}
                </th>
              ))}{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody>
            {" "}
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-surface">
                {" "}
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-2 py-1 text-muted-foreground truncate"
                  >
                    {" "}
                    {String(row[col] || "")}{" "}
                  </td>
                ))}{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>
    );
  };
  const renderPlaceholderChart = () => {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50">
        {" "}
        <div className="text-center">
          {" "}
          {getChartIcon()}{" "}
          <p className="text-xs text-muted-foreground mt-2">
            {" "}
            {embed.chartType.toUpperCase()}{" "}
          </p>{" "}
          {displayData && (
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {Array.isArray(displayData.rows) ? displayData.rows.length : 1}
              {""} rows{" "}
            </p>
          )}{" "}
        </div>{" "}
      </div>
    );
  };
  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 transition-all bg-background flex flex-col ${isSelected ? "border-blue-500 shadow-lg" : "border-border"}`}
      style={{ width: `${embed.width}px`, height: `${embed.height}px` }}
    >
      {" "}
      {/* Header */}{" "}
      <div className="border-b border-gray-200 p-3 flex items-center justify-between">
        {" "}
        <div className="flex-1 min-w-0">
          {" "}
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {" "}
            {embed.sourceName}{" "}
          </h3>{" "}
          <p className="text-xs text-muted-foreground">
            {embed.sourceType}
          </p>{" "}
        </div>{" "}
        {isSelected && (
          <div className="flex gap-2 ml-2">
            {" "}
            <button
              onClick={handleSync}
              disabled={isLoading}
              className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              {" "}
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}{" "}
            </button>{" "}
            <button
              onClick={() => onDelete?.(embed.id)}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Delete"
            >
              {" "}
              <X className="w-4 h-4 text-red-500" />{" "}
            </button>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-auto">
        {" "}
        {embed.errorMessage ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            {" "}
            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />{" "}
            <p className="text-xs text-red-600">{embed.errorMessage}</p>{" "}
          </div>
        ) : !displayData ? (
          <div className="flex items-center justify-center h-full">
            {" "}
            <Loader className="w-6 h-6 animate-spin text-gray-400" />{" "}
          </div>
        ) : embed.chartType === "table" ? (
          renderTableData()
        ) : (
          renderPlaceholderChart()
        )}{" "}
      </div>{" "}
      {/* Footer */}{" "}
      {embed.lastSyncedAt && (
        <div className="border-t border-gray-200 px-3 py-2 bg-surface text-xs text-muted-foreground">
          {" "}
          Last synced {new Date(embed.lastSyncedAt).toLocaleTimeString()}{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default DataSourceEmbedComponent;
