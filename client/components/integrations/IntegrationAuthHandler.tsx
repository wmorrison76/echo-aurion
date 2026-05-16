import React, { useState, useEffect } from "react";
import IntegrationAuthModal from "./IntegrationAuthModal";

type ServiceType = "outlook" | "teams" | "gmail";

export default function IntegrationAuthHandler() {
  const [activeService, setActiveService] = useState<ServiceType | null>(null);

  useEffect(() => {
    const handleShowAuth = (event: any) => {
      const { service } = event.detail as { service: ServiceType };
      setActiveService(service);
    };

    window.addEventListener(
      "show-integration-auth",
      handleShowAuth as EventListener,
    );

    return () => {
      window.removeEventListener(
        "show-integration-auth",
        handleShowAuth as EventListener,
      );
    };
  }, []);

  return (
    <>
      {activeService && (
        <IntegrationAuthModal
          service={activeService}
          isOpen={true}
          onClose={() => setActiveService(null)}
        />
      )}
    </>
  );
}
