/**
 * Auto Error Fixer
 * Automatically detects and fixes common module loading errors
 */

import { moduleLoadDiagnostics } from "./module-load-diagnostics";

export interface ErrorFix {
  errorPattern: RegExp | string;
  fix: (error: Error, moduleKey: string, context?: any) => Promise<boolean>;
  description: string;
  priority: number; // Higher = more critical
}

class AutoErrorFixer {
  private fixes: ErrorFix[] = [];
  private fixedErrors: Map<string, number> = new Map(); // Track fixes applied

  constructor() {
    this.registerFixes();
  }

  /**
   * Register all known error fixes
   */
  private registerFixes() {
    // Fix 1: Missing import path (Failed to resolve import)
    this.registerFix({
      errorPattern: /Failed to resolve import ["']([^"']+)["']/,
      description: "Failed to resolve import - check if file exists or path is correct",
      priority: 10,
      fix: async (error, moduleKey, context) => {
        const match = error.message.match(/Failed to resolve import ["']([^"']+)["']/);
        if (!match) return false;

        const importPath = match[1];
        console.log(`[AUTO-FIX] Detected missing import: ${importPath} for module: ${moduleKey}`);

        // Log the issue for manual fixing (automatic file creation is risky)
        console.warn(`[AUTO-FIX] Cannot auto-fix: Missing file ${importPath}`);
        console.warn(`[AUTO-FIX] Manual fix required: Create file or fix import path`);

        return false; // Cannot auto-fix missing files
      },
    });

    // Fix 2: Syntax errors in module files
    this.registerFix({
      errorPattern: /SyntaxError|Unexpected token|Expected/,
      description: "Syntax error in module file",
      priority: 9,
      fix: async (error, moduleKey, context) => {
        console.log(`[AUTO-FIX] Detected syntax error in module: ${moduleKey}`);
        console.warn(`[AUTO-FIX] Syntax errors require manual code review`);
        return false; // Cannot auto-fix syntax errors safely
      },
    });

    // Fix 3: Context provider missing (useContext errors)
    this.registerFix({
      errorPattern: /Cannot read properties of null.*useContext|useContext.*is null/,
      description: "Missing context provider",
      priority: 8,
      fix: async (error, moduleKey, context) => {
        console.log(`[AUTO-FIX] Detected missing context provider in module: ${moduleKey}`);
        console.warn(`[AUTO-FIX] Context provider errors require manual wrapper fixes`);
        return false; // Context providers need manual setup
      },
    });

    // Fix 4: Module export issues
    this.registerFix({
      errorPattern: /does not provide an export|has no exported member/,
      description: "Module export issue",
      priority: 7,
      fix: async (error, moduleKey, context) => {
        console.log(`[AUTO-FIX] Detected export issue in module: ${moduleKey}`);
        console.warn(`[AUTO-FIX] Export issues require manual code review`);
        return false;
      },
    });

    // Fix 5: Network/fetch errors (might be temporary)
    this.registerFix({
      errorPattern: /Failed to fetch|NetworkError|404|500|504/,
      description: "Network/fetch error (may be temporary)",
      priority: 5,
      fix: async (error, moduleKey, context) => {
        console.log(`[AUTO-FIX] Detected network error for module: ${moduleKey}`);
        console.warn(`[AUTO-FIX] Network errors may be temporary - check dev server`);
        return false; // Network issues need manual intervention
      },
    });
  }

  /**
   * Register a fix pattern
   */
  registerFix(fix: ErrorFix) {
    this.fixes.push(fix);
    // Sort by priority (highest first)
    this.fixes.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Attempt to fix an error
   */
  async attemptFix(error: Error, moduleKey: string, context?: any): Promise<boolean> {
    const errorKey = `${moduleKey}:${error.message}`;
    
    // Don't retry fixes that already failed
    if (this.fixedErrors.has(errorKey)) {
      const attempts = this.fixedErrors.get(errorKey)!;
      if (attempts >= 3) {
        console.debug(`[AUTO-FIX] Skipping fix attempt for ${errorKey} (already tried ${attempts} times)`);
        return false;
      }
    }

    // Try each fix in priority order
    for (const fix of this.fixes) {
      const matches =
        typeof fix.errorPattern === "string"
          ? error.message.includes(fix.errorPattern)
          : fix.errorPattern.test(error.message);

      if (matches) {
        console.log(`[AUTO-FIX] Attempting fix: ${fix.description}`);
        try {
          const fixed = await fix.fix(error, moduleKey, context);
          if (fixed) {
            console.log(`✅ [AUTO-FIX] Successfully fixed: ${fix.description}`);
            this.fixedErrors.delete(errorKey); // Clear failure count on success
            return true;
          } else {
            // Track failed attempts
            const attempts = this.fixedErrors.get(errorKey) || 0;
            this.fixedErrors.set(errorKey, attempts + 1);
          }
        } catch (fixError) {
          console.error(`[AUTO-FIX] Fix failed:`, fixError);
          const attempts = this.fixedErrors.get(errorKey) || 0;
          this.fixedErrors.set(errorKey, attempts + 1);
        }
      }
    }

    return false;
  }

  /**
   * Monitor errors and attempt fixes
   */
  startMonitoring() {
    if (typeof window === "undefined") return;

    // Monitor diagnostic errors
    const originalLogError = moduleLoadDiagnostics.logError.bind(moduleLoadDiagnostics);
    moduleLoadDiagnostics.logError = async (
      moduleKey: string,
      error: Error | unknown,
      context?: Record<string, unknown>,
    ) => {
      // Log the error first
      await originalLogError(moduleKey, error, context);

      // Attempt to fix
      const errorObj = error instanceof Error ? error : new Error(String(error));
      await this.attemptFix(errorObj, moduleKey, context);
    };

    console.log("[AUTO-FIX] Error monitoring started");
  }
}

export const autoErrorFixer = new AutoErrorFixer();

// Start monitoring if in browser
if (typeof window !== "undefined") {
  autoErrorFixer.startMonitoring();
  (window as any).autoErrorFixer = autoErrorFixer;
}
