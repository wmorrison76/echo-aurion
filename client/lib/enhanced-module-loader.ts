/**
 * Enhanced Module Loader with Comprehensive Diagnostics
 * Wraps module loading with detailed error tracking and reporting
 */

import type { ComponentType } from "react";

export interface ModuleLoadResult {
  success: boolean;
  module?: { default: ComponentType<any> };
  error?: Error;
  duration: number;
  moduleKey: string;
  importPath?: string;
  timestamp: number;
}

/**
 * Enhanced module loader with diagnostics
 * CRITICAL: Kept minimal to avoid blocking module loads
 */
export async function loadModuleWithDiagnostics(
  moduleKey: string,
  importFn: () => Promise<{ default: ComponentType<any> }>,
): Promise<ModuleLoadResult> {
  const startTime = Date.now();
  const timestamp = Date.now();

  try {
    // Attempt to load the module
    const module = await importFn();
    const duration = Date.now() - startTime;

    // Validate module structure
    if (!module || !module.default) {
      throw new Error(
        `Module "${moduleKey}" did not export a default component. Module exports: ${Object.keys(module || {}).join(", ")}`,
      );
    }

    return {
      success: true,
      module,
      duration,
      moduleKey,
      timestamp,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Log error asynchronously to avoid blocking
    if (duration > 1000) {
      // Only log if load was slow
      console.warn(`[MODULE-LOADER] Slow load for "${moduleKey}": ${duration}ms`);
    }

    return {
      success: false,
      error: errorObj,
      duration,
      moduleKey,
      timestamp,
    };
  }
}

/**
 * Create a diagnostic-aware module loader function
 */
export function createDiagnosticModuleLoader(
  moduleKey: string,
  importFn: () => Promise<{ default: ComponentType<any> }>,
): () => Promise<{ default: ComponentType<any> }> {
  return async () => {
    const result = await loadModuleWithDiagnostics(moduleKey, importFn);

    if (result.success && result.module) {
      return result.module;
    }

    // Return error component
    const React = await import("react");
    const ErrorComponent = React.createElement(
      "div",
      {
        className: "p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded",
        style: {
          minHeight: "400px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        },
      },
      React.createElement(
        "h3",
        { className: "font-semibold text-red-900 dark:text-red-300 mb-2 text-lg" },
        "❌ Module Load Failed",
      ),
      React.createElement(
        "p",
        { className: "text-red-800 dark:text-red-200 text-sm mb-2" },
        `Failed to load module: "${moduleKey}"`,
      ),
      result.error && React.createElement(
        "p",
        { className: "text-red-700 dark:text-red-300 text-xs mb-4 font-mono" },
        `Error: ${result.error.message}`,
      ),
      result.importPath && React.createElement(
        "p",
        { className: "text-red-700 dark:text-red-300 text-xs mb-4 font-mono break-all" },
        `Import Path: ${result.importPath}`,
      ),
      React.createElement(
        "div",
        { className: "mt-4 space-y-2 text-xs" },
        React.createElement(
          "p",
          { className: "text-red-700 dark:text-red-300 font-semibold" },
          "🔍 Diagnostic Commands (Browser Console):",
        ),
        React.createElement(
          "code",
          { className: "block bg-red-200 dark:bg-red-900/50 p-2 rounded font-mono" },
          `getModuleDiagnostics()`
        ),
        React.createElement(
          "code",
          { className: "block bg-red-200 dark:bg-red-900/50 p-2 rounded font-mono" },
          `moduleDiagnostics.getErrorsForModule('${moduleKey}')`
        ),
      ),
      React.createElement(
        "button",
        {
          onClick: () => {
            if (typeof window !== "undefined") {
              console.group(`🔴 Module Load Error: ${moduleKey}`);
              console.error("Result:", result);
              if ((window as any).moduleDiagnostics) {
                console.log("All Errors:", (window as any).moduleDiagnostics.getAllErrors());
                console.log("Report:", (window as any).moduleDiagnostics.generateReport());
              }
              console.groupEnd();
            }
          },
          className: "mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors",
        },
        "📊 Show Full Diagnostics"
      ),
    );

    return { default: () => ErrorComponent };
  };
}
