import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMenu } from "./SessionMenu";
interface SessionRequiredNoticeProps {
  title?: string;
  description: string;
  actionLabel?: string;
  className?: string;
}
export function SessionRequiredNotice({
  title = "Authentication required",
  description,
  actionLabel = "Authenticate",
  className,
}: SessionRequiredNoticeProps) {
  return (
    <div
      data-loc="client/modules/auth/components/SessionRequiredNotice.tsx:21:5"
      className={cn(
        "mt-5 flex flex-col gap-4 rounded-xl border border-aurum-400/40 bg-aurum-500/10 p-5 text-sm text-aurum-50",
        className,
      )}
    >
      {" "}
      <div className="flex items-start gap-3">
        {" "}
        <AlertTriangle className="mt-0.5 h-4 w-4 text-aurum-200" />{" "}
        <div data-loc="client/modules/auth/components/SessionRequiredNotice.tsx:27:7">
          {" "}
          <p className="font-semibold">{title}</p>{" "}
          <p className="mt-1 text-xs text-aurum-100/70">{description}</p>{" "}
        </div>{" "}
      </div>{" "}
      <div data-loc="client/modules/auth/components/SessionRequiredNotice.tsx:34:7">
        {" "}
        <SessionMenu buttonVariant="ghost" />{" "}
      </div>{" "}
    </div>
  );
}
