import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Recipe = {
  id: string;
  name: string;
  imageUrl?: string;
  sourceUrl?: string;
  tags: string[];
  difficulty?: 'easy'|'moderate'|'advanced'|'pro';
  cuisine?: string;
  createdAt: string;
  updatedAt: string;
};

function uid(){ try{ return crypto.randomUUID(); }catch{ return Math.random().toString(36).slice(2);} }

interface RecipesStore {
  recipes: Recipe[];
  query: string;
  setQuery: (q:string)=> void;
  addRecipe: (r: Omit<Recipe,'id'|'createdAt'|'updatedAt'>) => string;
  importFromUrl: (url: string) => string;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  removeRecipe: (id: string) => void;
  bulkImport: (list: Recipe[]) => void;
}

const STORAGE_KEY = 'recipes:db:v1';

export const useRecipesStore = create<RecipesStore>()(devtools((set,get)=>({
  recipes: (()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw) as Recipe[] : []; }catch{ return []; } })(),
  query: '',
  setQuery: (q)=> set({ query: q }),
  addRecipe: (r)=>{ const id = uid(); const now = new Date().toISOString(); const rec: Recipe = { id, ...r, createdAt: now, updatedAt: now }; set(s=>({ recipes:[rec, ...s.recipes] })); persist(); return id; },
  importFromUrl: (url)=>{ const id = uid(); const now=new Date().toISOString(); const name = url.replace(/[#?].*$/,'').split('/').filter(Boolean).slice(-1)[0]?.replace(/[-_]/g,' ') || 'Imported Recipe'; const rec: Recipe={ id, name, sourceUrl:url, tags:[], createdAt:now, updatedAt:now }; set(s=>({ recipes:[rec, ...s.recipes] })); persist(); return id; },
  updateRecipe: (id, patch)=> set(s=>({ recipes: s.recipes.map(r=> r.id===id? { ...r, ...patch, updatedAt: new Date().toISOString() } : r) })),
  removeRecipe: (id)=> set(s=>({ recipes: s.recipes.filter(r=> r.id!==id) })),
  bulkImport: (list)=> set(s=>({ recipes: [...list, ...s.recipes] })),
})));

function persist(){ try{ const { recipes } = useRecipesStore.getState(); localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes)); }catch{} }

useRecipesStore.subscribe((state, prev)=>{ if(state.recipes!==prev.recipes) persist(); });

export default useRecipesStore;
