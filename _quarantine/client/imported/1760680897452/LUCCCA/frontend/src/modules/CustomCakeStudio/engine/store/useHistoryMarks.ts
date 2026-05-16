import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Project } from '../types'
import { captureCheckpoint } from '../checkpoints/Checkpoints'
import { useStudioStore } from './useStudioStore'

export type HistoryMark = {
  id: string
  label: string
  ts: number
  state: string   // JSON Project
  thumb: string   // dataURL
}

interface MarkState {
  marks: HistoryMark[]
  addMark: (label?: string) => void
  renameMark: (id: string, label: string) => void
  deleteMark: (id: string) => void
  restoreMark: (id: string) => void
}

export const useHistoryMarks = create<MarkState>((set, get)=> ({
  marks: [],
  addMark: (label='Mark') => {
    const project: Project = useStudioStore.getState().project
    const { state, thumb } = captureCheckpoint(project, label)
    set(s => { s.marks.unshift({ id: nanoid(), label, ts: Date.now(), state, thumb }) })
  },
  renameMark: (id, label) => set(s => {
    const m = s.marks.find(m=>m.id===id); if (m) m.label = label
  }),
  deleteMark: (id) => set(s => { s.marks = s.marks.filter(m=>m.id!==id) }),
  restoreMark: (id) => {
    const m = get().marks.find(m=>m.id===id); if (!m) return
    try {
      const state = JSON.parse(m.state)
      useStudioStore.setState(s => { (s as any).project = state })
    } catch {}
  }
}))

export default useHistoryMarks;
