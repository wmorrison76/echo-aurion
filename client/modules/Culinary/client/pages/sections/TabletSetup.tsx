import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TabletSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const deviceId = searchParams.get("device");
  const deviceToken = searchParams.get("token");

  const [isRegistering, setIsRegistering] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-register tablet on mount
  useEffect(() => {
    if (!deviceId || !deviceToken) {
      setError("Invalid setup link. Missing device credentials.");
      return;
    }

    registerTablet();
  }, [deviceId, deviceToken]);

  const registerTablet = async () => {
    try {
      setIsRegistering(true);
      setError(null);

      // Get tablet info (user agent, screen size, etc.)
      const tabletInfo = {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await fetch("/api/tablet/device/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId,
          deviceToken,
          tabletInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }

      const result = await response.json();

      // Store session token and device info in localStorage
      localStorage.setItem("tablet:sessionToken", result.sessionToken);
      localStorage.setItem("tablet:deviceId", deviceId!);
      localStorage.setItem("tablet:deviceName", result.deviceName);
      localStorage.setItem("tablet:credentialMode", result.credentialMode);
      localStorage.setItem(
        "tablet:includeChefName",
        String(result.includeChefName),
      );

      setDeviceName(result.deviceName);
      setIsSuccess(true);

      toast({
        title: "Success",
        description: `Tablet registered successfully as "${result.deviceName}"`,
      });

      // Redirect to tablet labels page after 2 seconds
      setTimeout(() => {
        navigate("/tablet/labels");
      }, 2000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMsg);
      console.error("Registration error:", err);
      toast({
        title: "Registration Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">Tablet Setup</CardTitle>
          <CardDescription className="text-slate-400">
            Configuring your kitchen tablet...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSuccess ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              </div>
              <Alert className="border-emerald-500/50 bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-emerald-200">
                  Tablet registered successfully as "{deviceName}"!
                </AlertDescription>
              </Alert>
              <p className="text-sm text-slate-400 text-center">
                Redirecting to tablet interface...
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <p className="text-sm text-slate-400 text-center">
                  Please verify the QR code and try again.
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Retry Registration
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              </div>
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-200">
                  Setting up your tablet...
                </AlertDescription>
              </Alert>
              <p className="text-sm text-slate-400 text-center">
                Device ID:{" "}
                <span className="font-mono text-slate-300">{deviceId}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
