import * as React from "react";

export type ToastRecord = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  // allow extra props (variant, duration, etc.)
  [key: string]: any;
};

let _toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function toast(input: Omit<ToastRecord, "id">) {
  const id = Math.random().toString(36).slice(2);
  _toasts = [..._toasts, { id, ...input }];
  notify();
  return { id };
}

export function dismiss(id?: string) {
  _toasts = id ? _toasts.filter((t) => t.id !== id) : [];
  notify();
}

export function useToast() {
  const [state, setState] = React.useState<ToastRecord[]>(_toasts);
  React.useEffect(() => {
    const l = () => setState([..._toasts]);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return { toasts: state, toast, dismiss };
}
