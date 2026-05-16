import React from "react";

export const Slider = React.forwardRef<any, any>(function Slider(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

