/**
 * Inventory Tracking - Maestro Banquets
 */
import React, { useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Package, AlertTriangle, CheckCircle, Filter, Settings } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn } from '../lib/utils';
import ItemRow from '../components/inventory/ItemRow';
import AreaCard from '../components/inventory/AreaCard';
import StoreroomPullPanel from '../components/inventory/StoreroomPullPanel';
import InventoryActions from '../components/inventory/InventoryActions';
import { useFinishedProductStore } from '../stores/finishedProductStore';

const EstimatedVolumes: React.FC = () => {
  const vols = useInventoryStore(s=> s.volumeBreakdownByUnit());
  const entries = Object.entries(vols);
  if (entries.length === 0) return <div className="text-sm text-muted-foreground">No volume data available.</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {entries.map(([unit, qty]) => (
        <div key={unit} className="p-3 rounded border bg-background/50 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{unit}</div>
          <div className="text-sm font-medium">{qty.toLocaleString()} {unit}</div>
        </div>
      ))}
    </div>
  );
};

const FinishedPars: React.FC = () => {
  const suggestPars = useFinishedProductStore(s=> s.suggestPars);
  const setPar = useFinishedProductStore(s=> s.setPar);
  const getPar = useFinishedProductStore(s=> s.getPar);
  const suggestions = suggestPars(7);
  if (suggestions.length===0) return <div className="text-sm text-muted-foreground">No suggestions yet. Create requisitions or link recipes to see forecasted demand.</div>;
  return (
    <div className="space-y-2">
      {suggestions.map(sug => {
        const existing = getPar(sug.productName, sug.unit);
        return (
          <div key={sug.productName + '|' + sug.unit} className="p-2 rounded border bg-background/50 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{sug.productName} <span className="text-xs text-muted-foreground">({sug.unit})</span></div>
              <div className="text-xs text-muted-foreground">Suggested Par: {sug.suggestedPar} • Basis: {sug.basis}</div>
            </div>
            <div className="flex items-center gap-2">
              {existing && <span className="text-xs">Current Par: {existing.par}</span>}
              <Button size="sm" variant="outline" onClick={()=> setPar({ productName: sug.productName, unit: sug.unit, par: sug.suggestedPar, min: Math.max(1, Math.round(sug.suggestedPar*0.5)), max: Math.round(sug.suggestedPar*1.5) })}>Apply</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function Inventory() {
  const { areas, items, onHandQty, onHandValueTotal, onHandValueByArea, internalStoreroomConnected, toggleStoreroomConnection } = useInventoryStore();
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const totalValue = onHandValueTotal();

  const visibleItems = useMemo(() => items.filter(i =>
    (areaFilter === 'all' || i.storageAreaId === areaFilter) &&
    (categoryFilter === 'all' || i.category === categoryFilter as any)
  ), [items, areaFilter, categoryFilter]);

  const selectedArea = areas.find(a => a.id === areaFilter) || null;
  const areaItems = useMemo(() => items.filter(i => selectedArea ? i.storageAreaId === selectedArea.id : true), [items, selectedArea]);
  const lowCount = useMemo(() => areaItems.reduce((s, it) => {
    const q = onHandQty(it.id);
    const low = q <= (it.unit === 'bag' || it.unit === 'case' ? 5 : 10);
    return s + (low ? 1 : 0);
  }, 0), [areaItems, onHandQty]);

  return (
    <DashboardLayout title="Inventory Tracking" subtitle="Stock levels and purchasing signals">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Current Inventory Value</CardTitle></CardHeader>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-primary">${totalValue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Estimated on-hand value (based on EOM count ± transactions)</div>
              <div className="mt-2 text-xs">
                Storeroom: <span className={cn(internalStoreroomConnected ? 'text-green-600' : 'text-red-600')}>{internalStoreroomConnected ? 'Connected' : 'Disconnected'}</span>
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => toggleStoreroomConnection(!internalStoreroomConnected)}>
                  {internalStoreroomConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => (window.location.href = '/settings')}>
              <Settings className="h-4 w-4 mr-2" /> Manage Storage Areas
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b"><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="text-xs mb-1">Storage Area</div>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs mb-1">Category</div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="protein">Protein</SelectItem>
                  <SelectItem value="seafood">Seafood</SelectItem>
                  <SelectItem value="produce">Produce</SelectItem>
                  <SelectItem value="dairy">Dairy</SelectItem>
                  <SelectItem value="dry_goods">Dry Goods</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="disposable">Disposable</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <InventoryActions />
      </div>

      {/* Estimated Volumes */}
      <Card className="mb-4">
        <CardHeader className="border-b"><CardTitle>Estimated Volumes</CardTitle></CardHeader>
        <CardContent className="p-4">
          <EstimatedVolumes />
        </CardContent>
      </Card>

      {/* Finished Products Forecast & Pars */}
      <Card className="mb-4">
        <CardHeader className="border-b"><CardTitle>Finished Products Forecast & Pars</CardTitle></CardHeader>
        <CardContent className="p-4">
          <FinishedPars />
        </CardContent>
      </Card>

      {internalStoreroomConnected && (
        <div className="mb-4">
          <StoreroomPullPanel defaultDestAreaId={areaFilter !== 'all' ? areaFilter : undefined} />
        </div>
      )}

      {/* Areas Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {areas.map(a => (
          <AreaCard key={a.id} area={a} value={onHandValueByArea(a.id)} active={areaFilter === a.id} onClick={() => setAreaFilter(a.id)} />
        ))}
      </div>

      {selectedArea && (
        <Card className="mb-4">
          <CardHeader className="border-b"><CardTitle>Area Details • {selectedArea.name}</CardTitle></CardHeader>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Items</div>
              <div className="text-lg font-semibold">{areaItems.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Low Stock</div>
              <div className="text-lg font-semibold">{lowCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Value</div>
              <div className="text-lg font-semibold">${onHandValueByArea(selectedArea.id).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y">
            {visibleItems.map(it => (
              <ItemRow key={it.id} item={it} />
            ))}
            {visibleItems.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">No items match filters.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
