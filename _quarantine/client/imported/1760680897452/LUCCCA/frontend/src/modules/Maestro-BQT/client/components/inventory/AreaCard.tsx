import React from 'react';
import { Card, CardContent } from '../ui/card';
import type { StorageArea } from '../../stores/inventoryStore';

interface Props {
  area: StorageArea;
  value: number;
  active?: boolean;
  onClick?: () => void;
}

const AreaCard: React.FC<Props> = ({ area, value, active, onClick }) => {
  return (
    <Card className={"hover:shadow-md cursor-pointer " + (active ? 'ring-2 ring-primary' : '')} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{area.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{area.type.replace('_', ' ')}</div>
          </div>
          <div className="text-lg font-semibold">${value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AreaCard;
