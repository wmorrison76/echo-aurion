import { lazy, Suspense, memo } from "react";
import { Loader2 } from "lucide-react";

// Lazy load Monaco editor to reduce initial bundle
const MonacoEditorComponent = lazy(() =>
  import("./MonacoCodeEditor").then((module) => ({
    default: module.MonacoCodeEditor,
  }))
);

interface LazyMonacoEditorProps {
  path: string;
  content: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  height?: string | number;
  className?: string;
}

/**
 * Lazy-loaded Monaco editor with loading fallback
 * Reduces initial bundle by ~500KB by code-splitting Monaco
 */
export const LazyMonacoEditor = memo(function LazyMonacoEditor({
  path,
  content,
  language = "typescript",
  readOnly = false,
  onChange,
  height = "400px",
  className = "",
}: LazyMonacoEditorProps) {
  return (
    <Suspense
      fallback={
        <div
          className={`flex items-center justify-center bg-muted/30 rounded-lg ${className}`}
          style={{ height }}
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading editor...</p>
          </div>
        </div>
      }
    >
      <MonacoEditorComponent
        path={path}
        content={content}
        language={language}
        readOnly={readOnly}
        onChange={onChange}
        height={height}
        className={className}
      />
    </Suspense>
  );
});

LazyMonacoEditor.displayName = "LazyMonacoEditor";

export default LazyMonacoEditor;
