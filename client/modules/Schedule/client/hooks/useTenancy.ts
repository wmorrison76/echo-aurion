/** * React hook + context for current organization/outlet/department selection * Manages multi-tenant context throughout the app */
import React from "react";
import {
  buildTenancyFromOutletAccess,
  getOutletAccessOptions,
} from "../lib/outletAccess";

export interface Tenancy {
  org_id: string;
  org_name?: string;
  outlet_id: string;
  outlet_name?: string;
  outlet_tz?: string;
  dept_id: string;
  dept_name?: string;
  role: string;
  user_id?: string;
}
interface TenancyContextType {
  tenancy: Tenancy;
  setTenancy: (t: Tenancy) => void;
  loading: boolean;
}
const TenancyContext = React.createContext<TenancyContextType | undefined>(
  undefined,
);

/** TenancyProvider component - wrap at app root */
export const TenancyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tenancy, setTenancyState] = React.useState<Tenancy>({
    org_id: "",
    outlet_id: "",
    dept_id: "",
    role: "EMPLOYEE",
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("shiftflow:tenancy");
      const accessOptions = getOutletAccessOptions();

      if (stored) {
        const parsed = JSON.parse(stored) as Tenancy;
        if (!parsed.org_id && accessOptions.length === 1) {
          const next = buildTenancyFromOutletAccess(accessOptions[0]);
          setTenancyState(next);
          localStorage.setItem("shiftflow:tenancy", JSON.stringify(next));
          localStorage.setItem("shiftflow:outlet", next.outlet_id);
          localStorage.setItem("shiftflow:dept", next.dept_id);
        } else {
          setTenancyState(parsed);
        }
      } else if (accessOptions.length === 1) {
        const next = buildTenancyFromOutletAccess(accessOptions[0]);
        setTenancyState(next);
        localStorage.setItem("shiftflow:tenancy", JSON.stringify(next));
        localStorage.setItem("shiftflow:outlet", next.outlet_id);
        localStorage.setItem("shiftflow:dept", next.dept_id);
      }
    } catch (err) {
      console.error("Error loading tenancy:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const setTenancy = (t: Tenancy) => {
    setTenancyState(t);
    try {
      localStorage.setItem("shiftflow:tenancy", JSON.stringify(t));
    } catch (err) {
      console.error("Error saving tenancy:", err);
    }
  };

  return React.createElement(
    TenancyContext.Provider,
    { value: { tenancy, setTenancy, loading } },
    children,
  );
};

/** Hook to access tenancy context */
export const useTenancy = () => {
  const ctx = React.useContext(TenancyContext);
  if (!ctx) {
    throw new Error("useTenancy must be used within TenancyProvider");
  }
  return ctx;
}; /** * Hook to check if user has a specific role */
export const useHasRole = (requiredRole: string): boolean => {
  const { tenancy } = useTenancy();
  const roleHierarchy: Record<string, number> = {
    ADMIN: 4,
    GM: 3,
    DEPT_MGR: 2,
    EMPLOYEE: 1,
  };
  return (
    (roleHierarchy[tenancy.role] || 0) >= (roleHierarchy[requiredRole] || 0)
  );
}; /** * Hook to check if user is admin or has specific role */
export const useIsAdmin = (): boolean => {
  const { tenancy } = useTenancy();
  return tenancy.role === "ADMIN";
}; /** * Hook to check if user is manager (GM or DEPT_MGR) */
export const useIsManager = (): boolean => {
  const { tenancy } = useTenancy();
  return tenancy.role === "GM" || tenancy.role === "DEPT_MGR";
};
