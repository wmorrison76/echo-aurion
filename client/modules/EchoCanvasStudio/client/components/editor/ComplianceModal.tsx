import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Lock, X } from "lucide-react";
interface ComplianceModalProps {
  isOpen: boolean;
  isAdultContent: boolean;
  prompt: string;
  clientId?: string;
  onConfirm: (acknowledged: boolean) => Promise<void>;
  onCancel: () => void;
}
export default function ComplianceModal({
  isOpen,
  isAdultContent,
  prompt,
  clientId,
  onConfirm,
  onCancel,
}: ComplianceModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [agreeLogging, setAgreeLogging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  if (!isOpen) return null;
  const handleConfirm = async () => {
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    if (!acknowledgedWarning || !agreeLogging) {
      setError("You must acknowledge the warning and agree to logging");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      // Log this action to compliance trail await fetch("/api/compliance/log-action", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ clientId, userId: username, actionType: isAdultContent ?"adult_image_generation_requested" :"image_generation_requested", resourceType:"image", isAdultContent, contentWarningAcknowledged: acknowledgedWarning, status:"approved", reason: `User ${username} confirmed image generation. Prompt:"${prompt}"`, metadata: { prompt, timestamp: new Date().toISOString(), }, }), });
      await onConfirm(acknowledgedWarning);
    } catch (err: any) {
      setError(err.message || "Failed to log compliance action");
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    setUsername("");
    setPassword("");
    setAcknowledgedWarning(false);
    setAgreeLogging(false);
    setError("");
    onCancel();
  };
  if (!isAdultContent) {
    /* Standard content - quick confirmation dialog */
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        {" "}
        <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
          {" "}
          <div className="p-6 space-y-4">
            {" "}
            <h2 className="text-lg font-semibold text-white">
              Generate Image
            </h2>{" "}
            <p className="text-sm text-gray-300">
              {" "}
              Your request will be logged for quality assurance.{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground bg-gray-800 p-3 rounded">
              {" "}
              Prompt: {prompt}{" "}
            </p>{" "}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
              {" "}
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="border-gray-600"
              >
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button
                onClick={() => onConfirm(false)}
                disabled={isLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {" "}
                {isLoading ? "Confirming..." : "Generate"}{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  } /* Adult content - requires full compliance gate */
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      {" "}
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full border border-orange-500/30">
        {" "}
        {/* Header */}{" "}
        <div className="flex items-center justify-between p-6 border-b border-orange-500/20 bg-gray-800/50">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <AlertTriangle className="w-6 h-6 text-orange-500" />{" "}
            <h2 className="text-lg font-semibold text-orange-500">
              Adult Content Warning
            </h2>{" "}
          </div>{" "}
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
          >
            {" "}
            <X className="w-5 h-5" />{" "}
          </button>{" "}
        </div>{" "}
        {/* Content */}{" "}
        <div className="p-6 space-y-4">
          {" "}
          {/* Warning Box */}{" "}
          <div className="bg-orange-950/30 border border-orange-500/30 p-4 rounded-lg">
            {" "}
            <p className="text-sm text-orange-200 font-semibold mb-2">
              ⚠️ Content Notice
            </p>{" "}
            <p className="text-xs text-orange-100">
              {" "}
              You are about to generate adult/mature content. This action will
              be logged and recorded for compliance purposes.{" "}
            </p>{" "}
          </div>{" "}
          {/* Info Box */}{" "}
          <div className="bg-blue-950/30 border border-blue-500/30 p-4 rounded-lg">
            {" "}
            <p className="text-xs text-blue-200 font-semibold mb-2">
              🔒 Compliance Logging
            </p>{" "}
            <p className="text-xs text-blue-100">
              {" "}
              Your request, including the prompt and timestamp, will be stored
              in our secure compliance database for audit purposes.{" "}
            </p>{" "}
          </div>{" "}
          {/* Verification Fields */}{" "}
          <div className="space-y-3">
            {" "}
            <p className="text-xs font-semibold text-gray-300">
              Verification Required
            </p>{" "}
            <div>
              {" "}
              <label className="text-xs font-medium text-gray-400 block mb-2">
                Username
              </label>{" "}
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-xs font-medium text-gray-400 block mb-2">
                Password
              </label>{" "}
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
              />{" "}
            </div>{" "}
            {error && (
              <div className="bg-red-950/40 border border-red-500/40 text-red-300 px-3 py-2 rounded text-xs">
                {" "}
                ❌ {error}{" "}
              </div>
            )}{" "}
            {/* Checkboxes */}{" "}
            <div className="space-y-2 pt-2">
              {" "}
              <div className="flex items-start gap-3">
                {" "}
                <Checkbox
                  checked={acknowledgedWarning}
                  onCheckedChange={(checked) =>
                    setAcknowledgedWarning(checked as boolean)
                  }
                  disabled={isLoading}
                  id="acknowledge"
                  className="mt-1"
                />{" "}
                <label
                  htmlFor="acknowledge"
                  className="text-xs text-gray-300 cursor-pointer leading-tight"
                >
                  {" "}
                  I acknowledge this is adult content and understand the
                  implications{" "}
                </label>{" "}
              </div>{" "}
              <div className="flex items-start gap-3">
                {" "}
                <Checkbox
                  checked={agreeLogging}
                  onCheckedChange={(checked) =>
                    setAgreeLogging(checked as boolean)
                  }
                  disabled={isLoading}
                  id="logging"
                  className="mt-1"
                />{" "}
                <label
                  htmlFor="logging"
                  className="text-xs text-gray-300 cursor-pointer leading-tight"
                >
                  {" "}
                  I agree that this request will be logged and audited{" "}
                </label>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Security Notice */}{" "}
          <div className="text-xs text-gray-400 bg-gray-800 p-3 rounded flex items-start gap-2">
            {" "}
            <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-cyan-400" />{" "}
            <span>
              All data is encrypted and stored securely in compliance with
              applicable regulations.
            </span>{" "}
          </div>{" "}
        </div>{" "}
        {/* Footer */}{" "}
        <div className="flex gap-3 justify-end p-6 border-t border-orange-500/20 bg-gray-800/30">
          {" "}
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {" "}
            Cancel{" "}
          </Button>{" "}
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              !username ||
              !password ||
              !acknowledgedWarning ||
              !agreeLogging
            }
            className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            size="sm"
          >
            {" "}
            {isLoading ? "Processing..." : "I Understand & Proceed"}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
