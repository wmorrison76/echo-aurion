import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Alert({ className, ...props }: DivProps) {
  return (
    <div
      role="alert"
      className={[
        "rounded-md border px-3 py-2 bg-white/70 dark:bg-slate-900/60",
        "border-black/10 dark:border-white/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={["text-sm font-semibold mb-1", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={["text-sm opacity-80", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export default Alert;
