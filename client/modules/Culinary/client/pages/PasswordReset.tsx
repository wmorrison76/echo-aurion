import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword, resetPasswordWithToken } from "@/lib/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function PasswordReset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if reset token is present in URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setMode("reset");
    }
  }, [searchParams]);

  const handleRequestReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        if (!email) {
          setError("Please enter your email address");
          setLoading(false);
          return;
        }

        const result = await resetPassword(email);
        if (result.success) {
          setSuccess(true);
        } else {
          setError(result.error || "Failed to send reset email");
        }
      } catch (err) {
        setError("An error occurred. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters long");
        return;
      }

      setLoading(true);

      try {
        const token = searchParams.get("token");
        if (!token) {
          setError("Invalid reset link");
          return;
        }

        const result = await resetPasswordWithToken(token, newPassword);
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        } else {
          setError(result.error || "Failed to reset password");
        }
      } catch (err) {
        setError("An error occurred. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [newPassword, confirmPassword, searchParams, navigate],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-neutral-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-[#c8a97e]/25 bg-slate-950/80 backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-[#c8a97e]">
            Reset Password
          </CardTitle>
          <CardDescription>
            {mode === "request"
              ? "Enter your email to receive a password reset link"
              : "Enter your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-500/25 bg-green-950/30">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">
                  {mode === "request"
                    ? "Check your email for a password reset link"
                    : "Password reset successfully. Redirecting to login..."}
                </AlertDescription>
              </Alert>
              {mode === "request" && (
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-[#c8a97e] hover:bg-[#b8976c]"
                >
                  Back to Login
                </Button>
              )}
            </div>
          ) : (
            <>
              {error && (
                <Alert className="mb-4 border-red-500/25 bg-red-950/30">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {mode === "request" ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="border-[#c8a97e]/30 bg-slate-900/70 text-white/80 placeholder-[#c8a97e]/40"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-[#c8a97e] hover:bg-[#b8976c] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="w-full text-[#c8a97e] hover:text-[#c8a97e]/80"
                  >
                    Back to Login
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="newPassword"
                      className="text-sm font-medium"
                    >
                      New Password
                    </label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      className="border-[#c8a97e]/30 bg-slate-900/70 text-white/80 placeholder-[#c8a97e]/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium"
                    >
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="border-[#c8a97e]/30 bg-slate-900/70 text-white/80 placeholder-[#c8a97e]/40"
                    />
                  </div>

                  <p className="text-xs text-[#c8a97e]/80">
                    Password must be at least 8 characters long
                  </p>

                  <Button
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full bg-[#c8a97e] hover:bg-[#b8976c] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
