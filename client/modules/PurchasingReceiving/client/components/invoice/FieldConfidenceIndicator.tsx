import React from "react";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
export interface FieldConfidence {
  fieldName: string;
  value: string;
  confidence: number; // 0-1 validationStatus: 'valid' | 'suspicious' | 'invalid'; validationMessage?: string;
}
interface FieldConfidenceIndicatorProps {
  field: FieldConfidence;
  editable?: boolean;
  onEdit?: (newValue: string) => void;
}
export function FieldConfidenceIndicator({
  field,
  editable = false,
  onEdit,
}: FieldConfidenceIndicatorProps) {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.95) return "from-green-50 to-green-100";
    if (confidence >= 0.85) return "from-lime-50 to-lime-100";
    if (confidence >= 0.7) return "from-yellow-50 to-yellow-100";
    if (confidence >= 0.5) return "from-orange-50 to-orange-100";
    return "from-red-50 to-red-100";
  };
  const getStatusIcon = (status: string) => {
    if (status === "valid") {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (status === "suspicious") {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };
  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.95) return "Excellent";
    if (confidence >= 0.85) return "Good";
    if (confidence >= 0.7) return "Fair";
    if (confidence >= 0.5) return "Poor";
    return "Very Poor";
  };
  return (
    <Card
      className={`bg-gradient-to-r ${getConfidenceColor(field.confidence)}`}
    >
      {" "}
      <CardContent className="pt-4">
        {" "}
        <div className="space-y-3">
          {" "}
          {/* Field name and status */}{" "}
          <div className="flex items-center justify-between">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              {getStatusIcon(field.validationStatus)}{" "}
              <label className="text-sm font-medium text-foreground">
                {" "}
                {field.fieldName}{" "}
              </label>{" "}
            </div>{" "}
            <div className="flex items-center gap-2">
              {" "}
              <span className="text-sm font-semibold">
                {" "}
                {(field.confidence * 100).toFixed(1)}%{" "}
              </span>{" "}
              <span className="text-xs text-muted-foreground">
                {" "}
                {getConfidenceLabel(field.confidence)}{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Field value */}{" "}
          <div>
            {" "}
            {editable ? (
              <input
                type="text"
                defaultValue={field.value}
                onBlur={(e) => onEdit?.(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder={`Enter ${field.fieldName}`}
              />
            ) : (
              <p className="px-3 py-2 bg-background/50 rounded-md text-foreground break-words">
                {" "}
                {field.value || `No ${field.fieldName} detected`}{" "}
              </p>
            )}{" "}
          </div>{" "}
          {/* Validation message */}{" "}
          {field.validationMessage && (
            <p className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
              {" "}
              {field.validationMessage}{" "}
            </p>
          )}{" "}
          {/* Confidence bar */}{" "}
          <div className="space-y-1">
            {" "}
            <div className="w-full bg-background/30 rounded-full h-2 overflow-hidden">
              {" "}
              <div
                className={`h-full transition-all ${field.confidence >= 0.95 ? "bg-green-600" : field.confidence >= 0.85 ? "bg-lime-600" : field.confidence >= 0.7 ? "bg-yellow-600" : field.confidence >= 0.5 ? "bg-orange-600" : "bg-red-600"}`}
                style={{ width: `${field.confidence * 100}%` }}
              />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
} /** * Grid display of multiple field confidences */
export interface FieldConfidenceGridProps {
  fields: FieldConfidence[];
  onEdit?: (fieldName: string, newValue: string) => void;
}
export function FieldConfidenceGrid({
  fields,
  onEdit,
}: FieldConfidenceGridProps) {
  const overallConfidence =
    fields.length > 0
      ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
      : 0;
  return (
    <div className="space-y-6">
      {" "}
      {/* Overall score */}{" "}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4">
        {" "}
        <div className="flex items-center justify-between mb-2">
          {" "}
          <h3 className="font-semibold">Overall Extraction Confidence</h3>{" "}
          <span className="text-2xl font-bold">
            {" "}
            {(overallConfidence * 100).toFixed(1)}%{" "}
          </span>{" "}
        </div>{" "}
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          {" "}
          <div
            className={`h-full transition-all ${overallConfidence >= 0.95 ? "bg-green-600" : overallConfidence >= 0.85 ? "bg-lime-600" : overallConfidence >= 0.7 ? "bg-yellow-600" : overallConfidence >= 0.5 ? "bg-orange-600" : "bg-red-600"}`}
            style={{ width: `${overallConfidence * 100}%` }}
          />{" "}
        </div>{" "}
      </div>{" "}
      {/* Field grid */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {" "}
        {fields.map((field) => (
          <FieldConfidenceIndicator
            key={field.fieldName}
            field={field}
            editable={true}
            onEdit={(newValue) => onEdit?.(field.fieldName, newValue)}
          />
        ))}{" "}
      </div>{" "}
    </div>
  );
}
export default FieldConfidenceIndicator;
