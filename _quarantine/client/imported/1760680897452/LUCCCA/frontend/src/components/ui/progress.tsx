import React from "react";

export const Progress = React.forwardRef<any, any>(function Progress(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

