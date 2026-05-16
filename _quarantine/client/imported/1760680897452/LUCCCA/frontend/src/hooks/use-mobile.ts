import { useEffect, useState } from 'react';
export default function useMobile(breakpoint=768){
  const [isMobile, set] = useState(false);
  useEffect(()=>{ const q=window.matchMedia(`(max-width:${breakpoint}px)`); const on=()=>set(q.matches); on(); q.addEventListener?.('change',on); return ()=>q.removeEventListener?.('change',on); },[breakpoint]);
  return isMobile;
}
