import { create } from 'zustand'

interface TextEditState {
  editingId: string | null
  setEditing: (id: string | null) => void
}

export const useTextEditStore = create<TextEditState>((set)=> ({
  editingId: null,
  setEditing: (id) => set({ editingId: id })
}))

export default useTextEditStore;
