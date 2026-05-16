import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface ForecastAccessControlProps {
  isOpen: boolean;
  onAuthSuccess: () => void;
  children: React.ReactNode;
}
export default function ForecastAccessControl({
  isOpen,
  onAuthSuccess,
  children,
}: ForecastAccessControlProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (isOpen && !isAuthenticated) {
      setShowAuth(true);
    }
  }, [isOpen, isAuthenticated]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const managerEmail = localStorage.getItem("shiftflow:manager-email");
    const managerPassword = localStorage.getItem("shiftflow:manager-password");
    if (email === managerEmail && password === managerPassword) {
      localStorage.setItem("shiftflow:manager-authenticated", "true");
      localStorage.setItem("shiftflow:manager-name", email.split("@")[0]);
      setIsAuthenticated(true);
      setShowAuth(false);
      setEmail("");
      setPassword("");
      setTimeout(() => {
        onAuthSuccess();
      }, 100);
    } else {
      setError("Invalid manager credentials");
      setLoading(false);
    }
  };
  if (!isOpen) return null;
  if (!isAuthenticated) {
    return (
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        {" "}
        <DialogContent className="max-w-md">
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle className="flex items-center gap-2">
              {" "}
              <Lock className="w-5 h-5" /> Manager Access Required{" "}
            </DialogTitle>{" "}
          </DialogHeader>{" "}
          <div className="space-y-4">
            {" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              The forecast feature is restricted to managers and upper-level
              management only. Please log in to access it.{" "}
            </p>{" "}
            {error && (
              <Alert variant="destructive">
                {" "}
                <AlertCircle className="h-4 w-4" />{" "}
                <AlertDescription>{error}</AlertDescription>{" "}
              </Alert>
            )}{" "}
            <form onSubmit={handleSubmit} className="space-y-4">
              {" "}
              <div className="space-y-2">
                {" "}
                <Label htmlFor="email" className="text-sm">
                  {" "}
                  Email{" "}
                </Label>{" "}
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@example.com"
                  required
                  autoFocus
                  disabled={loading}
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label htmlFor="password" className="text-sm">
                  {" "}
                  Password{" "}
                </Label>{" "}
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />{" "}
              </div>{" "}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password}
              >
                {" "}
                {loading ? "Signing in..." : "Sign In"}{" "}
              </Button>{" "}
            </form>{" "}
            <p className="text-xs text-muted-foreground text-center">
              {" "}
              Contact your administrator if you need access{" "}
            </p>{" "}
          </div>{" "}
        </DialogContent>{" "}
      </Dialog>
    );
  }
  return <>{children}</>;
}
