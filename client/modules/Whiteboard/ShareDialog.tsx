import React, { useState } from "react";
import { CanvasState } from "./types";
import {
  Mail,
  Send,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SharingIntegrationManager from "./SharingIntegration";
interface ShareDialogProps {
  isOpen: boolean;
  boardTitle: string;
  boardUrl: string;
  canvasState: CanvasState;
  onClose: () => void;
}
type ShareMode = "slack" | "email" | "link";
export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  boardTitle,
  boardUrl,
  canvasState,
  onClose,
}) => {
  const [shareMode, setShareMode] = useState<ShareMode>("link");
  const [message, setMessage] = useState("");
  const [includePreview, setIncludePreview] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [emails, setEmails] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(boardUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  const handleShareToSlack = async () => {
    setIsSharing(true);
    setShareStatus({ type: null, message: "" });
    try {
      const config = {
        message,
        includePreview,
        previewMode: "detailed" as const,
      };
      const result = await SharingIntegrationManager.shareToSlack(
        config,
        canvasState,
        boardTitle,
        boardUrl,
      );
      if (result.success) {
        setShareStatus({
          type: "success",
          message: "Successfully shared to Slack!",
        });
        setTimeout(() => {
          onClose();
          setMessage("");
        }, 2000);
      } else {
        setShareStatus({
          type: "error",
          message: result.error || "Failed to share to Slack",
        });
      }
    } catch (error) {
      setShareStatus({
        type: "error",
        message: "An error occurred while sharing",
      });
    } finally {
      setIsSharing(false);
    }
  };
  const handleShareViaEmail = async () => {
    const emailList = emails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);
    const validation =
      SharingIntegrationManager.validateEmailAddresses(emailList);
    if (!validation.valid) {
      setShareStatus({
        type: "error",
        message: `Invalid emails: ${validation.invalid.join(",")}`,
      });
      return;
    }
    setIsSharing(true);
    setShareStatus({ type: null, message: "" });
    try {
      const result = await SharingIntegrationManager.shareViaEmail(
        {
          recipients: emailList,
          subject: `Shared Whiteboard: ${boardTitle}`,
          message,
          includePreview,
          previewMode: "detailed",
        },
        canvasState,
        boardTitle,
        boardUrl,
      );
      if (result.success) {
        setShareStatus({
          type: "success",
          message: `Successfully sent to ${emailList.length} recipient(s)!`,
        });
        setTimeout(() => {
          onClose();
          setMessage("");
          setEmails("");
        }, 2000);
      } else {
        setShareStatus({
          type: "error",
          message: result.error || "Failed to send email",
        });
      }
    } catch (error) {
      setShareStatus({
        type: "error",
        message: "An error occurred while sending email",
      });
    } finally {
      setIsSharing(false);
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {" "}
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 space-y-6">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold text-gray-900">
            Share Whiteboard
          </h2>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {boardTitle}
          </p>{" "}
        </div>{" "}
        {/* Share Mode Tabs */}{" "}
        <div className="flex gap-2 border-b border-gray-200">
          {" "}
          <button
            onClick={() => setShareMode("link")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${shareMode === "link" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-gray-900"}`}
          >
            {" "}
            Link{" "}
          </button>{" "}
          <button
            onClick={() => setShareMode("email")}
            className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${shareMode === "email" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-gray-900"}`}
          >
            {" "}
            <Mail className="w-4 h-4" /> Email{" "}
          </button>{" "}
          <button
            onClick={() => setShareMode("slack")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${shareMode === "slack" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-gray-900"}`}
          >
            {" "}
            Slack{" "}
          </button>{" "}
        </div>{" "}
        {/* Content */}{" "}
        <div className="space-y-4">
          {" "}
          {shareMode === "link" && (
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium text-foreground">
                {" "}
                Share Link{" "}
              </label>{" "}
              <div className="flex gap-2">
                {" "}
                <input
                  type="text"
                  value={boardUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface text-sm"
                />{" "}
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  variant={copiedLink ? "default" : "outline"}
                >
                  {" "}
                  {copiedLink ? (
                    <>
                      {" "}
                      <CheckCircle className="w-4 h-4 mr-1" /> Copied{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <Copy className="w-4 h-4 mr-1" /> Copy{" "}
                    </>
                  )}{" "}
                </Button>{" "}
              </div>{" "}
            </div>
          )}{" "}
          {shareMode === "email" && (
            <div className="space-y-4">
              {" "}
              <div>
                {" "}
                <label className="text-sm font-medium text-foreground">
                  {" "}
                  Email Addresses{" "}
                </label>{" "}
                <input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium text-foreground">
                  {" "}
                  Message (optional){" "}
                </label>{" "}
                <textarea
                  placeholder="Add a personal message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm h-20 resize-none"
                />{" "}
              </div>{" "}
              <label className="flex items-center gap-2">
                {" "}
                <input
                  type="checkbox"
                  checked={includePreview}
                  onChange={(e) => setIncludePreview(e.target.checked)}
                  className="rounded border-border"
                />{" "}
                <span className="text-sm text-foreground">
                  {" "}
                  Include whiteboard preview{" "}
                </span>{" "}
              </label>{" "}
            </div>
          )}{" "}
          {shareMode === "slack" && (
            <div className="space-y-4">
              {" "}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                {" "}
                <p className="text-xs text-blue-700">
                  {" "}
                  💡 Make sure you've authorized Slack integration first{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium text-foreground">
                  {" "}
                  Message{" "}
                </label>{" "}
                <textarea
                  placeholder="Share your thoughts..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm h-20 resize-none"
                />{" "}
              </div>{" "}
              <label className="flex items-center gap-2">
                {" "}
                <input
                  type="checkbox"
                  checked={includePreview}
                  onChange={(e) => setIncludePreview(e.target.checked)}
                  className="rounded border-border"
                />{" "}
                <span className="text-sm text-foreground">
                  {" "}
                  Include whiteboard preview{" "}
                </span>{" "}
              </label>{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Status Messages */}{" "}
        {shareStatus.type && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${shareStatus.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
          >
            {" "}
            {shareStatus.type === "success" ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}{" "}
            <span className="text-sm">{shareStatus.message}</span>{" "}
          </div>
        )}{" "}
        {/* Actions */}{" "}
        <div className="flex gap-2 justify-end">
          {" "}
          <Button variant="outline" onClick={onClose} disabled={isSharing}>
            {" "}
            Cancel{" "}
          </Button>{" "}
          {shareMode === "link" ? (
            <Button disabled>
              {" "}
              {/* Link sharing is always available */} Link created{" "}
            </Button>
          ) : shareMode === "email" ? (
            <Button
              onClick={handleShareViaEmail}
              disabled={isSharing || !emails}
            >
              {" "}
              {isSharing ? (
                <>
                  {" "}
                  <Loader className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Sending...{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Send className="w-4 h-4 mr-2" /> Send{" "}
                </>
              )}{" "}
            </Button>
          ) : (
            <Button onClick={handleShareToSlack} disabled={isSharing}>
              {" "}
              {isSharing ? (
                <>
                  {" "}
                  <Loader className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Sharing...{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Send className="w-4 h-4 mr-2" /> Share to Slack{" "}
                </>
              )}{" "}
            </Button>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default ShareDialog;
