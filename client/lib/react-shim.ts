/**
 * React Shim
 * Ensures React is available globally before any modules try to use it
 * This prevents "Cannot read properties of null (reading 'useState')" errors
 */

import React from "react";
import ReactDOM from "react-dom";

// Ensure React is available globally
if (typeof window !== "undefined") {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;

  // Verify React is actually available - but don't throw, just warn
  // Throwing here prevents the app from loading at all
  if (!React || typeof React.useState !== "function") {
    console.error("[React Shim] CRITICAL: React is not properly loaded!");
    console.error("[React Shim] React:", React);
    console.error("[React Shim] React.useState:", typeof React.useState);
    // Don't throw - let the app try to load and fail more gracefully elsewhere
    // throw new Error("React is not available. Check for multiple React instances or bundling issues.");
  } else {
    console.log("[React Shim] React and ReactDOM ensured to be available globally.");
  }
}

// Re-export React to ensure it's the same instance everywhere
export default React;
export { ReactDOM };

// Named exports from React
export {
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  Component,
  PureComponent,
  createElement,
  cloneElement,
  Fragment,
  Suspense,
  createContext,
  lazy,
  forwardRef,
  memo,
  Profiler,
} from "react";
