import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";

export const ToastProvider = ToastPrimitives.Provider;
export const ToastViewport = (props: React.ComponentProps<typeof ToastPrimitives.Viewport>) => (
  <ToastPrimitives.Viewport {...props} />
);

// Radix Root + parts re-exported with the names your code imports
export const Toast = ToastPrimitives.Root;
export const ToastTitle = ToastPrimitives.Title;
export const ToastDescription = ToastPrimitives.Description;
export const ToastClose = ToastPrimitives.Close;

// Re-export types if TS wants them elsewhere
export type ToastProps = React.ComponentProps<typeof ToastPrimitives.Root>;
export { Toaster as default, Toaster } from "./toaster";
