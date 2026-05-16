import React from "react";

export const Switch = React.forwardRef<any, any>(function Switch(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

