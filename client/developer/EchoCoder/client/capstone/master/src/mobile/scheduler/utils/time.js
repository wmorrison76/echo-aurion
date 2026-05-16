/**
 * Time utilities for the mobile scheduler.
 */
export const HOUR = 3600000;
export const DAY  = 86400000;

export function toLocalISO(ms){
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

export function clampRange(startMs, endMs){
  const s = Math.max(0, Number(startMs)||0);
  const e = Math.max(s, Number(endMs)||s);
  return [s,e];
}

export function overlaps(aStart, aEnd, bStart, bEnd){
  return aStart < bEnd && bStart < aEnd;
}
