import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import {
  figmaApiService,
  type FigmaOAuthToken,
} from "@/services/figmaApiService";
import { toast } from "@/hooks/use-toast";

interface FigmaAuthDialogProps {
  isOpen?: boolean;
  onAuthComplete?: (token: FigmaOAuthToken) => void;
  onLogout?: () => void;
}

export default function FigmaAuthDialog({
  isOpen = true,
  onAuthComplete,
  onLogout,
}: FigmaAuthDialogProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [clientId, setClientId] = useState("816594945594097801"); // Default test client ID

  useEffect(() => {
    // Check if already authenticated
    if (figmaApiService.isAuthenticated()) {
      setIsAuthenticated(true);
      loadUserInfo();
    } else {
      figmaApiService.restoreToken();
      if (figmaApiService.isAuthenticated()) {
        setIsAuthenticated(true);
        loadUserInfo();
      }
    }

    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code) {
      handleOAuthCallback(code, state || "");
    }
  }, []);

  const loadUserInfo = async () => {
    try {
      const me = await figmaApiService.getMe();
      setUserInfo(me);
    } catch (error: any) {
      console.error("Failed to load user info:", error);
      setIsAuthenticated(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setLoading(true);

      if (!clientSecret) {
        toast({
          title: "Error",
          description: "Client secret required for OAuth exchange",
          variant: "destructive",
        });
        return;
      }

      figmaApiService.setOAuthConfig({
        clientId,
        redirectUri: window.location.origin + window.location.pathname,
        scopes: ["file:read", "file:write", "team:read"],
      });

      const token = await figmaApiService.exchangeCodeForToken(
        code,
        clientSecret,
      );

      setIsAuthenticated(true);
      await loadUserInfo();

      toast({
        title: "Connected",
        description: `Logged in as ${userInfo?.handle || "Figma user"}`,
      });

      if (onAuthComplete) {
        onAuthComplete(token);
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with Figma",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);

      figmaApiService.setOAuthConfig({
        clientId,
        redirectUri: window.location.origin + window.location.pathname,
        scopes: ["file:read", "file:write", "team:read"],
      });

      const authUrl = figmaApiService.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate login",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleLogout = () => {
    figmaApiService.logout();
    setIsAuthenticated(false);
    setUserInfo(null);

    toast({
      title: "Logged Out",
      description: "Disconnected from Figma",
    });

    if (onLogout) {
      onLogout();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="w-full max-w-md border border-primary/20 bg-background/75 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🎨</span>
          Figma Integration
        </CardTitle>
        <CardDescription>
          Connect your Figma workspace to access files and components
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAuthenticated && userInfo ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-secondary/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Account
                </span>
                <Badge variant="secondary">{userInfo.handle}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                ID: {userInfo.id}
              </div>
              {userInfo.img_url && (
                <img
                  src={userInfo.img_url}
                  alt={userInfo.handle}
                  className="w-10 h-10 rounded-full border border-primary/20"
                />
              )}
            </div>

            <Button onClick={handleLogout} variant="outline" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <Input
                placeholder="Figma OAuth Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Get your OAuth app credentials from{" "}
                <a
                  href="https://www.figma.com/developers/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Figma Developer Settings
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <Input
                type="password"
                placeholder="Figma OAuth Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Required for OAuth token exchange
              </p>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || !clientId || !clientSecret}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Connect to Figma
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Figma to authorize access to your
              workspace
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
