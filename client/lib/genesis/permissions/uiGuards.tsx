/**
 * Genesis Permissions UI Guards
 * React components for permission-based UI gating
 */

import React from "react";
import { getCurrentUser } from "@/stores/genesisAuthStore";

export interface RequirePermProps {
  perm: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Only render children if user has permission
 */
export function RequirePerm({ perm, children, fallback = null }: RequirePermProps) {
  const user = getCurrentUser();
  const hasPermission = user?.permissions?.includes(perm) ?? false;

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export interface GatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  perm: string;
  children: React.ReactNode;
}

/**
 * Button that only renders if user has permission
 */
export function GatedButton({ perm, children, ...props }: GatedButtonProps) {
  const user = getCurrentUser();
  const hasPermission = user?.permissions?.includes(perm) ?? false;

  if (!hasPermission) {
    return null;
  }

  return <button {...props}>{children}</button>;
}
