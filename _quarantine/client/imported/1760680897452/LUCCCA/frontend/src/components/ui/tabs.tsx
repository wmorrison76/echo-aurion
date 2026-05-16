import React, { createContext, useContext, useMemo, useState } from "react";

// ---------- context ----------
type TabsContextT = {
  value: string;
  setValue: (v: string) => void;
  onValueChange?: (v: string) => void;
};
const TabsCtx = createContext<TabsContextT | null>(null);
const useTabs = () => {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
};

// ---------- root ----------
type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
};
export function Tabs({ value, defaultValue, onValueChange, children, ...rest }: TabsProps) {
  const [internal, setInternal] = useState<string>(defaultValue ?? "");
  const current = value ?? internal;

  const ctx = useMemo(
    () => ({
      value: current,
      setValue: (v: string) => {
        setInternal(v);
        onValueChange?.(v);
      },
      onValueChange,
    }),
    [current, onValueChange]
  );

  return (
    <TabsCtx.Provider value={ctx}>
      <div {...rest}>{children}</div>
    </TabsCtx.Provider>
  );
}

// ---------- subcomponents ----------
export function TabsList(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" {...props} />;
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string };
export function TabsTrigger({ value, onClick, className, ...rest }: TabsTriggerProps) {
  const { value: current, setValue } = useTabs();
  const selected = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-state={selected ? "active" : "inactive"}
      onClick={(e) => {
        setValue(value);
        onClick?.(e);
      }}
      className={[
        "px-3 py-1.5 rounded-md",
        selected ? "bg-black/5 dark:bg-cyan-500/15 font-semibold" : "hover:bg-black/5 dark:hover:bg-cyan-500/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & { value: string };
export function TabsContent({ value, hidden, style, ...rest }: TabsContentProps) {
  const { value: current } = useTabs();
  const show = current === value;
  return (
    <div
      role="tabpanel"
      hidden={!show || hidden}
      style={{ display: show ? undefined : "none", ...style }}
      {...rest}
    />
  );
}

// Some code referenced `Tab`; provide a simple passthrough.
export const Tab = React.forwardRef<any, any>(function Tab(props, ref) {
  return React.createElement(props?.as || "div", { ref, ...props }, props?.children);
});

// default export (not used by shadcn, but safe if something imports default)
export default Tabs;
