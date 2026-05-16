import React, { useEffect, useRef, useState } from 'react'
import { Layer, Line } from 'react-konva'
import type Konva from 'konva'
import { useStudioStore } from '../../engine/store/useStudioStore'

export function SelectionOverlay(){
  const selection = useStudioStore(s=>s.selection)
  const [dashOffset, setDashOffset] = useState(0)
  const animRef = useRef<Konva.Animation | null>(null)

  useEffect(()=>{
    const id = setInterval(()=> setDashOffset(prev => (prev + 1) % 16), 50)
    return ()=> clearInterval(id)
  }, [])

  if (selection.length===0) return null
  return (
    <Layer listening={false}>
      {selection.map((poly, i) => (
        <Line key={i}
          points={poly.flatMap(p => [p.x, p.y])}
          closed
          stroke="#ffffff"
          strokeWidth={1}
          dash={[6, 4]}
          dashOffset={dashOffset}
        />
      ))}
      {selection.map((poly, i) => (
        <Line key={'b'+i}
          points={poly.flatMap(p => [p.x, p.y])}
          closed
          stroke="#000000"
          strokeWidth={1}
          dash={[6, 4]}
          dashOffset={(dashOffset+6)%16}
        />
      ))}
    </Layer>
  )
}

export default SelectionOverlay;
