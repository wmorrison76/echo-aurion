import { create } from 'zustand'
export const usePanels = create((set, get) => ({
  panels: [],
  zTop: 10,
  open(id, def){
    const { panels, zTop } = get()
    const exists = panels.find(p => p.id === id && !def?.allowDuplicate)
    if (exists) return set({ panels: panels.map(p => p.id===id? { ...p, minimized: false, z: zTop+1 }: p), zTop: zTop+1 })
    const p = { id, title: def?.title || id, x: def?.x??120, y: def?.y??120, w: def?.w??640, h: def?.h??420, z: zTop+1, minimized:false, props: def?.props||{}, icon: def?.icon||null }
    set({ panels: [...panels, p], zTop: zTop+1 })
  },
  close(id){ set({ panels: get().panels.filter(p => p.id !== id) }) },
  minimize(id, v=true){ set({ panels: get().panels.map(p => p.id===id? { ...p, minimized: v }: p) }) },
  focus(id){ const { zTop } = get(); set({ panels: get().panels.map(p => p.id===id? { ...p, z: zTop+1 }: p), zTop: zTop+1 }) },
  move(id, x, y){ set({ panels: get().panels.map(p => p.id===id? { ...p, x, y }: p) }) },
  resize(id, w, h){ set({ panels: get().panels.map(p => p.id===id? { ...p, w, h }: p) }) },
}))

export default usePanels;
