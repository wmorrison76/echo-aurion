import React from "react";

export const Label = React.forwardRef<any, any>(function Label(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

