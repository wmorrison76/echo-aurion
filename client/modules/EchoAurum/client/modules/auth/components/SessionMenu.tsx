import { Loader2, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { Fragment } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "../../../../shared/auth";
import type { SessionGuardrail } from "../../../../shared/session";
import { useSession } from "../hooks/useSession";
function initialsFromName(name: string) {
  return (
    name
      .split("")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "LU"
  );
}
const GUARDRAIL_TONE: Record<SessionGuardrail["status"], string> = {
  active: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  monitoring: "border-amber-400/50 bg-amber-500/10 text-amber-200",
  bypassed: "border-rose-400/50 bg-rose-500/10 text-rose-200",
};
interface SessionMenuProps {
  buttonVariant?: "primary" | "ghost";
}
export function SessionMenu({ buttonVariant = "primary" }: SessionMenuProps) {
  const { toast } = useToast();
  const {
    session,
    personas,
    status,
    personasLoading,
    issueSession,
    revokeCurrentSession,
    issuing,
    revoking,
  } = useSession();
  const isAuthenticating = issuing || status === "loading";
  const renderPersonaItems = () => {
    if (personasLoading) {
      return (
        <DropdownMenuItem disabled className="justify-between">
          {" "}
          Loading personas{" "}
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />{" "}
        </DropdownMenuItem>
      );
    }
    if (personas.length === 0) {
      return (
        <DropdownMenuItem disabled>No personas available</DropdownMenuItem>
      );
    }
    return personas.map((persona) => (
      <DropdownMenuItem
        key={persona.id}
        disabled={issuing && session?.personaId !== persona.id}
        onSelect={async (event) => {
          event.preventDefault();
          try {
            const newSession = await issueSession(persona.id);
            toast({
              title: `Authenticated as ${newSession.name}`,
              description: `${ROLE_LABELS[newSession.role]} access granted`,
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Unable to authenticate.";
            toast({
              title: "Authentication failed",
              description: message,
              variant: "destructive",
            });
          }
        }}
        className="flex items-start gap-3"
      >
        {" "}
        <Avatar className="h-8 w-8">
          {" "}
          <AvatarImage src={persona.avatarUrl} alt={persona.name} />{" "}
          <AvatarFallback>{initialsFromName(persona.name)}</AvatarFallback>{" "}
        </Avatar>{" "}
        <div className="flex-1">
          {" "}
          <p className="text-sm font-semibold text-foreground">
            {" "}
            {persona.name}{" "}
          </p>{" "}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {" "}
            {persona.title}{" "}
          </p>{" "}
          <p className="mt-1 text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground/80">
            {" "}
            {ROLE_LABELS[persona.role]}{" "}
          </p>{" "}
        </div>{" "}
      </DropdownMenuItem>
    ));
  };
  if (!session) {
    return (
      <DropdownMenu>
        {" "}
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({
              variant: buttonVariant === "primary" ? "outline" : "ghost",
              size: buttonVariant === "primary" ? "sm" : "icon",
            }),
            buttonVariant === "ghost" && "ml-2",
          )}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Authenticate"
          )}
        </DropdownMenuTrigger>{" "}
        <DropdownMenuContent align="end" className="w-80">
          {" "}
          <DropdownMenuLabel>
            Choose a LUCCCA finance persona
          </DropdownMenuLabel>{" "}
          <DropdownMenuSeparator /> {renderPersonaItems()}{" "}
        </DropdownMenuContent>{" "}
      </DropdownMenu>
    );
  }
  return (
    <DropdownMenu>
      {" "}
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({
            variant: buttonVariant === "primary" ? "outline" : "ghost",
            size: buttonVariant === "primary" ? "sm" : "icon",
          }),
          "gap-2",
          buttonVariant === "ghost" && "ml-2 px-2",
        )}
        disabled={revoking}
      >
        <span className="inline-flex items-center gap-2">
          {" "}
          <Avatar className="h-7 w-7">
            {" "}
            <AvatarImage src={session.avatarUrl} alt={session.name} />{" "}
            <AvatarFallback>
              {initialsFromName(session.name)}
            </AvatarFallback>{" "}
          </Avatar>{" "}
          {buttonVariant === "primary" ? (
            <div className="flex flex-col items-start">
              {" "}
              <span className="text-sm font-semibold text-foreground">
                {" "}
                {session.name}{" "}
              </span>{" "}
              <span className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground/80">
                {" "}
                {ROLE_LABELS[session.role]}{" "}
              </span>{" "}
            </div>
          ) : null}{" "}
        </span>
      </DropdownMenuTrigger>{" "}
      <DropdownMenuContent align="end" className="w-96">
        {" "}
        <DropdownMenuLabel>
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <Avatar className="h-9 w-9">
              {" "}
              <AvatarImage src={session.avatarUrl} alt={session.name} />{" "}
              <AvatarFallback>
                {initialsFromName(session.name)}
              </AvatarFallback>{" "}
            </Avatar>{" "}
            <div>
              {" "}
              <p className="text-sm font-semibold text-foreground">
                {" "}
                {session.name}{" "}
              </p>{" "}
              <p className="text-xs text-muted-foreground">
                {session.email}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </DropdownMenuLabel>{" "}
        <DropdownMenuSeparator />{" "}
        <DropdownMenuLabel>Guardrail posture</DropdownMenuLabel>{" "}
        {session.guardrails.map((guardrail) => (
          <DropdownMenuItem
            key={guardrail.id}
            disabled
            className="flex items-start gap-3"
          >
            {" "}
            <ShieldCheck className="mt-0.5 h-4 w-4 text-aurum-200" />{" "}
            <div className="flex-1">
              {" "}
              <p className="text-sm font-semibold text-foreground">
                {" "}
                {guardrail.name}{" "}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground/80">
                {" "}
                {guardrail.description}{" "}
              </p>{" "}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {" "}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[0.65rem]",
                    GUARDRAIL_TONE[guardrail.status],
                  )}
                >
                  {" "}
                  {guardrail.status === "active"
                    ? "Enforced"
                    : guardrail.status === "monitoring"
                      ? "Monitoring"
                      : "Bypassed"}{" "}
                </Badge>{" "}
                {guardrail.lastValidatedAt ? (
                  <span className="text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
                    {" "}
                    {new Date(guardrail.lastValidatedAt).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}{" "}
                  </span>
                ) : null}{" "}
              </div>{" "}
            </div>{" "}
          </DropdownMenuItem>
        ))}{" "}
        <DropdownMenuSeparator />{" "}
        <DropdownMenuLabel>Switch persona</DropdownMenuLabel>{" "}
        {personas
          .filter((persona) => persona.id !== session.personaId)
          .map((persona, index) => (
            <Fragment key={persona.id}>
              {" "}
              <DropdownMenuItem
                onSelect={async (event) => {
                  event.preventDefault();
                  try {
                    const newSession = await issueSession(persona.id);
                    toast({
                      title: `Switched to ${newSession.name}`,
                      description: `${ROLE_LABELS[newSession.role]} access granted`,
                    });
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Unable to switch personas.";
                    toast({
                      title: "Switch failed",
                      description: message,
                      variant: "destructive",
                    });
                  }
                }}
                className="flex items-start gap-3"
              >
                {" "}
                <Avatar className="h-8 w-8">
                  {" "}
                  <AvatarImage
                    src={persona.avatarUrl}
                    alt={persona.name}
                  />{" "}
                  <AvatarFallback>
                    {" "}
                    {initialsFromName(persona.name)}{" "}
                  </AvatarFallback>{" "}
                </Avatar>{" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {" "}
                    {persona.name}{" "}
                  </p>{" "}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {" "}
                    {persona.title}{" "}
                  </p>{" "}
                  <p className="mt-1 text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground/80">
                    {" "}
                    {ROLE_LABELS[persona.role]}{" "}
                  </p>{" "}
                </div>{" "}
              </DropdownMenuItem>{" "}
              {index === personas.length - 2 ? (
                <DropdownMenuSeparator />
              ) : null}{" "}
            </Fragment>
          ))}{" "}
        <DropdownMenuSeparator />{" "}
        <DropdownMenuItem
          onSelect={async (event) => {
            event.preventDefault();
            try {
              await revokeCurrentSession();
              toast({
                title: "Signed out",
                description: "Session revoked successfully.",
              });
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Unable to sign out.";
              toast({
                title: "Sign out failed",
                description: message,
                variant: "destructive",
              });
            }
          }}
          className="flex items-center gap-2 text-red-400 focus:text-red-300"
        >
          {" "}
          <LogOut className="h-4 w-4" /> Sign out{" "}
        </DropdownMenuItem>{" "}
      </DropdownMenuContent>{" "}
    </DropdownMenu>
  );
}
