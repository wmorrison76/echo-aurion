import React, { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'
import Konva from 'konva'
import { useStudioStore } from '../../engine/store/useStudioStore'

/**
 * ActiveTransformer v2
 * - Uses Konva.Transformer with 8 resize anchors and rotation handle
 * - Shift = keep aspect
 * - Alt = centered scaling
 * - Optional snapping-to-angles (15°) from store
 */
export function ActiveTransformer({ stage }: { stage: Konva.Stage | null }){
  const trRef = useRef<any>(null)
  const activeId = useStudioStore(s=>s.activeLayerId)
  const snapAngle = useStudioStore(s=>s.transformSnapAngle)
  const keepAspectByDefault = useStudioStore(s=>s.transformKeepAspectByDefault)
  const centeredByDefault = useStudioStore(s=>s.transformCenteredByDefault)

  useEffect(()=>{
    const stageNode = stage
    const tr = trRef.current
    if (!stageNode || !tr) return
    const layer = stageNode.findOne('.konvajs-content') // not used
    const node = stageNode.findOne(`.layer-${activeId}`) || stageNode.findOne(`[name=layer-${activeId}]`)
    if (!node){
      tr.nodes([]); tr.getLayer()?.batchDraw()
      return
    }
    tr.nodes([node])
    tr.rotationSnaps(snapAngle ? Array.from({length:24}, (_,i)=>i*15) : [])
    tr.keepRatio(!!keepAspectByDefault)
    tr.centeredScaling(!!centeredByDefault)
    tr.anchorStroke('#6ee7b7')
    tr.anchorFill('#0f766e')
    tr.anchorSize(8)
    tr.borderStroke('#34d399')
    tr.borderDash([4,4])
    tr.rotateEnabled(true)
    tr.enabledAnchors(['top-left','top-center','top-right','middle-left','middle-right','bottom-left','bottom-center','bottom-right'])
    tr.getLayer()?.batchDraw()
  }, [stage, activeId, snapAngle, keepAspectByDefault, centeredByDefault])

  return <Transformer ref={trRef} />
}
