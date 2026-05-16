import { create } from 'zustand'
import { getJSON, setJSON } from '../utils/storage'
const key = 'lu:toolbar:pos:v1'
const snapEdge = (x, y, w=280, h=56, pad=16) => ({ x: Math.max(pad, Math.min(window.innerWidth - w - pad, x)), y: Math.max(pad, Math.min(window.innerHeight - h - pad, y)) })
export const useToolbar = create((set, get) => ({
  pos: getJSON(key, { x: window.innerWidth - 340, y: 24 }),
  setPos(x, y){ const p = snapEdge(x, y); set({ pos: p }); setJSON(key, p) },
  dockChips: [], setDock(chips){ set({ dockChips: chips }) }
}))

export default useToolbar;
