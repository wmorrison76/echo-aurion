/**
 * Semantic layer types for analytics and report builder
 * Best-in-class: unified dimensions and measures across modules
 */

export type EntityId = string;

export interface SemanticEntity {
  id: EntityId;
  name: string;
  type: "Outlet" | "Department" | "Metric" | "TimeRange" | "Category";
  attributes?: Record<string, string | number>;
}

export interface SemanticDimension {
  id: string;
  entityType: SemanticEntity["type"];
  name: string;
  field: string;
  dataType: "string" | "number" | "date";
}

export interface SemanticMeasure {
  id: string;
  name: string;
  expression: string;
  format?: "currency" | "percent" | "number";
}

export interface SemanticQuery {
  dimensions: string[];
  measures: string[];
  filters?: { dimension: string; op: string; value: unknown }[];
  timeRange?: { start: string; end: string };
  granularity?: "hour" | "day" | "week" | "month";
}

export interface ReportDefinition {
  id: string;
  name: string;
  query: SemanticQuery;
  schedule?: "none" | "daily" | "weekly" | "monthly";
  delivery?: "email" | "in_app";
}
