import React from "react";

export const Popover = React.forwardRef<any, any>(function Popover(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});


export const PopoverrContent = React.forwardRef<any, any>(function PopoverrContent(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});


export const PopoverrTrigger = React.forwardRef<any, any>(function PopoverrTrigger(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

const DefaultShim = React.forwardRef<any, any>(function DefaultShim(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});
export default DefaultShim;

