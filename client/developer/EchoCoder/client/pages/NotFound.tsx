import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, useBreakpoint } from "@/components/layout";
import { AlertTriangle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <ResponsiveContainer className="flex items-center justify-center py-12 sm:py-20 md:py-32">
      <Card className="w-full max-w-md border-2">
        <CardContent className="p-6 sm:p-8 text-center space-y-6 sm:space-y-8">
          {/* Icon */}
          <div className="mx-auto">
            <AlertTriangle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-destructive opacity-80" />
          </div>

          {/* 404 Text */}
          <div className="space-y-2 sm:space-y-4">
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight">404</h1>
            <p className="text-lg sm:text-xl font-bold text-foreground">
              Page Not Found
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Requested Path */}
          <div className="p-3 sm:p-4 bg-muted rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Requested path:</p>
            <p className="font-mono text-xs sm:text-sm text-foreground line-clamp-2 break-all">
              {location.pathname}
            </p>
          </div>

          {/* Action Button */}
          <Button
            asChild
            className="w-full text-xs sm:text-sm h-9 sm:h-10"
            size={isMobile ? "sm" : "default"}
          >
            <a href="/">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </a>
          </Button>

          {/* Alternative Links */}
          <div className="space-y-2 pt-4 border-t">
            <p className="text-xs text-muted-foreground">Common pages:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: "Dashboard", href: "/board" },
                { label: "Studio", href: "/studio" },
                { label: "Resources", href: "/resources" },
                { label: "Settings", href: "/settings" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs px-2 py-1 rounded hover:bg-accent transition"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </ResponsiveContainer>
  );
};

export default NotFound;
