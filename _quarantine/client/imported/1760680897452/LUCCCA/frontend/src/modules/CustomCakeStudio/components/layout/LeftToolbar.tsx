import React from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'

type ToolDef = { id: any, label: string, hotkey: string, title: string, icon?: React.ReactNode }

const Icon = {
  cursor: (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 2l8 20 2-7 7-2z" fill="currentColor"/></svg>),
  brush:  (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M20 4l-5.5 5.5L14 12l2.5-.5L22 6zM4 20c3 0 4-2 4-4s-1-4-4-4c0 3-2 4-4 4 0 2 1 4 4 4z" fill="currentColor"/></svg>),
  eraser: (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M16 3l5 5-9 9H7L2 12l9-9h5zM7 17h15v2H7z" fill="currentColor"/></svg>),
  marquee:(<svg width="16" height="16" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" fill="none" strokeDasharray="2 2"/></svg>),
  lasso:  (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 12c0-5 8-10 14-7 4 2 3 7-2 9-4 1-8 0-12-2 0 4 5 7 9 7 2 0 4-1 6-2" stroke="currentColor" fill="none"/></svg>),
  wand:   (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 21l10-10M15 3l2 2M19 7l2 2M15 11l2 2M7 3l2 2" stroke="currentColor" fill="none"/></svg>),
  quick:  (<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" stroke="currentColor" fill="none" strokeDasharray="3 2"/></svg>),
  dropper:(<svg width="16" height="16" viewBox="0 0 24 24"><path d="M16 3l5 5-3 3-5-5 3-3zM4 20l7-7 5 5-7 7H4v-5z" fill="currentColor"/></svg>),
  text:   (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M5 5h14v3h-5v11h-4V8H5z" fill="currentColor"/></svg>),
  hand:   (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 11V6a2 2 0 1 1 4 0v3-2a2 2 0 1 1 4 0v3-1a2 2 0 1 1 4 0v5c0 4-3 7-7 7s-7-3-7-7v-3z" fill="currentColor"/></svg>),
  zoom:   (<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" stroke="currentColor" fill="none"/><path d="M20 20l-4-4" stroke="currentColor"/></svg>),
  bucket: (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 10l8-8 8 8-2 8H6l-2-8z" fill="currentColor"/></svg>),
  grad:   (<svg width="16" height="16" viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0%" stopColor="currentColor"/><stop offset="100%" stopColor="transparent"/></linearGradient></defs><rect x="3" y="5" width="18" height="14" fill="url(#g)"/></svg>),
  clone:  (<svg width="16" height="16" viewBox="0 0 24 24"><rect x="3" y="7" width="10" height="10" stroke="currentColor" fill="none"/><rect x="11" y="3" width="10" height="10" stroke="currentColor" fill="none"/></svg>),
  heal:   (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor"/><circle cx="12" cy="12" r="9" stroke="currentColor" fill="none"/></svg>),
  crop:   (<svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 3v10h10M3 7h10v10" stroke="currentColor"/></svg>),
}

const TOOLS: ToolDef[] = [
  { id: 'move', label:'Move', hotkey:'V', title:'Move (V)', icon: Icon.cursor },
  { id: 'brush', label:'Brush', hotkey:'B', title:'Brush (B)', icon: Icon.brush },
  { id: 'eraser', label:'Eraser', hotkey:'E', title:'Eraser (E)', icon: Icon.eraser },
  { id: 'maskbrush', label:'Mask', hotkey:'K', title:'Mask Brush (K)', icon: Icon.brush },
  { id: 'eyedropper', label:'Picker', hotkey:'I', title:'Eyedropper (I)', icon: Icon.dropper },
  { id: 'text', label:'Text', hotkey:'T', title:'Text (T)', icon: Icon.text },
  { id: 'marquee', label:'Marquee', hotkey:'M', title:'Marquee (M)', icon: Icon.marquee },
  { id: 'lasso', label:'Lasso', hotkey:'L', title:'Lasso (L)', icon: Icon.lasso },
  { id: 'wand', label:'Wand', hotkey:'W', title:'Magic Wand (W)', icon: Icon.wand },
  { id: 'quick', label:'Quick', hotkey:'A', title:'Quick Select (A)', icon: Icon.quick },
  { id: 'bucket', label:'Bucket', hotkey:'P', title:'Paint Bucket (P)', icon: Icon.bucket },
  { id: 'gradient', label:'Gradient', hotkey:'G', title:'Gradient (G)', icon: Icon.grad },
  { id: 'clone', label:'Clone', hotkey:'S', title:'Clone Stamp (S)', icon: Icon.clone },
  { id: 'spothealing', label:'Heal', hotkey:'J', title:'Spot Healing (J)', icon: Icon.heal },
  { id: 'crop', label:'Crop', hotkey:'C', title:'Crop (C)', icon: Icon.crop },
  { id: 'hand', label:'Hand', hotkey:'H', title:'Hand (H)', icon: Icon.hand },
  { id: 'zoom', label:'Zoom', hotkey:'Z', title:'Zoom (Z)', icon: Icon.zoom },
]

function Button({active, title, onClick, children}:{active?:boolean, title:string, onClick:()=>void, children:React.ReactNode}){
  return (
    <button title={title} onClick={onClick}
      className={"w-9 h-9 rounded-lg flex items-center justify-center " + (active ? "bg-emerald-900/70 ring-1 ring-emerald-600" : "bg-gray-800 hover:bg-gray-700")}>
      <span className="text-gray-200">{children}</span>
    </button>
  )
}

export function LeftToolbar(){
  const tool = useStudioStore(s=>s.activeTool)
  const setTool = useStudioStore(s=>s.setTool)
  const primary = useStudioStore(s=>s.primaryColor)
  const brushSize = useStudioStore(s=>s.brushSize)
  const maskBrushSize = useStudioStore(s=>s.maskBrushSize)

  const setColor: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value || '#ffffff'
    // Directly set in Zustand store to avoid adding new actions
    ;(useStudioStore as any).setState({ primaryColor: v })
  }

  return (
    <div className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-2 gap-2 select-none">
      {TOOLS.map(t => (
        <Button key={t.id} title={t.title} active={tool===t.id} onClick={()=>setTool(t.id)}>
          {t.icon || t.label[0]}
        </Button>
      ))}

      <div className="w-10 h-px bg-gray-800 my-1" />

      {/* Color + size quick controls */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        <input title="Primary Color" type="color" value={primary}
          onChange={setColor} className="w-9 h-9 rounded border-0 p-0 bg-transparent" />
        <div className="w-full text-[10px] text-center opacity-70">Brush</div>
        <input title="Brush Size" type="range" min={1} max={200} step={1} value={brushSize}
          onChange={(e)=> (useStudioStore as any).setState({ brushSize: Number(e.target.value)||1 })}
          className="w-10 rotate-[-90deg] origin-center mb-4" />
        <div className="w-full text-[10px] text-center opacity-70 -mt-2">Mask</div>
        <input title="Mask Brush Size" type="range" min={1} max={400} step={1} value={maskBrushSize}
          onChange={(e)=> (useStudioStore as any).setState({ maskBrushSize: Number(e.target.value)||1 })}
          className="w-10 rotate-[-90deg] origin-center" />
      </div>
    </div>
  )
}

export default LeftToolbar;
