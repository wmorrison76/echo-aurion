/** * WCAG AA Compliant Component Primitives * Extends base UI components with enhanced accessibility */ import React from "react";
import { cn } from "@/lib/utils";
import {
  useFocusTrap,
  useAriaLive,
} from "@/lib/accessibility"; /** * Skip to main content link - must be first focusable element */
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className={cn(
        "absolute left-0 top-0 z-[100]",
        "px-4 py-2 text-sm font-medium",
        "text-white bg-black",
        "-translate-x-full focus:translate-x-0",
        "transition-transform duration-200",
      )}
      onClick={(e) => {
        e.preventDefault();
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView({ behavior: "smooth" });
        }
      }}
    >
      {" "}
      Skip to main content{" "}
    </a>
  );
} /** * Accessible modal dialog wrapper * Handles focus trapping and ARIA attributes */
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}
export const AccessibleModal = React.forwardRef<
  HTMLDivElement,
  AccessibleModalProps
>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      ariaLabelledBy,
      ariaDescribedBy,
    },
    ref,
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    useFocusTrap(containerRef);
    React.useEffect(() => {
      if (!isOpen) return;
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="presentation"
        onClick={onClose}
      >
        {" "}
        <div
          ref={containerRef}
          className="relative w-full max-w-lg rounded-lg bg-background p-6 shadow-lg dark:bg-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy || "modal-title"}
          aria-describedby={ariaDescribedBy}
          onClick={(e) => e.stopPropagation()}
        >
          {" "}
          <h2 id="modal-title" className="text-lg font-semibold mb-4">
            {" "}
            {title}{" "}
          </h2>{" "}
          {description && (
            <p id="modal-description" className="text-sm text-foreground mb-4">
              {" "}
              {description}{" "}
            </p>
          )}{" "}
          <div>{children}</div>{" "}
          <button
            onClick={onClose}
            className={cn(
              "absolute right-4 top-4",
              "inline-flex items-center justify-center",
              "h-8 w-8 rounded-md",
              "text-foreground hover:text-foreground dark:hover:text-slate-300",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "transition-colors duration-200",
            )}
            aria-label="Close dialog"
          >
            {" "}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />{" "}
            </svg>{" "}
          </button>{" "}
        </div>{" "}
      </div>
    );
  },
);
AccessibleModal.displayName =
  "AccessibleModal"; /** * Accessible button with enhanced keyboard support */
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "secondary"
    | "ghost"
    | "outline"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
}
export const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      className,
      variant = "default",
      size = "default",
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      ...props
    },
    ref,
  ) => {
    const baseStyles = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
      "font-medium transition-colors duration-200",
      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "text-sm",
    );
    const variantStyles = {
      default:
        "bg-primary text-white hover:opacity-90 dark:bg-blue-700 dark:hover:bg-blue-800",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
      secondary:
        "bg-slate-200 text-foreground hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600",
      ghost: "hover:bg-slate-100 dark:hover:bg-slate-800",
      outline:
        "border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-surface",
      link: "text-primary underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-primary",
    };
    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-sm",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    };
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        {...props}
      />
    );
  },
);
AccessibleButton.displayName =
  "AccessibleButton"; /** * Accessible form input with label and error message */
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}
export const AccessibleInput = React.forwardRef<
  HTMLInputElement,
  AccessibleInputProps
>(({ label, error, hint, required, id, className, ...props }, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  return (
    <div className="w-full space-y-2">
      {" "}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground dark:text-white"
        >
          {" "}
          {label}{" "}
          {required && (
            <span className="text-red-600 ml-1" aria-label="required">
              {" "}
              *{" "}
            </span>
          )}{" "}
        </label>
      )}{" "}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "w-full px-3 py-2 rounded-md border",
          "text-sm transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-red-500 bg-red-50 dark:bg-red-950"
            : "border-slate-300 dark:border-slate-600 bg-background dark:bg-card",
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        required={required}
        {...props}
      />{" "}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {" "}
          {hint}{" "}
        </p>
      )}{" "}
      {error && (
        <p
          id={errorId}
          className="text-xs font-medium text-red-600 dark:text-red-400"
          role="alert"
        >
          {" "}
          {error}{" "}
        </p>
      )}{" "}
    </div>
  );
});
AccessibleInput.displayName =
  "AccessibleInput"; /** * Accessible form select with label and error message */
interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  required?: boolean;
}
export const AccessibleSelect = React.forwardRef<
  HTMLSelectElement,
  AccessibleSelectProps
>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      required,
      id,
      className,
      ...props
    },
    ref,
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;
    return (
      <div className="w-full space-y-2">
        {" "}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground dark:text-white"
          >
            {" "}
            {label}{" "}
            {required && (
              <span className="text-red-600 ml-1" aria-label="required">
                {" "}
                *{" "}
              </span>
            )}{" "}
          </label>
        )}{" "}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full px-3 py-2 rounded-md border",
            "text-sm transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-red-500 bg-red-50 dark:bg-red-950"
              : "border-slate-300 dark:border-slate-600 bg-background dark:bg-card",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          required={required}
          {...props}
        >
          {" "}
          {placeholder && <option value="">{placeholder}</option>}{" "}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {" "}
              {option.label}{" "}
            </option>
          ))}{" "}
        </select>{" "}
        {hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {" "}
            {hint}{" "}
          </p>
        )}{" "}
        {error && (
          <p
            id={errorId}
            className="text-xs font-medium text-red-600 dark:text-red-400"
            role="alert"
          >
            {" "}
            {error}{" "}
          </p>
        )}{" "}
      </div>
    );
  },
);
AccessibleSelect.displayName =
  "AccessibleSelect"; /** * ARIA live region for announcements */
interface AriaLiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
}
export function AriaLiveRegion({
  message,
  politeness = "polite",
}: AriaLiveRegionProps) {
  return (
    <div aria-live={politeness} aria-atomic="true" className="sr-only">
      {" "}
      {message}{" "}
    </div>
  );
}
