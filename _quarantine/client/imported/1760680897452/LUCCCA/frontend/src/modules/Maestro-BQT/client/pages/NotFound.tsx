import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Home, Search } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <DashboardLayout
      title="Page Not Found"
      subtitle="The requested page could not be found"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-panel max-w-md w-full">
          <CardContent className="text-center p-8">
            <div className="mb-6">
              <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h2>
              <p className="text-muted-foreground">
                The page "{location.pathname}" doesn't exist or has been moved.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = "/"}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>

              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NotFound;
