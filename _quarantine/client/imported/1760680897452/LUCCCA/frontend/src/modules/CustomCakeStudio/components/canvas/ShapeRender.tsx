import React from 'react'
import { Rect, Circle, Line } from 'react-konva'
import type { ShapeLayer } from '../../engine/shapes/types'

export function ShapeRender({ layer, common }: { layer: ShapeLayer, common: any }){
  const S = layer.shape
  const fill = S.fill && S.fill!=='transparent' ? S.fill : undefined
  const stroke = S.stroke || '#ffffff'
  const strokeWidth = S.strokeWidth ?? 2

  if (S.kind === 'rect'){
    return <Rect {...common} x={layer.transform.x} y={layer.transform.y}
      width={S.width||100} height={S.height||100}
      stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
  }
  if (S.kind === 'ellipse'){
    const rx = (S.width||100)/2, ry = (S.height||100)/2
    return <Circle {...common} x={layer.transform.x+rx} y={layer.transform.y+ry}
      radius={Math.max(rx, ry)} scaleX={rx/Math.max(rx,ry)} scaleY={ry/Math.max(rx,ry)}
      stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
  }
  if (S.kind === 'polygon'){
    const pts = (S.points||[]).flatMap(p => [p.x, p.y])
    return <Line {...common} x={layer.transform.x} y={layer.transform.y}
      points={pts} closed stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
  }
  return null
}

export default ShapeRender;
