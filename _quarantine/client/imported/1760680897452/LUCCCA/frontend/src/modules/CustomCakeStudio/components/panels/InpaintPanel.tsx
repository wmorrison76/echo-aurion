import React, { useState } from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { inpaintClient } from '../../engine/imagegen/inpaint/InpaintClient'
import { maskFromSelection } from '../../engine/selection/maskFromSelection'
import type { RasterLayer } from '../../engine/types'

export function InpaintPanel(){
  const s = useStudioStore()
  const [prompt, setPrompt] = useState('remove blemishes; clean background')
  const [neg, setNeg] = useState('blurry, low quality, extra limbs, artifacts')
  const [strength, setStrength] = useState(0.65)
  const [seed, setSeed] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const id = s.activeLayerId
  const L = s.project.layers.find(l=>l.id===id && l.type==='raster') as RasterLayer | undefined
  const hasSel = s.selection && s.selection[0]?.length>0

  const run = async () => {
    setLastError(null)
    if (!L){ setLastError('Select a raster layer.'); return }
    const W = s.project.canvas.width, H = s.project.canvas.height
    setBusy(true)
    try {
      let maskCanvas: HTMLCanvasElement | null = null
      if (hasSel){
        maskCanvas = await maskFromSelection(W, H, s.selection, s.selectionFeather||0, s.selectionExpand||0)
      } else if ((L as any).maskEnabled && (L as any).mask){
        // if a layer mask exists, use its white area as inpaint region
        const m = (L as any).mask as HTMLCanvasElement
        const c = document.createElement('canvas'); c.width=W; c.height=H
        const ctx = c.getContext('2d')!
        ctx.drawImage(m, 0, 0)
        maskCanvas = c
      } else {
        setLastError('Create a selection or enable a layer mask to define the inpaint area.')
        setBusy(false); return
      }

      // Render the current layer (including adjustments) to a canvas
      const c = document.createElement('canvas'); c.width=W; c.height=H
      const ctx = c.getContext('2d')!; ctx.clearRect(0,0,W,H)
      // naive render of just the active layer bitmap; for full compositing, call getRenderSurface
      const img = new Image()
      img.src = (L.src || '') as string
      await img.decode().catch(()=>{})
      if (img.naturalWidth>0) ctx.drawImage(img, L.transform.x, L.transform.y, img.naturalWidth*(L.transform.scale||1), img.naturalHeight*(L.transform.scale||1))

      const out = await inpaintClient.inpaint({ prompt, negativePrompt: neg, strength, seed: (seed===''? undefined : Number(seed)) }, { image: c, mask: maskCanvas! })

      // Replace active raster layer with the inpaint result (non-destructive alternative: add new layer)
      ;(L as any).src = out.toDataURL('image/png')
      s.historyMark('Inpaint')
    } catch (e:any){
      setLastError(e?.message || 'Inpaint failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">ImageGen — Inpaint (mask/selection)</div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Prompt</label>
        <textarea className="bg-gray-800 rounded px-2 py-1 col-span-2" rows={2} value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
        <label>Negative</label>
        <input className="bg-gray-800 rounded px-2 py-1 col-span-2" value={neg} onChange={(e)=>setNeg(e.target.value)} />
        <label>Strength</label>
        <input type="range" min={0} max={1} step={0.01} value={strength} onChange={(e)=>setStrength(Number(e.target.value))} />
        <span className="text-right">{Math.round(strength*100)}%</span>
        <label>Seed</label>
        <input className="bg-gray-800 rounded px-2 py-1" placeholder="random" value={seed} onChange={(e)=>setSeed(e.target.value as any)} />
        <span className="opacity-60 col-span-2">Leave blank for random seed</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button disabled={busy} className={"px-2 py-1 rounded " + (!busy ? "bg-emerald-800 hover:bg-emerald-700" : "bg-emerald-800/40")} onClick={run}>
          {busy? 'Inpainting…' : 'Inpaint Selection on Active Layer'}
        </button>
      </div>

      {lastError && <div className="text-red-400">{lastError}</div>}
      {!hasSel && <div className="opacity-60 text-[10px]">Tip: Use Selection tools or a Layer Mask to define the edit area.</div>}
    </div>
  )
}

export default InpaintPanel;
