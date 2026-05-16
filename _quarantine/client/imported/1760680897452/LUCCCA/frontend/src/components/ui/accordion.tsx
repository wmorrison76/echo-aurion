import React from "react";

/**
 * Minimal Accordion shims so Builder.io pages compile.
 * These are passthrough wrappers that just render a <div>
 * (or whatever you pass via `as`) and forward refs/props.
 */

export const Accordion = React.forwardRef<any, any>(function Accordion(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

export const AccordionContent = React.forwardRef<any, any>(function AccordionContent(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

export const AccordionItem = React.forwardRef<any, any>(function AccordionItem(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

export const AccordionTrigger = React.forwardRef<any, any>(function AccordionTrigger(props, ref) {
  return React.createElement(props?.as || "button", { ref, ...props }, props?.children);
});

// Default export (not usually used, but harmless to keep)
const DefaultShim = React.forwardRef<any, any>(function DefaultShim(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});
export default DefaultShim;
