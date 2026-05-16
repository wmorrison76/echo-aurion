import React from "react";

export const useToast = React.forwardRef<any, any>(function useToast(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

