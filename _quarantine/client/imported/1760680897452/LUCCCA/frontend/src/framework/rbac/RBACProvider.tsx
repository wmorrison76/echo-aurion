import React, { createContext, useContext } from "react";
import type { RbacRules, Role } from "./rbac.types";
const Ctx = createContext<RbacRules>({ role: "viewer", redact: { fields: [] } });
export function RBACProvider({ role="viewer", redactFields=[], children }:{ role?: Role; redactFields?: string[]; children: React.ReactNode; }){
  return <Ctx.Provider value={{ role, redact: { fields: redactFields } }}>{children}</Ctx.Provider>;
}
export function useRBAC(){ return useContext(Ctx); }
