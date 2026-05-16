import React from 'react'
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { LayersPanel } from '../panels/LayersPanel'
import { PrintPanel } from '../panels/PrintPanel'
import { HistoryPanel } from '../panels/HistoryPanel'
import { ImageGenPanel } from '../panels/ImageGenPanel'
import { InpaintPanel } from '../panels/InpaintPanel'
import { AdjustmentsPanel } from '../panels/AdjustmentsPanel'
import { MaskPanel } from '../panels/MaskPanel'
import { SelectionRefinePanel } from '../panels/SelectionRefinePanel'
import { TransformPanel } from '../panels/TransformPanel'
import { CheckpointsPanel } from '../panels/CheckpointsPanel'
import { GridPanel } from '../panels/GridPanel'
import { ProjectPanel } from '../panels/ProjectPanel'
import { RetouchPanel } from '../panels/RetouchPanel'
import { TextPanel } from '../panels/TextPanel'
import { ShapePanel } from '../panels/ShapePanel'

export function RightPanels(){
  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold border-b border-gray-800">Panels</div>
      <div className="flex-1 overflow-auto space-y-4">
        <ProjectPanel/>
        <ImageGenPanel/>
        <InpaintPanel/>
        <RetouchPanel/>
        <TextPanel/>
        <ShapePanel/>
        <GridPanel/>
        <CheckpointsPanel/>
        <HistoryPanel/>
        <LayersPanel/>
        <SelectionRefinePanel/>
        <MaskPanel/>
        <AdjustmentsPanel/>
        <TransformPanel/>
        <PropertiesPanel/>
        <PrintPanel/>
      </div>
    </div>
  )
}

export default RightPanels;
