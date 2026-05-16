import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type Ctx = {
  value: string | undefined;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
};

const SelectCtx = createContext<Ctx | null>(null);
const useSelect = () => {
  const ctx = useContext(SelectCtx);
  if (!ctx) throw new Error("Select components must be used inside <Select>");
  return ctx;
};

type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
};
export function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const [open, setOpen] = useState(false);

  const ctx = useMemo<Ctx>(
    () => ({
      value: value ?? internal,
      setValue: (v) => {
        setInternal(v);
        onValueChange?.(v);
        setOpen(false);
      },
      open,
      setOpen,
    }),
    [value, internal, onValueChange, open]
  );

  return <SelectCtx.Provider value={ctx}>{children}</SelectCtx.Provider>;
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
export function SelectTrigger({ children, onClick, ...rest }: TriggerProps) {
  const { open, setOpen } = useSelect();
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={(e) => {
        setOpen(!open);
        onClick?.(e);
      }}
      className={["px-3 py-2 rounded-md border bg-white/70 dark:bg-slate-900/60 hover:bg-black/5 dark:hover:bg-cyan-500/10", rest.className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

type ContentProps = React.HTMLAttributes<HTMLDivElement>;
export function SelectContent({ children, style, ...rest }: ContentProps) {
  const { open } = useSelect();
  if (!open) return null;
  return (
    <div
      role="listbox"
      tabIndex={-1}
      style={{ marginTop: 6, minWidth: 180, maxHeight: 280, overflowY: "auto", ...style }}
      className={["rounded-md border bg-white dark:bg-slate-900 shadow-md p-1", rest.className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

type ItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string };
export function SelectItem({ value, children, onClick, ...rest }: ItemProps) {
  const { value: current, setValue } = useSelect();
  const selected = current === value;
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={(e) => {
        setValue(value);
        onClick?.(e);
      }}
      className={[
        "w-full text-left px-2 py-1.5 rounded",
        selected ? "bg-black/5 dark:bg-cyan-500/15 font-semibold" : "hover:bg-black/5 dark:hover:bg-cyan-500/10",
        rest.className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

type ValueProps = { placeholder?: React.ReactNode; className?: string };
export function SelectValue({ placeholder, className }: ValueProps) {
  const { value } = useSelect();
  return <span className={className}>{value ?? placeholder ?? "Select…"}</span>;
}

/** Optional: simple passthrough alias if some code imports a default */
export default Select;
