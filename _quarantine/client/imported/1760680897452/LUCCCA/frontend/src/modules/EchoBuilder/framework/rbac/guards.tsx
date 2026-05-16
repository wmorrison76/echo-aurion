import React from "react";
import { useRBAC } from "./RBACProvider";

export function Redact({ field, children }:{ field: string; children: React.ReactNode; }){
  const { redact } = useRBAC();
  if (redact?.fields?.includes(field)) return <span className="blur-sm select-none">•••</span>;
  return <>{children}</>;
}

export function RequireRole({ atLeast, children }:{ atLeast: "viewer"|"staff"|"manager"|"owner"; children: React.ReactNode; }){
  const order = ["viewer","staff","manager","owner"];
  const { role } = useRBAC();
  if (order.indexOf(role) < order.indexOf(atLeast)) return null;
  return <>{children}</>;
}

export default Redact;
