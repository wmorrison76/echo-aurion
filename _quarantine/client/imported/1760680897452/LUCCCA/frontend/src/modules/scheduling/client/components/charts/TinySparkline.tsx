import { useMemo } from "react";

export default function TinySparkline({ a, b, height=22, width=80, colorA="#22d3ee", colorB="#60a5fa"}:{ a:number[]; b:number[]; height?:number; width?:number; colorA?:string; colorB?:string }){
  const { pa, pb } = useMemo(()=>{
    const max = Math.max(1, ...a, ...b);
    const scale = (arr:number[])=> arr.map((v,i)=> ({ x: (i/(Math.max(arr.length, b.length, a.length)-1))*width, y: height - (v/max)*height }));
    return { pa: scale(a), pb: scale(b) };
  },[a,b,height,width]);
  const path = (pts:{x:number;y:number}[])=> pts.map((p,i)=> `${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} aria-label="sparkline" className="opacity-80">
      <path d={path(pa)} stroke={colorA} fill="none" strokeWidth={1.5}/>
      <path d={path(pb)} stroke={colorB} fill="none" strokeWidth={1.5}/>
    </svg>
  );
}
