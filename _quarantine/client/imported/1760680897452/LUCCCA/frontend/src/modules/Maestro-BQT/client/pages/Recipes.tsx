import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useRecipesStore } from '../stores/recipesStore';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Grid, List as ListIcon, Plus, Link as LinkIcon, ImageIcon, Search } from 'lucide-react';

export default function Recipes(){
  const { recipes, query, setQuery, importFromUrl, addRecipe, updateRecipe, removeRecipe } = useRecipesStore();
  const [view, setView] = React.useState<'grid'|'list'>('grid');
  const [url, setUrl] = React.useState('');

  const filtered = React.useMemo(()=>{
    const q = query.trim().toLowerCase();
    if(!q) return recipes;
    return recipes.filter(r=> [r.name, r.cuisine, ...(r.tags||[]), r.sourceUrl].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [recipes, query]);

  const addFromUrl = ()=>{ if(!url) return; importFromUrl(url); setUrl(''); };

  return (
    <DashboardLayout title="Recipes" subtitle="Professional recipe library — searchable, chef-grade">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e=> setQuery(e.target.value)} placeholder="Search recipes, tags, cuisines..." className="pl-9 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Input value={url} onChange={e=> setUrl(e.target.value)} placeholder="Paste recipe URL" className="w-80" />
            <Button onClick={addFromUrl}><LinkIcon className="h-4 w-4 mr-2"/>Add by URL</Button>
            <Button variant="outline" onClick={()=>{
              const name = prompt('Recipe name'); if(!name) return; const imageUrl = prompt('Image URL (optional)')||undefined; const cuisine = prompt('Cuisine (optional)')||undefined; const tagsStr = prompt('Tags (comma)')||''; const tags = tagsStr.split(',').map(s=>s.trim()).filter(Boolean);
              addRecipe({ name, imageUrl, cuisine, tags, difficulty: 'pro' });
            }}><Plus className="h-4 w-4 mr-2"/>New</Button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant={view==='grid'?'default':'ghost'} onClick={()=> setView('grid')}><Grid className="h-4 w-4"/></Button>
            <Button size="sm" variant={view==='list'?'default':'ghost'} onClick={()=> setView('list')}><ListIcon className="h-4 w-4"/></Button>
          </div>
        </div>

        {view==='grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(r=> (
              <Card key={r.id} className="overflow-hidden group">
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-muted-foreground flex items-center gap-2"><ImageIcon className="h-4 w-4"/>No image</div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="font-semibold truncate" title={r.name}>{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.cuisine || 'General'} • {(r.tags||[]).join(', ')}</div>
                  <div className="mt-2 flex items-center gap-2">
                    {r.sourceUrl && <a className="text-xs underline" href={r.sourceUrl} target="_blank" rel="noreferrer">Source</a>}
                    <button className="text-xs underline" onClick={()=>{
                      const name = prompt('Edit name', r.name)||r.name; const imageUrl = prompt('Edit image URL', r.imageUrl||'')||undefined; const cuisine = prompt('Cuisine', r.cuisine||'')||undefined; const tagsStr = prompt('Tags', (r.tags||[]).join(','))||''; const tags = tagsStr.split(',').map(s=>s.trim()).filter(Boolean);
                      useRecipesStore.getState().updateRecipe(r.id, { name, imageUrl, cuisine, tags });
                    }}>Edit</button>
                    <button className="text-xs underline text-red-600" onClick={()=> removeRecipe(r.id)}>Remove</button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length===0 && (
              <div className="col-span-full text-sm text-muted-foreground">No recipes match your search.</div>
            )}
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {filtered.map(r=> (
              <div key={r.id} className="p-3 flex items-center gap-3">
                <div className="w-16 h-10 bg-muted rounded overflow-hidden flex items-center justify-center">
                  {r.imageUrl ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover"/> : <ImageIcon className="h-4 w-4 text-muted-foreground"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.cuisine || 'General'} • {(r.tags||[]).join(', ')} {r.sourceUrl && <>• <a className="underline" href={r.sourceUrl} target="_blank" rel="noreferrer">Source</a></>}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={()=>{
                    const name = prompt('Edit name', r.name)||r.name; const imageUrl = prompt('Edit image URL', r.imageUrl||'')||undefined; const cuisine = prompt('Cuisine', r.cuisine||'')||undefined; const tagsStr = prompt('Tags', (r.tags||[]).join(','))||''; const tags = tagsStr.split(',').map(s=>s.trim()).filter(Boolean);
                    updateRecipe(r.id, { name, imageUrl, cuisine, tags });
                  }}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={()=> removeRecipe(r.id)}>Delete</Button>
                </div>
              </div>
            ))}
            {filtered.length===0 && (
              <div className="p-4 text-sm text-muted-foreground">No recipes match your search.</div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
