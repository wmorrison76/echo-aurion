import React from "react";

export const Textarea = React.forwardRef<any, any>(function Textarea(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

