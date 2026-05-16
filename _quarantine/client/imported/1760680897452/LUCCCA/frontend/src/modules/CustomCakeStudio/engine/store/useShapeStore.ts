import { create } from 'zustand'

export type ShapeKind = 'rect' | 'ellipse' | 'polygon'

export const useShapeStore = create<{ 
  current: ShapeKind,
  stroke: string,
  fill: string,
  strokeWidth: number,
  set: (p: Partial<{current:ShapeKind; stroke:string; fill:string; strokeWidth:number}>) => void
}>(set => ({
  current: 'rect',
  stroke: '#ffffff',
  fill: 'transparent',
  strokeWidth: 2,
  set: (p) => set(s => ({ ...s, ...p }))
}))

export default useShapeStore;
