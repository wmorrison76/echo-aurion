import React from 'react'
import { Layer, Circle, Line } from 'react-konva'
import { useRetouchStore } from '../../engine/store/useRetouchStore'

export function RetouchOverlay({ cursor }: { cursor: {x:number;y:number} | null }){
  const size = useRetouchStore(s=>s.brushSize)
  const src = useRetouchStore(s=>s.cloneSource)

  if (!cursor && !src) return null

  return (
    <Layer listening={false}>
      {cursor && <Circle x={cursor.x} y={cursor.y} radius={size/2} stroke="#22d3ee" strokeWidth={1} dash={[4,3]} />}
      {src && (
        <>
          <Circle x={src.x} y={src.y} radius={8} stroke="#f43f5e" strokeWidth={2} />
          <Line points={[src.x-10,src.y, src.x+10,src.y, src.x,src.y-10, src.x,src.y+10]} stroke="#f43f5e" strokeWidth={1} />
        </>
      )}
    </Layer>
  )
}

export default RetouchOverlay;
