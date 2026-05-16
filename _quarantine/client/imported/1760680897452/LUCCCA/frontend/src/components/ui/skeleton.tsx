import React from "react";

export const Skeleton = React.forwardRef<any, any>(function Skeleton(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

