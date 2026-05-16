import React from "react";

export const Shee = React.forwardRef<any, any>(function Shee(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});


export const SheetContent = React.forwardRef<any, any>(function SheetContent(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

const DefaultShim = React.forwardRef<any, any>(function DefaultShim(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});
export default DefaultShim;

