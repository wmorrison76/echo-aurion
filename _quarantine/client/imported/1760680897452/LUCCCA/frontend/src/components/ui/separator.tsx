import React from "react";

export const Separator = React.forwardRef<any, any>(function Separator(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

