import { useCallback } from 'react';
import { useLatest } from './useLatest';

export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const latest = useLatest(fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(((...args: any[]) => latest.current(...args)) as T, []);
}
