import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
interface AdminPasswordSetupProps {
  open: boolean;
  onSetup: (password: string) => void;
}
export function AdminPasswordSetup({ open, onSetup }: AdminPasswordSetupProps) {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const handleSetup = () => {
    if (!newPassword) {
      setError("Password is required");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    localStorage.setItem("shiftflow:admin-password", newPassword);
    onSetup(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      {" "}
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Set Up Admin Password</DialogTitle>{" "}
          <DialogDescription>
            {" "}
            Create a password to protect sensitive employee information{" "}
          </DialogDescription>{" "}
        </DialogHeader>{" "}
        <Alert>
          {" "}
          <AlertCircle className="h-4 w-4" />{" "}
          <AlertDescription>
            {" "}
            This password protects access to employee hourly rates, personal
            information, and payroll data.{" "}
          </AlertDescription>{" "}
        </Alert>{" "}
        <div className="space-y-4">
          {" "}
          <div>
            {" "}
            <label className="text-sm font-medium block mb-2">
              {" "}
              Admin Password{" "}
            </label>{" "}
            <div className="flex gap-2">
              {" "}
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter a secure password"
                autoFocus
              />{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {" "}
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-sm font-medium block mb-2">
              {" "}
              Confirm Password{" "}
            </label>{" "}
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSetup();
              }}
              placeholder="Re-enter password"
            />{" "}
          </div>{" "}
          {error && (
            <Alert className="bg-destructive/10 text-destructive border-destructive/50">
              {" "}
              <AlertDescription>{error}</AlertDescription>{" "}
            </Alert>
          )}{" "}
          <div className="text-xs text-muted-foreground space-y-1">
            {" "}
            <p>• At least 6 characters long</p>{" "}
            <p>• Recommend mixing numbers and special characters</p>{" "}
            <p>• Store this password securely</p>{" "}
          </div>{" "}
        </div>{" "}
        <DialogFooter>
          {" "}
          <Button onClick={handleSetup} className="w-full">
            {" "}
            Set Admin Password{" "}
          </Button>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
