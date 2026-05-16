import React, { createContext, useContext } from "react";
import {
  WhiteLabelCustomization,
  DEFAULT_WHITE_LABEL_CONFIG,
} from "../../shared/whiteLabelConfig";
import { useWhiteLabel } from "../hooks/use-white-label";
interface WhiteLabelContextType {
  config: WhiteLabelCustomization;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
const WhiteLabelContext = createContext<WhiteLabelContextType>({
  config: DEFAULT_WHITE_LABEL_CONFIG,
  loading: true,
  error: null,
  refetch: async () => {},
});
export function WhiteLabelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const whiteLabelData = useWhiteLabel();
  return (
    <WhiteLabelContext.Provider value={whiteLabelData}>
      {" "}
      {children}{" "}
    </WhiteLabelContext.Provider>
  );
}
export function useWhiteLabelContext() {
  const context = useContext(WhiteLabelContext);
  if (!context) {
    throw new Error(
      "useWhiteLabelContext must be used within WhiteLabelProvider",
    );
  }
  return context;
}
export function useWhiteLabelBranding() {
  const { config } = useWhiteLabelContext();
  return config.branding;
}
export function useWhiteLabelColors() {
  const { config } = useWhiteLabelContext();
  return config.colors;
}
export function useWhiteLabelFeatureFlags() {
  const { config } = useWhiteLabelContext();
  return config.featureFlags;
}
export function useWhiteLabelTypography() {
  const { config } = useWhiteLabelContext();
  return config.typography;
}
