import * as React from "react";

export function Dialog(props: React.HTMLAttributes<HTMLDivElement> & {open?: boolean; onOpenChange?: (v:boolean)=>void}) {
  return <>{props.children}</>;
}

export function DialogContent({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="dialog" {...rest}>{children}</div>;
}

export function DialogHeader({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest}>{children}</div>;
}

export function DialogTitle({ children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...rest}>{children}</h3>;
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; children: React.ReactNode };
export function DialogTrigger({ asChild, children, ...rest }: TriggerProps) {
  if (asChild && React.isValidElement(children)) {
    // Radix-style asChild: don't add extra DOM; pass props into child
    return React.cloneElement(children as React.ReactElement, { ...rest, ...(children as any).props });
  }
  return <button type="button" {...rest}>{children}</button>;
}

export const DialogDescription = (props: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props} />;
export const DialogFooter = (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />;
