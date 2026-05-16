import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Image as KImage, Text as KText, Group } from 'react-konva'
import Konva from 'konva'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { getTool } from '../../engine/tools'
import type { Tool } from '../../engine/tools/Tool'
import type { RasterLayer, TextLayer } from '../../engine/types'
import type { ShapeLayer } from '../../engine/shapes/types'
import { getRenderSurface } from '../../engine/composite/getRenderSurface'
import { SelectionOverlay } from './SelectionOverlay'
import { ActiveTransformer } from './ActiveTransformer'
import { PrintMarks } from './PrintMarks'
import { ImageImporter } from '../../engine/assets/ImageImporter'
import { useClipboardImport } from '../../hooks/useClipboardImport'
import { cssSoftProofFilter } from '../../engine/print/softproof'
import { GridOverlay } from './GridOverlay'
import { useGridStore } from '../../engine/store/useGridStore'
import { snapNodeToGrid } from '../../engine/grid/snap'
import { ShapeRender } from './ShapeRender'

export function StageCanvas(){
  const stageRef = useRef<Konva.Stage>(null)
  const [isSpacePan, setIsSpacePan] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useClipboardImport()

  const project = useStudioStore(s=>s.project)
  const activeToolId = useStudioStore(s=>s.activeTool)
  const activeLayerId = useStudioStore(s=>s.activeLayerId)
  const setActiveLayer = useStudioStore(s=>s.setActiveLayer)
  const softProofOn = useStudioStore(s=>s.print.softProofOn)
  const print = useStudioStore(s=>s.print)
  const grid = useGridStore(s=>s.grid)

  useEffect(()=>{
    if (project.layers.length === 0){
      useStudioStore.getState().addRasterLayer('Base')
    }
  }, [project.layers.length])

  useEffect(()=>{
    const down = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); setIsSpacePan(true) } }
    const up   = (e: KeyboardEvent) => { if (e.code === 'Space') { setIsSpacePan(false) } }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return ()=>{ window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const tool: Tool | null = useMemo(()=> getTool(isSpacePan ? 'hand' : (activeToolId as any)), [activeToolId, isSpacePan])
  const ctx = useMemo(()=>({ stage: stageRef.current as any }), [stageRef.current])

  const onWheel = (e: any) => {
    e.evt.preventDefault()
    const stage = stageRef.current; if(!stage) return
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition(); if(!pointer) return
    const scaleBy = 1.05
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale }
    stage.scale({ x: newScale, y: newScale })
    stage.position({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale })
    stage.batchDraw()
  }

  const onPointerDown = (e:any) => { tool?.onPointerDown(e, ctx) }
  const onPointerMove = (e:any) => { tool?.onPointerMove(e, ctx) }
  const onPointerUp   = (e:any) => { tool?.onPointerUp(e, ctx) }

  const draggable = activeToolId === 'move' && !isSpacePan

  const onDragOverDoc = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const onDragLeaveDoc = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false) }
  const onDropDoc = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const dt = e.dataTransfer
    if (!dt) return
    if (dt.files && dt.files.length){
      for (const f of Array.from(dt.files)){
        if (f.type.startsWith('image/')){
          await ImageImporter.importFile(f)
        }
      }
      return
    }
    const url = dt.getData('text/uri-list') || dt.getData('text/plain')
    if (url && /^https?:\/\//i.test(url)){
      await ImageImporter.importUrl(url.trim())
    }
  }

  const proofFilter = softProofOn ? cssSoftProofFilter(1) : 'none'
  const bleedPx = Math.round((print.bleed||0) * (print.units==='px' ? 1 : (print.units==='in' ? print.dpi : (print.units==='mm' ? print.dpi/25.4 : print.dpi/2.54))))

  return (
    <div className="flex-1 overflow-auto bg-gray-950 flex items-center justify-center"
         onDragOver={onDragOverDoc} onDragLeave={onDragLeaveDoc} onDrop={onDropDoc}>
      <div className={"bg-checker p-6 relative " + (dragOver ? "ring-2 ring-emerald-500" : "")} style={{ filter: proofFilter }}>
        {dragOver && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="px-4 py-2 bg-emerald-900/70 border border-emerald-600 rounded text-xs">
              Drop images to import
            </div>
          </div>
        )}
        {softProofOn && (
          <div className="absolute top-1 right-2 px-2 py-1 text-[10px] bg-amber-900/60 border border-amber-600 rounded pointer-events-none">
            Soft‑Proof (CMYK sim)
          </div>
        )}
        <Stage
          ref={stageRef}
          width={project.canvas.width}
          height={project.canvas.height}
          onWheel={onWheel}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          className="shadow-2xl ring-1 ring-gray-800 bg-transparent">
          <Layer listening={false}>
            <Rect x={0} y={0} width={project.canvas.width} height={project.canvas.height} fillEnabled={false} />
            {bleedPx>0 && (
              <Rect x={-bleedPx} y={-bleedPx} width={project.canvas.width+bleedPx*2} height={project.canvas.height+bleedPx*2}
                stroke="#f59e0b" strokeWidth={1} dash={[4,3]} />
            )}
          </Layer>

          <GridOverlay />

          <Layer>
            {project.layers.map(l => {
              if (!l.visible) return null
              const isActive = l.id === activeLayerId
              const common = {
                name: `layer-${l.id}`,
                draggable: draggable && !l.locked,
                onDragEnd: (evt:any)=>{
                  const node = evt.target
                  if (grid.enabled && grid.snapEnabled){
                    snapNodeToGrid(node, project.canvas, grid as any)
                  }
                  useStudioStore.getState().updateActiveLayerTransform({ x: node.x(), y: node.y() })
                },
                onTransformEnd: (evt:any)=>{
                  const node = evt.target
                  const scaleX = node.scaleX()
                  const scaleY = node.scaleY()
                  const rotation = node.rotation()
                  const x = node.x(), y = node.y()
                  const scale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2
                  useStudioStore.getState().updateActiveLayerTransform({ x, y, rotation, scale })
                  node.scale({x:1,y:1})
                }
              } as any
              if (l.type === 'raster') {
                const R = l as RasterLayer
                const surf = getRenderSurface(R, project)
                return (
                  <Group key={l.id}>
                    <KImage
                      {...common}
                      image={surf}
                      x={R.transform.x} y={R.transform.y}
                      scaleX={R.transform.scale} scaleY={R.transform.scale}
                      rotation={R.transform.rotation}
                      opacity={R.opacity} />
                  </Group>
                )
              }
              if (l.type === 'text') {
                const T = l as TextLayer
                return (
                  <Group key={l.id}>
                    <KText
                      {...common}
                      text={T.text}
                      x={T.transform.x} y={T.transform.y}
                      fontFamily={T.font} fontSize={T.size} fontStyle={T.weight>=600?'bold':'normal'}
                      fill={T.fill || '#ffffff'} opacity={T.opacity} />
                  </Group>
                )
              }
              if (l.type === 'shape'){
                return (
                  <Group key={l.id}>
                    {/* @ts-ignore */}
                    <ShapeRender layer={l as ShapeLayer} common={common} />
                  </Group>
                )
              }
              return null
            })}
            <ActiveTransformer stage={stageRef.current} />
          </Layer>

          <SelectionOverlay />
          <PrintMarks />
        </Stage>
      </div>
    </div>
  )
}

export default StageCanvas;
