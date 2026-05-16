import { X } from "lucide-react";
import { SessionMenu } from "../modules/auth";
interface LandingAuthModalProps {
  onDismiss?: () => void;
}
export function LandingAuthModal({ onDismiss }: LandingAuthModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {" "}
      {/* Modal Container */}{" "}
      <div className="bg-background border border-border/50 rounded-lg shadow-2xl max-w-sm w-full p-8 space-y-6">
        {" "}
        {/* Close Button */}{" "}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1 hover:bg-surface-variant rounded-lg transition-colors"
            aria-label="Close modal"
          >
            {" "}
            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />{" "}
          </button>
        )}{" "}
        {/* Header */}{" "}
        <div className="space-y-2 text-center">
          {" "}
          <h2 className="text-2xl font-bold text-foreground">
            {" "}
            Authentication required{" "}
          </h2>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            To access your financial dashboard{" "}
          </p>{" "}
        </div>{" "}
        {/* Auth Component */}{" "}
        <div className="space-y-4">
          {" "}
          <SessionMenu buttonVariant="primary" />{" "}
          <p className="text-xs text-muted-foreground text-center">
            {" "}
            Select a LUCCCA persona to authenticate and access EchoAurum.{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
