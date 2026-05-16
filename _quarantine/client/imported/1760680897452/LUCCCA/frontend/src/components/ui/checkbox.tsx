import React from "react";

export const Checkbox = React.forwardRef<any, any>(function Checkbox(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

