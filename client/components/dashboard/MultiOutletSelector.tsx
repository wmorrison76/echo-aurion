/**
 * MultiOutletSelector
 * Dropdown to select single or multiple outlets for P&L view
 * Only visible if user has access to multiple outlets
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { logger } from '../../lib/logger';

interface Outlet {
  id: string;
  name: string;
}

interface MultiOutletSelectorProps {
  selectedOutletIds: string[];
  onSelectionChange: (outletIds: string[]) => void;
  multiSelect?: boolean;
  loading?: boolean;
}

const MultiOutletSelector: React.FC<MultiOutletSelectorProps> = ({
  selectedOutletIds,
  onSelectionChange,
  multiSelect = false,
  loading = false,
}) => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [fetchingOutlets, setFetchingOutlets] = useState(true);

  useEffect(() => {
    fetchAvailableOutlets();
  }, []);

  const fetchAvailableOutlets = async () => {
    try {
      setFetchingOutlets(true);
      const response = await fetch('/api/dashboard/financial/available-outlets', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch outlets');
      }

      const data = await response.json();
      setOutlets(data.outlets || []);
    } catch (error) {
      logger.error('Failed to fetch outlets', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setFetchingOutlets(false);
    }
  };

  const handleOutletSelect = (outletId: string) => {
    if (multiSelect) {
      const newSelection = selectedOutletIds.includes(outletId)
        ? selectedOutletIds.filter((id) => id !== outletId)
        : [...selectedOutletIds, outletId];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([outletId]);
      setIsOpen(false);
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const selectedOutlets = outlets.filter((o) =>
    selectedOutletIds.includes(o.id)
  );

  if (fetchingOutlets) {
    return <div className="text-sm text-muted-foreground">Loading outlets...</div>;
  }

  // Don't show selector if only one outlet available
  if (outlets.length <= 1) {
    return null;
  }

  if (multiSelect) {
    // Multi-select with badges
    return (
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">
            Outlets ({selectedOutlets.length}/{outlets.length})
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedOutlets.length > 0 ? (
              selectedOutlets.map((outlet) => (
                <Badge
                  key={outlet.id}
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5"
                >
                  {outlet.name}
                  <button
                    onClick={() => handleOutletSelect(outlet.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground italic">
                No outlets selected
              </span>
            )}
          </div>
        </div>

        {/* Dropdown for adding more */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded border border-input bg-background hover:bg-accent text-sm"
          >
            <span>Add outlet...</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded shadow-lg z-10">
              <div className="max-h-48 overflow-y-auto">
                {outlets.map((outlet) => {
                  const isSelected = selectedOutletIds.includes(outlet.id);
                  return (
                    <button
                      key={outlet.id}
                      onClick={() => handleOutletSelect(outlet.id)}
                      className="w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2 text-sm"
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                      <span className={isSelected ? 'font-semibold' : ''}>
                        {outlet.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedOutlets.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="text-destructive hover:text-destructive"
          >
            Clear All
          </Button>
        )}
      </div>
    );
  }

  // Single-select dropdown
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-muted-foreground">
        Outlet / Property
      </label>
      <Select
        value={selectedOutletIds[0] || ''}
        onValueChange={(value) => onSelectionChange([value])}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an outlet..." />
        </SelectTrigger>
        <SelectContent>
          {outlets.map((outlet) => (
            <SelectItem key={outlet.id} value={outlet.id}>
              {outlet.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default MultiOutletSelector;
