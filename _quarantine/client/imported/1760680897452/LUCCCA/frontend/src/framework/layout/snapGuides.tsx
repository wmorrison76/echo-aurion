import React from "react";
import type { Rect } from "./grid";

export interface SnapResult { x: number; y: number; vGuides: number[]; hGuides: number[]; }
const SNAP = 8;

export function getSnappedPosition(moving: Rect, others: Rect[]): SnapResult {
  let x = moving.x, y = moving.y;
  const vGuides: number[] = [], hGuides: number[] = [];
  for (const r of others) {
    const candidatesX = [r.x, r.x + r.w, r.x + r.w/2 - moving.w/2];
    for (const gx of candidatesX) { if (Math.abs(gx - x) <= SNAP) { x = gx; vGuides.push(gx); } }
    const candidatesY = [r.y, r.y + r.h, r.y + r.h/2 - moving.h/2];
    for (const gy of candidatesY) { if (Math.abs(gy - y) <= SNAP) { y = gy; hGuides.push(gy); } }
  }
  return { x, y, vGuides, hGuides };
}

export function SnapOverlay({ v=[], h=[] }:{ v?: number[]; h?: number[] }){
  return (
    <svg className="pointer-events-none absolute inset-0 z-[1500]">
      {v.map((x,i)=>(<line key={`v${i}`} x1={x} x2={x} y1={0} y2={"100%"} stroke="rgba(127,255,212,.65)" strokeWidth={1}/>))}
      {h.map((y,i)=>(<line key={`h${i}`} y1={y} y2={y} x1={0} x2={"100%"} stroke="rgba(127,255,212,.65)" strokeWidth={1}/>))}
    </svg>
  );
}
