import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
};
const C = createContext<Ctx | null>(null);
const useDM = () => {
  const ctx = useContext(C);
  if (!ctx) throw new Error("DropdownMenu subcomponents must be used inside <DropdownMenu>");
  return ctx;
};

type RootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: React.ReactNode;
};
export function DropdownMenu({ open, defaultOpen, onOpenChange, children }: RootProps) {
  const [internal, setInternal] = useState(!!defaultOpen);
  const triggerRef = useRef<HTMLElement>(null);
  const stateOpen = open ?? internal;

  const ctx = useMemo<Ctx>(
    () => ({
      open: stateOpen,
      setOpen: (v) => {
        setInternal(v);
        onOpenChange?.(v);
      },
      triggerRef,
    }),
    [stateOpen, onOpenChange]
  );

  return <C.Provider value={ctx}>{children}</C.Provider>;
}

type TriggerProps = React.HTMLAttributes<HTMLElement> & { asChild?: boolean };
export function DropdownMenuTrigger({ asChild, onClick, ...rest }: TriggerProps) {
  const { open, setOpen, triggerRef } = useDM();
  const Comp: any = asChild ? "span" : "button";
  return (
    <Comp
      ref={triggerRef as any}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e: any) => {
        setOpen(!open);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

type ContentProps = React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "center" };
export function DropdownMenuContent({ style, align = "end", ...rest }: ContentProps) {
  const { open, setOpen, triggerRef } = useDM();
  if (!open) return null;

  // crude positioning relative to trigger
  const rect = triggerRef.current?.getBoundingClientRect();
  const left =
    align === "start"
      ? rect?.left ?? 0
      : align === "center"
      ? (rect?.left ?? 0) + (rect?.width ?? 0) / 2
      : (rect?.right ?? 0);

  return (
    <div
      role="menu"
      tabIndex={-1}
      style={{
        position: "fixed",
        top: (rect?.bottom ?? 0) + 6,
        left,
        transform: align === "center" ? "translateX(-50%)" : align === "end" ? "translateX(-100%)" : undefined,
        zIndex: 1000,
        minWidth: 200,
        background: "var(--bg, white)",
        color: "inherit",
        borderRadius: 8,
        border: "1px solid rgba(0,0,0,0.1)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
        padding: 6,
        ...style,
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      {...rest}
    />
  );
}

type ItemProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
export function DropdownMenuItem({ onClick, className, ...rest }: ItemProps) {
  const { setOpen } = useDM();
  return (
    <button
      role="menuitem"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={[
        "w-full text-left px-2 py-1.5 rounded",
        "hover:bg-black/5 dark:hover:bg-cyan-500/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

export function DropdownMenuLabel(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["px-2 py-1 text-xs opacity-70", props.className].filter(Boolean).join(" ")} />;
}
export function DropdownMenuSeparator(props: React.HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} className={["my-1 border-black/10 dark:border-white/10", props.className].filter(Boolean).join(" ")} />;
}

/** default export (safe if someone imports default) */
export default DropdownMenu;
