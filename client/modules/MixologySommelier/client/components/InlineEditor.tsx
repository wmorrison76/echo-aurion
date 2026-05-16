import React, { useEffect, useRef, useState } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditorProps {
  value: string | number;
  onSave: (value: string | number) => Promise<void> | void;
  type?: "text" | "number" | "currency";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  parse?: (value: string) => number;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  value,
  onSave,
  type = "text",
  placeholder,
  className,
  disabled = false,
  min,
  max,
  step,
  format,
  parse,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setEditValue(String(value));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalValue =
        type === "number" && parse
          ? parse(editValue)
          : type === "number"
            ? Number(editValue)
            : editValue;

      if (type === "number") {
        const numValue = Number(finalValue);
        if (min !== undefined && numValue < min) {
          throw new Error(`Value must be at least ${min}`);
        }
        if (max !== undefined && numValue > max) {
          throw new Error(`Value must be at most ${max}`);
        }
      }

      await onSave(finalValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const displayValue =
    isEditing || type !== "currency" || typeof value !== "number"
      ? String(value)
      : format
        ? format(value)
        : String(value);

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <input
          ref={inputRef}
          type={type === "currency" ? "number" : type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="h-8 rounded border px-2 text-sm"
        />
        <button onClick={handleSave} disabled={isSaving} aria-label="Save">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={handleCancel} aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      disabled={disabled}
      className={cn("inline-flex items-center gap-1 text-left", className)}
    >
      <span>{displayValue || placeholder || ""}</span>
      {!disabled && <Edit2 className="h-3.5 w-3.5 opacity-60" />}
    </button>
  );
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
};
