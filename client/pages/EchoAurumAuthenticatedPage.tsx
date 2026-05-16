import { Suspense, lazy, useEffect } from "react";
import { useSession } from "@/modules/_stubs/echoAurumSession";
import { useAuth } from "@/hooks/useAuth";

// Use the simpler EchoAurum Panel which already handles layout correctly
const EchoAurumPanel = lazy(() =>
  import("@/modules/_stubs/EchoAurum").then((m) => ({
    default: m.EchoAurumPanel,
  })),
);

const LoadingSpinner = () => (
  <div className="w-full h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aurum-500"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export default function EchoAurumAuthenticatedPage() {
  const { session, status, issueSession } = useSession();
  const { isAuthenticated } = useAuth();

  // Auto-authenticate with EchoAurum when user is authenticated in main app
  useEffect(() => {
    if (isAuthenticated && !session && status === "unauthenticated") {
      // Automatically issue a session with the admin persona
      issueSession("persona-william-admin").catch((err) => {
        console.error("Failed to auto-authenticate EchoAurum:", err);
      });
    }
  }, [isAuthenticated, session, status, issueSession]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EchoAurumPanel />
    </Suspense>
  );
}
