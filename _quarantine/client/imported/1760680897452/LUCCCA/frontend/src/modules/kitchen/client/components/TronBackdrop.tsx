import React from "react";
export default function TronBackdrop({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
