import React, { useMemo } from 'react'
import { Layer, Circle, Rect, Line } from 'react-konva'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { useGridStore } from '../../engine/store/useGridStore'
import { computeGridPoints } from '../../engine/grid/compute'

export function GridOverlay(){
  const g = useGridStore(s=>s.grid)
  const canvas = useStudioStore(s=>s.project.canvas)

  const pts = useMemo(()=>{
    if (!g.enabled) return []
    return computeGridPoints(canvas.width, canvas.height, canvas.dpi, g)
  }, [g, canvas.width, canvas.height, canvas.dpi])

  if (!g.enabled) return null

  return (
    <Layer listening={false}>
      {pts.map((p, i)=> (
        g.shape==='circle'
        ? <Circle key={i} x={p.cx} y={p.cy} radius={Math.min(p.rx, p.ry)} stroke="#8b5cf6" strokeWidth={1} dash={[4,3]} />
        : <Rect key={i} x={p.cx-p.rx} y={p.cy-p.ry} width={p.rx*2} height={p.ry*2} stroke="#8b5cf6" strokeWidth={1} dash={[4,3]} cornerRadius={4} />
      ))}
      {g.showCenters && pts.map((p,i)=> (
        <Line key={'c'+i} points={[p.cx-6,p.cy, p.cx+6,p.cy, p.cx,p.cy-6, p.cx,p.cy+6]} stroke="#8b5cf6" strokeWidth={1} />
      ))}
    </Layer>
  )
}

export default GridOverlay;
