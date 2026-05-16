import React from "react";

/**
 * Minimal Alert Dialog shims so Builder pages compile.
 * Passthrough wrappers that just render a <div> (or `as`) and forward refs/props.
 */

export const AlertDialog = React.forwardRef<any, any>(function AlertDialog(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

export const AlertDialogAction = React.forwardRef<any, any>(function AlertDialogAction(props, ref) {
  return React.createElement(props?.as || "button", { ref, ...props }, props?.children);
});

export const AlertDialogCancel = React.forwardRef<any, any>(function AlertDialogCancel(props, ref) {
  return React.createElement(props?.as || "button", { ref, ...props }, props?.children);
});

export const AlertDialogContent = React.forwardRef<any, any>(function AlertDialogContent(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

export const AlertDialogDescription = React.forwardRef<any, any>(function AlertDialogDescription(props, ref) {
  return React.createElement(props?.as || "p", { ref, ...props }, props?.children);
});

export const AlertDialogFooter = React.forwardRef<any, any>(function AlertDialogFooter(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

export const AlertDialogHeader = React.forwardRef<any, any>(function AlertDialogHeader(props, ref) {
  return React.createElement(props?.as || "header", { ref, ...props }, props?.children);
});

export const AlertDialogTitle = React.forwardRef<any, any>(function AlertDialogTitle(props, ref) {
  return React.createElement(props?.as || "h3", { ref, ...props }, props?.children);
});

export const AlertDialogTrigger = React.forwardRef<any, any>(function AlertDialogTrigger(props, ref) {
  return React.createElement(props?.as || "button", { ref, ...props }, props?.children);
});

// Default export (optional)
const DefaultShim = React.forwardRef<any, any>(function DefaultShim(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});
export default DefaultShim;
