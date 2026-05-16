/**
 * Client-Side Logger Utility
 * Simple logging for client-side operations
 */

const isDev = import.meta.env.DEV;

/**
 * Safely serialize any value for console logging
 */
function safeSerialize(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
    };
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "object") {
    // Try to safely convert to string or object
    try {
      if (typeof value[Symbol.toStringTag] !== "undefined") {
        return `[${value[Symbol.toStringTag]}]`;
      }
      // Try JSON serialization for plain objects
      const serialized: Record<string, any> = {};
      for (const key of Object.keys(value).slice(0, 5)) {
        const val = value[key];
        if (typeof val === "object" && val !== null) {
          serialized[key] = `[${typeof val}]`;
        } else {
          serialized[key] = val;
        }
      }
      return serialized;
    } catch {
      return "[Object]";
    }
  }

  try {
    return String(value);
  } catch {
    return "[Unknown]";
  }
}

export const logger = {
  /**
   * Log debug message
   */
  debug: (message: string, data?: Record<string, any>) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, data ? safeSerialize(data) : "");
    }
  },

  /**
   * Log info message
   */
  info: (message: string, data?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, data ? safeSerialize(data) : "");
  },

  /**
   * Log warning message
   */
  warn: (message: string, data?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, data ? safeSerialize(data) : "");
  },

  /**
   * Log error message
   */
  error: (message: string, data?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, data ? safeSerialize(data) : "");
  },
};
