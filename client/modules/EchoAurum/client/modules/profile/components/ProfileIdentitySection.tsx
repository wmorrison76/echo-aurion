import {
  ShieldCheck,
  ShieldHalf,
  Mail,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import type { AuthenticatedProfile } from "@shared/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
interface ProfileIdentitySectionProps {
  identity: AuthenticatedProfile["identity"];
}
export function ProfileIdentitySection({
  identity,
}: ProfileIdentitySectionProps) {
  const riskBadge = resolveRiskBadge(identity.riskTier);
  const guardrailIcons = {
    Zelda: <ShieldCheck className="h-4 w-4 text-aurum-200" />,
    Argus: <ShieldAlert className="h-4 w-4 text-aurum-200" />,
    Phoenix: <ShieldHalf className="h-4 w-4 text-aurum-200" />,
  } as const;
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        {" "}
        <div className="flex items-start gap-5">
          {" "}
          <Avatar className="h-20 w-20 border border-border/30 bg-surface-variant/60">
            {" "}
            <AvatarImage
              src={identity.avatarUrl ?? undefined}
              alt={identity.name}
            />{" "}
            <AvatarFallback className="bg-surface-variant/80 text-lg text-aurum-200">
              {" "}
              {initials(identity.name)}{" "}
            </AvatarFallback>{" "}
          </Avatar>{" "}
          <div className="space-y-3">
            {" "}
            <div>
              {" "}
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-aurum-200">
                Authenticated Profile
              </p>{" "}
              <h1 className="mt-2 text-3xl font-semibold text-foreground">
                {identity.name}
              </h1>{" "}
              <p className="text-sm text-muted-foreground">
                {identity.title} · {identity.department}
              </p>{" "}
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                {identity.entity}
              </p>{" "}
            </div>{" "}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {" "}
              <span className="flex items-center gap-2">
                {" "}
                <Mail className="h-4 w-4 text-aurum-200" />{" "}
                <a
                  href={`mailto:${identity.email}`}
                  className="underline-offset-2 hover:underline"
                >
                  {" "}
                  {identity.email}{" "}
                </a>{" "}
              </span>{" "}
              <span className="flex items-center gap-2">
                {" "}
                <MapPin className="h-4 w-4 text-aurum-200" />{" "}
                {identity.timezone.replace("_", "")}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex flex-wrap items-center gap-2">
              {" "}
              <Badge
                variant="secondary"
                className="border border-border/40 bg-surface-variant/60 text-xs uppercase tracking-[0.22em] text-muted-foreground"
              >
                {" "}
                {identity.authenticationProvider}{" "}
              </Badge>{" "}
              <Badge
                variant="outline"
                className={`border ${riskBadge.border} bg-surface-variant/40 text-xs uppercase tracking-[0.22em] ${riskBadge.text}`}
              >
                {" "}
                {riskBadge.label}{" "}
              </Badge>{" "}
              {identity.mfaEnrolled ? (
                <Badge className="border border-emerald-400/40 bg-emerald-500/10 text-xs uppercase tracking-[0.22em] text-emerald-200">
                  {" "}
                  MFA enrolled{" "}
                </Badge>
              ) : (
                <Badge className="border border-red-500/40 bg-red-500/10 text-xs uppercase tracking-[0.22em] text-red-200">
                  {" "}
                  MFA required{" "}
                </Badge>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid gap-4">
          {" "}
          <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5">
            {" "}
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Risk posture
            </p>{" "}
            <p className="mt-2 text-sm text-muted-foreground/80">
              Risk score {identity.riskScore} · Last login{" "}
              {formatDateTime(identity.lastLoginAt)}
            </p>{" "}
            <p className="mt-2 text-sm text-muted-foreground">
              {" "}
              Compliance coverage {identity.complianceCoveragePercent}% across
              guardrail mesh.{" "}
            </p>{" "}
            <div className="mt-4 flex flex-wrap gap-2">
              {" "}
              {identity.guardrails.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-aurum-300/40 bg-aurum-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-aurum-200"
                >
                  {" "}
                  {guardrailIcons[
                    item.split("")[0] as keyof typeof guardrailIcons
                  ] ?? <ShieldCheck className="h-4 w-4 text-aurum-200" />}{" "}
                  {item}{" "}
                </span>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5">
            {" "}
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Key responsibilities
            </p>{" "}
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {" "}
              {identity.responsibilities.map((responsibility) => (
                <li key={responsibility}>• {responsibility}</li>
              ))}{" "}
            </ul>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
function initials(name: string) {
  return name
    .split("")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function resolveRiskBadge(tier: AuthenticatedProfile["identity"]["riskTier"]) {
  switch (tier) {
    case "elevated":
      return {
        label: "Elevated risk",
        text: "text-red-200",
        border: "border-red-500/40",
      };
    case "moderate":
      return {
        label: "Moderate risk",
        text: "text-amber-200",
        border: "border-amber-400/40",
      };
    default:
      return {
        label: "Low risk",
        text: "text-emerald-200",
        border: "border-emerald-400/40",
      };
  }
}
