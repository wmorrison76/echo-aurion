import React, { createContext, useContext, useMemo } from "react";

export interface AurumLayoutMode {
  embedded?: boolean;
}

type PropsWithChildren<T> = T & { children?: React.ReactNode };

const AurumLayoutModeContext = createContext<AurumLayoutMode | null>(null);

export function AurumLayoutModeProvider({
  embedded,
  children,
}: PropsWithChildren<AurumLayoutMode>) {
  const value = useMemo(() => ({ embedded }), [embedded]);
  return (
    <AurumLayoutModeContext.Provider value={value}>
      {children}
    </AurumLayoutModeContext.Provider>
  );
}

export function useAurumLayoutMode(): AurumLayoutMode {
  return useContext(AurumLayoutModeContext) ?? { embedded: false };
}
