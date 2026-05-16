import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
interface HudCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
}
export function HudCard({
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
  footerClassName,
}: HudCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-none bg-transparent p-0 shadow-none",
        className,
      )}
    >
      {" "}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-card">
        {" "}
        <div className="pointer-events-none absolute inset-0">
          {" "}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.25),transparent_60%)]" />{" "}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.6),rgba(2,6,23,0.9))]" />{" "}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px)",
              backgroundSize: "100% 72px",
            }}
          />{" "}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)",
              backgroundSize: "72px 100%",
            }}
          />{" "}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />{" "}
        </div>{" "}
        <CardHeader className="relative z-10 pb-3">
          {" "}
          <CardTitle className="text-lg font-semibold tracking-wide text-cyan-100">
            {" "}
            {title}{" "}
          </CardTitle>{" "}
          {description ? (
            <CardDescription className="text-sm text-cyan-300/80">
              {" "}
              {description}{" "}
            </CardDescription>
          ) : null}{" "}
        </CardHeader>{" "}
        <CardContent
          className={cn("relative z-10 text-slate-100", bodyClassName)}
        >
          {" "}
          {children}{" "}
        </CardContent>{" "}
        {footer ? (
          <div
            className={cn(
              "relative z-10 border-t border-cyan-400/10 bg-card px-6 py-4 text-xs text-cyan-100/70",
              footerClassName,
            )}
          >
            {" "}
            {footer}{" "}
          </div>
        ) : null}{" "}
        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_35px_rgba(34,211,238,0.15)]" />{" "}
      </div>{" "}
    </Card>
  );
}
