/**
 * MixologyWheel.jsx
 * Interactive SVG wheel for spirits/notes; emits selection events.
 * Pure React + SVG; no external chart libs.
 */
import React, { useMemo, useState } from "react";
import taxonomy from "../lib/flavor-taxonomy.json";
import { polarToCartesian } from "../lib/wheel-utils.js";

export default function MixologyWheel({ onSelect, size=360 }){
  const [active, setActive] = useState(null);
  const categories = taxonomy.categories;
  const radius = size/2;
  const cx = radius, cy = radius;

  const slices = useMemo(()=>{
    const count = categories.length;
    const arc = (2*Math.PI)/count;
    return categories.map((cat, i)=> ({
      cat,
      start: i*arc,
      end: (i+1)*arc
    }));
  }, [categories]);

  const ringR = { inner: radius*0.45, outer: radius*0.95 };

  function arcPath(start, end, r1, r2){
    const p1 = polarToCartesian(cx, cy, r2, end);
    const p2 = polarToCartesian(cx, cy, r2, start);
    const p3 = polarToCartesian(cx, cy, r1, start);
    const p4 = polarToCartesian(cx, cy, r1, end);
    const large = end-start > Math.PI ? 1 : 0;
    return [
      `M ${p1.x} ${p1.y}`,
      `A ${r2} ${r2} 0 ${large} 0 ${p2.x} ${p2.y}`,
      `L ${p3.x} ${p3.y}`,
      `A ${r1} ${r1} 0 ${large} 1 ${p4.x} ${p4.y}`,
      "Z"
    ].join(" ");
  }

  return (
    <div className="mixology-wheel inline-block" style={{width:size, height:size}}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {slices.map((s, idx)=>{
          const path = arcPath(s.start, s.end, ringR.inner, ringR.outer);
          const isActive = active===idx;
          return (
            <path key={idx} d={path}
              onMouseEnter={()=>setActive(idx)}
              onMouseLeave={()=>setActive(null)}
              onClick={()=> onSelect && onSelect(s.cat)}
              style={{ fill: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", cursor:"pointer" }}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1"
            />
          );
        })}

        {/* labels */}
        {slices.map((s, idx)=>{
          const mid = (s.start + s.end)/2;
          const p = polarToCartesian(cx, cy, (ringR.inner+ringR.outer)/2, mid);
          return (
            <text key={`t-${idx}`} x={p.x} y={p.y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="white" opacity="0.9">
              {s.cat.name}
            </text>
          );
        })}

        {/* center */}
        <circle cx={cx} cy={cy} r={radius*0.35} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" />
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="12" fill="white" opacity="0.9">Mixology Wheel</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill="white" opacity="0.7">
          {active!=null ? categories[active].name : "Select a category"}
        </text>
      </svg>
    </div>
  );
}
