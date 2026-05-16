/******************************************************************** * LUCCCA — BUILD 14 * Role-Gated Override Center Wrapper * * PURPOSE: * - Protect Override Center UI * - Only EC/Director level roles can access * - Others see read-only or blocked *********************************************************************/ import React from "react";
import { AlertCircle } from "lucide-react";
import { useAccessStore } from "../components/admin/EcosystemControlPanel";
import OverrideCenterPanel from "./OverrideCenterPanel";
import { cn } from "@/lib/glass";
export default function OverrideCenterGate() {
  const roles = useAccessStore((s) => s.roles);
  const currentUser = useAccessStore((s) => s.currentUser);
  if (!currentUser) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center bg-background text-center">
        {" "}
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />{" "}
        <p className="text-sm text-foreground">No user authenticated.</p>{" "}
      </div>
    );
  } // Find current user's role const userRole = roles.find((r) => r.id === currentUser.roleId); const roleLevel = userRole?.level || 0; // EC = level 5, Director = level 4 const canApproveOverrides = roleLevel >= 4; if (!canApproveOverrides) { return ( <div className="p-6 h-full flex flex-col items-center justify-center bg-background text-center space-y-4"> <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center"> <AlertCircle className="w-6 h-6 text-red-600" /> </div> <div> <h3 className="text-sm font-semibold text-foreground mb-1"> Access Restricted </h3> <p className="text-xs text-foreground/60 max-w-xs"> The Override Center is reserved for Executive Committee (EC) or Director-level roles. Your current role is{""} <span className="font-medium">{userRole?.name}</span>. </p> </div> <div className="mt-4 text-xs text-foreground/50"> Level Required: 4+ | Your Level: {roleLevel} </div> </div> ); } // Full access - render the actual Override Center return ( <div className="relative"> {/* Role badge for context */} <div className="absolute top-2 right-2 z-10"> <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium bg-emerald-500/20 text-emerald-700 border border-emerald-200"> {userRole?.name} (Lvl {roleLevel}) </span> </div> <OverrideCenterPanel /> </div> );
}
