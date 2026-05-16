import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type PageToolbarButtonItem = {
  id: string;
  type?: "button";
  label: string;
  ariaLabel?: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  className?: string;
};

export type PageToolbarCustomItem = {
  id: string;
  type: "custom";
  element: React.ReactNode;
};

export type PageToolbarItem = PageToolbarButtonItem | PageToolbarCustomItem;

export type PageToolbarConfig = {
  title?: string | null;
  items?: PageToolbarItem[];
};

type PageToolbarContextValue = {
  config: Required<PageToolbarConfig>;
  setToolbar: (config: PageToolbarConfig) => void;
  resetToolbar: () => void;
};

const defaultConfig: Required<PageToolbarConfig> = {
  title: null,
  items: [],
};

const PageToolbarContext = createContext<PageToolbarContextValue | undefined>(
  undefined,
);

export const PageToolbarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<Required<PageToolbarConfig>>(defaultConfig);

  const setToolbar = useCallback((next: PageToolbarConfig) => {
    setConfig({
      title: next.title ?? null,
      items: Array.isArray(next.items) ? [...next.items] : [],
    });
  }, []);

  const resetToolbar = useCallback(() => {
    setConfig({ title: null, items: [] });
  }, []);

  const value = useMemo(
    () => ({
      config,
      setToolbar,
      resetToolbar,
    }),
    [config, setToolbar, resetToolbar],
  );

  return (
    <PageToolbarContext.Provider value={value}>
      {children}
    </PageToolbarContext.Provider>
  );
};

export const usePageToolbar = () => {
  const ctx = useContext(PageToolbarContext);
  if (!ctx) {
    throw new Error("usePageToolbar must be used within a PageToolbarProvider");
  }
  return ctx;
};
