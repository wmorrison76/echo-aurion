import { create } from 'zustand'

export const useHelpStore = create<{ open:boolean; query:string; setOpen:(v:boolean)=>void; setQuery:(s:string)=>void }>(set => ({
  open: false,
  query: '',
  setOpen: (v)=>set({ open: v }),
  setQuery: (q)=>set({ query: q }),
}))

export default useHelpStore;
