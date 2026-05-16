import React from "react";
import { useMaestroStore } from "@/stores/useMaestroStore";

export const FilterBar: React.FC = () => {
  const {
    statusFilter,
    setStatusFilter,
    dateRangeStart,
    dateRangeEnd,
    setDateRange,
    clearFilters,
  } = useMaestroStore();

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-2 py-2 bg-surface border border-border rounded text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_production">In Production</option>
          <option value="executed">Executed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Date From
        </label>
        <input
          type="date"
          value={dateRangeStart || ""}
          onChange={(e) => setDateRange(e.target.value || null, dateRangeEnd)}
          className="w-full px-2 py-2 bg-surface border border-border rounded text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Date To
        </label>
        <input
          type="date"
          value={dateRangeEnd || ""}
          onChange={(e) => setDateRange(dateRangeStart, e.target.value || null)}
          className="w-full px-2 py-2 bg-surface border border-border rounded text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <button
        onClick={clearFilters}
        className="w-full px-3 py-2 text-xs font-medium text-muted-foreground bg-surface hover:bg-muted border border-border rounded transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );
};
