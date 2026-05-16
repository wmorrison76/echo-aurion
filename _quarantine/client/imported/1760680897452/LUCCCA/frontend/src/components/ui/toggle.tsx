import React from "react";

export const toggleVariants = React.forwardRef<any, any>(function toggleVariants(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

