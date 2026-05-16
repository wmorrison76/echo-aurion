import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useInventoryStore } from '../../stores/inventoryStore';
import type { InventoryItem } from '../../stores/inventoryStore';
import TxDialog from './TxDialog';

interface ItemRowProps {
  item: InventoryItem;
}

const ItemRow: React.FC<ItemRowProps> = ({ item }) => {
  const { onHandQty } = useInventoryStore();
  const qty = onHandQty(item.id);
  const low = qty <= (item.unit === 'bag' || item.unit === 'case' ? 5 : 10);

  return (
    <div className="p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-muted-foreground capitalize">{item.category.replace('_',' ')} • {qty} {item.unit} on hand</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold">${(qty * item.unitCost).toLocaleString()}</div>
        {low ? (
          <Badge variant="outline" className="text-orange-700 border-orange-200 bg-orange-50 flex items-center"><AlertTriangle className="h-3 w-3 mr-1" />Low</Badge>
        ) : (
          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 flex items-center"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>
        )}
        <TxDialog item={item} trigger={<Button size="sm" variant="outline">Record Transaction</Button>} />
      </div>
    </div>
  );
};

export default ItemRow;
