import React from "react";

export function Card({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["rounded-lg border p-3 bg-white/70 dark:bg-slate-900/60", props.className].join(" ")}>{children}</div>;
}
export function CardHeader({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["mb-2 font-semibold", props.className].join(" ")}>{children}</div>;
}
export function CardTitle({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={["text-lg font-bold", props.className].join(" ")}>{children}</h3>;
}
export function CardDescription({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={["text-sm opacity-70", props.className].join(" ")}>{children}</p>;
}
export function CardContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}

export default Card;
