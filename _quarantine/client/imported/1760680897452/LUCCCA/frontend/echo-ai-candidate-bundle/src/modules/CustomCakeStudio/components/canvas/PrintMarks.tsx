import React from 'react'
import { Layer, Line, Rect } from 'react-konva'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { convertLength } from '../../engine/print/units'

export function PrintMarks(){
  const project = useStudioStore(s=>s.project)
  const print = useStudioStore(s=>s.print)

  if (!print.showMarks) return null

  const bleedPx = Math.round(convertLength(print.bleed, print.units, 'px', print.dpi))
  const marginPx = Math.round(convertLength(print.margin, print.units, 'px', print.dpi))
  const w = project.canvas.width, h = project.canvas.height

  const cropLen = 20
  const lines = [
    // top-left
    [0, bleedPx, cropLen, bleedPx],
    [bleedPx, 0, bleedPx, cropLen],
    // top-right
    [w - cropLen, bleedPx, w, bleedPx],
    [w - bleedPx, 0, w - bleedPx, cropLen],
    // bottom-left
    [0, h - bleedPx, cropLen, h - bleedPx],
    [bleedPx, h - cropLen, bleedPx, h],
    // bottom-right
    [w - cropLen, h - bleedPx, w, h - bleedPx],
    [w - bleedPx, h - cropLen, w - bleedPx, h],
  ]

  return (
    <Layer listening={false}>
      {/* Safe margin */}
      {marginPx>0 && (
        <Rect x={marginPx} y={marginPx} width={w - marginPx*2} height={h - marginPx*2}
          stroke="#00ff88" dash={[4,4]} opacity={0.5} />
      )}
      {/* Crop marks */}
      {bleedPx>0 && lines.map((p,i)=>(
        <Line key={i} points={p as any} stroke="#ffffff" strokeWidth={1} />
      ))}
    </Layer>
  )
}
