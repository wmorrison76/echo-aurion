import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

export interface OutletLocation {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

export interface Outlet {
  id: string;
  name: string;
  type: "restaurant" | "casino" | "resort" | "bar" | "hotel";
  location: OutletLocation;
  seats: number;
  covers: number;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  tier: "startup" | "growth" | "enterprise";
  outlets: number;
  createdAt: string;
  features: string[];
}

export interface MultiOutletContextType {
  // Organization data
  organization: Organization | null;
  setOrganization: (org: Organization) => void;
  // Outlet management
  outlets: Outlet[];
  setOutlets: (outlets: Outlet[]) => void;
  currentOutlet: Outlet | null;
  setCurrentOutlet: (outlet: Outlet | null) => void;
  selectOutlet: (outletId: string) => boolean;
  getAccessibleOutlets: () => Outlet[];
  // Multi-outlet operations
  getOutletById: (id: string) => Outlet | undefined;
  isMultiOutlet: () => boolean;
  getOutletMetadata: (outletId: string) => Record<string, any> | null;
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const MultiOutletContext = createContext<MultiOutletContextType | undefined>(
  undefined,
);

export function MultiOutletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectOutlet = useCallback(
    (outletId: string): boolean => {
      const outlet = outlets.find((o) => o.id === outletId);
      if (outlet) {
        setCurrentOutlet(outlet);
        localStorage.setItem("selected_outlet_id", outletId);
        return true;
      }
      return false;
    },
    [outlets],
  );

  const getAccessibleOutlets = useCallback(() => {
    // In a real app, this would check user permissions
    return outlets;
  }, [outlets]);

  const getOutletById = useCallback(
    (id: string) => outlets.find((o) => o.id === id),
    [outlets],
  );

  const isMultiOutlet = useCallback(() => outlets.length > 1, [outlets]);

  const getOutletMetadata = useCallback(
    (outletId: string) => {
      const outlet = getOutletById(outletId);
      if (!outlet) return null;

      return {
        id: outlet.id,
        name: outlet.name,
        type: outlet.type,
        status: outlet.status,
        seats: outlet.seats,
        covers: outlet.covers,
        location: outlet.location,
      };
    },
    [getOutletById],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load outlets from localStorage or API on mount
  useEffect(() => {
    const loadOutlets = async () => {
      try {
        setIsLoading(true);

        // Try to load from localStorage first
        const savedOrg = localStorage.getItem("organization");
        const savedOutlets = localStorage.getItem("outlets");
        const selectedOutletId = localStorage.getItem("selected_outlet_id");

        if (savedOrg && savedOutlets) {
          const org = JSON.parse(savedOrg);
          const outletsList = JSON.parse(savedOutlets);

          setOrganization(org);
          setOutlets(outletsList);

          // Restore selected outlet
          if (selectedOutletId) {
            const outlet = outletsList.find(
              (o: Outlet) => o.id === selectedOutletId,
            );
            if (outlet) {
              setCurrentOutlet(outlet);
            } else {
              setCurrentOutlet(outletsList[0] || null);
            }
          } else {
            setCurrentOutlet(outletsList[0] || null);
          }
        } else {
          // Initialize with default organization and outlet if none exist
          const defaultOrg: Organization = {
            id: "luccca-main",
            name: "LUCCCA Ecosystem",
            tier: "enterprise",
            outlets: 1,
            createdAt: new Date().toISOString(),
            features: [
              "purchasing",
              "receiving",
              "inventory",
              "waste",
              "iot",
              "maestro",
            ],
          };

          const defaultOutlets: Outlet[] = [
            {
              id: "outlet-flagship",
              name: "Flagship Location",
              type: "restaurant",
              location: {
                address: "123 Main St",
                city: "Las Vegas",
                state: "NV",
                zip: "89101",
                lat: 36.1699,
                lng: -115.1398,
              },
              seats: 150,
              covers: 300,
              status: "active",
              createdAt: new Date().toISOString(),
            },
          ];

          setOrganization(defaultOrg);
          setOutlets(defaultOutlets);
          setCurrentOutlet(defaultOutlets[0]);

          // Save to localStorage for persistence
          localStorage.setItem("organization", JSON.stringify(defaultOrg));
          localStorage.setItem("outlets", JSON.stringify(defaultOutlets));
          localStorage.setItem("selected_outlet_id", defaultOutlets[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load outlets");
      } finally {
        setIsLoading(false);
      }
    };

    loadOutlets();
  }, []);

  // Save outlets to localStorage when they change
  useEffect(() => {
    if (organization && outlets.length > 0) {
      localStorage.setItem("organization", JSON.stringify(organization));
      localStorage.setItem("outlets", JSON.stringify(outlets));
    }
  }, [organization, outlets]);

  const value: MultiOutletContextType = {
    organization,
    setOrganization,
    outlets,
    setOutlets,
    currentOutlet,
    setCurrentOutlet,
    selectOutlet,
    getAccessibleOutlets,
    getOutletById,
    isMultiOutlet,
    getOutletMetadata,
    isLoading,
    error,
    clearError,
  };

  return (
    <MultiOutletContext.Provider value={value}>
      {children}
    </MultiOutletContext.Provider>
  );
}

export function useMultiOutlet() {
  const context = useContext(MultiOutletContext);
  if (context === undefined) {
    throw new Error("useMultiOutlet must be used within MultiOutletProvider");
  }
  return context;
}
