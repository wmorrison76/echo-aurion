import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
interface Outlet {
  id: string;
  name: string;
  location?: string;
  timezone?: string;
}
interface OutletContextType {
  currentOutletId: string;
  currentOutlet: Outlet | null;
  availableOutlets: Outlet[];
  selectOutlet: (outletId: string) => void;
  loading: boolean;
  error: string | null;
}
const OutletContext = createContext<OutletContextType | undefined>(undefined);
interface OutletProviderProps {
  children: React.ReactNode;
  defaultOutletId?: string;
}
export function OutletProvider({
  children,
  defaultOutletId = "main",
}: OutletProviderProps) {
  const [currentOutletId, setCurrentOutletId] = useState(defaultOutletId);
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Fetch available outlets from API useEffect(() => { const fetchOutlets = async () => { try { setLoading(true); // Get auth token from localStorage const token = typeof window !=="undefined" ? localStorage.getItem("auth_token") : null; console.log("[OutletContext] Fetching outlets...", { hasToken: !!token, tokenPreview: token ? token.substring(0, 20) +"..." :"none", }); const headers: HeadersInit = {"Content-Type":"application/json", }; // Include JWT token if available if (token) { headers["Authorization"] = `Bearer ${token}`; } const response = await fetch("/api/outlets", { method:"GET", headers, credentials:"include", }); console.log("[OutletContext] Outlets fetch response:", { status: response.status, statusText: response.statusText, ok: response.ok, }); if (!response.ok) { const errorText = await response.text().catch(() =>"Unknown error"); throw new Error( `Failed to fetch outlets: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`, ); } const data = await response.json(); console.log("[OutletContext] Outlets data received:", data); const outlets = (Array.isArray(data.outlets) && data.outlets.length > 0 ? data.outlets : [{ id:"main", name:"Main Location" }]) || []; setAvailableOutlets(outlets); // Set current outlet const current = outlets.find((o: Outlet) => o.id === currentOutletId) || outlets[0]; setCurrentOutlet(current); setError(null); console.log("[OutletContext] Outlets loaded successfully:", { count: outlets.length, current: current?.id, }); } catch (err) { console.error("[OutletContext] Error fetching outlets:", err); setError(err instanceof Error ? err.message :"Unknown error"); // Fallback to default outlet setAvailableOutlets([{ id:"main", name:"Main Location" }]); setCurrentOutlet({ id:"main", name:"Main Location" }); } finally { setLoading(false); } }; fetchOutlets(); }, [currentOutletId]); // Update current outlet when selection changes useEffect(() => { const outlet = availableOutlets.find((o) => o.id === currentOutletId); if (outlet) { setCurrentOutlet(outlet); // Persist to localStorage localStorage.setItem("maestro_selected_outlet", currentOutletId); } }, [currentOutletId, availableOutlets]); const selectOutlet = (outletId: string) => { if (availableOutlets.some((o) => o.id === outletId)) { setCurrentOutletId(outletId); } else { setError(`Outlet ${outletId} not found`); } }; const value: OutletContextType = { currentOutletId, currentOutlet, availableOutlets, selectOutlet, loading, error, }; return ( <OutletContext.Provider value={value}>{children}</OutletContext.Provider> );
}
export function useOutlet() {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error("useOutlet must be used within OutletProvider");
  }
  return context;
}
