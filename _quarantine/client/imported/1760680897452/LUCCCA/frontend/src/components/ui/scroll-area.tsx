import React from "react";

export function ScrollArea({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} style={{ overflowY: "auto", maxHeight: "100%" }}>{children}</div>;
}

export default ScrollArea;
