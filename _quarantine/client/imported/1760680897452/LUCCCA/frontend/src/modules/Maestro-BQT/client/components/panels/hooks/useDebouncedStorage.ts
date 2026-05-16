import { useEffect, useMemo, useRef } from 'react';

export function useDebouncedStorage<T>(key: string, delay = 200) {
  const timer = useRef<number | null>(null);
  const queue = useRef<T | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const save = useMemo(() => (value: T) => {
    queue.current = value;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(queue.current)); } catch {}
      timer.current = null;
    }, delay);
  }, [key, delay]);

  return save;
}
