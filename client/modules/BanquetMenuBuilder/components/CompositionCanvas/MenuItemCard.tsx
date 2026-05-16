/**
 * MenuItemCard.tsx
 * ----------------------------------------------------------------------------
 * One composed item rendered in the canvas. Sortable via @dnd-kit/sortable.
 *
 * Visual hierarchy (top to bottom):
 *   - Item name + dietary chips
 *   - Description (1 line, truncated)
 *   - Price + network percentile badge
 *   - Action row (notes, override, remove) — visible on hover/focus
 * ----------------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useCompositionStore,
  type ComposedItem,
} from '../../hooks/useCompositionStore';
import { useNetworkPercentile } from '../../hooks/useNetworkPercentile';
import { computeItemPricing, formatCurrency } from '../../services/pricingEngine';
import { TAG_SHORT_LABELS } from '../../services/dietaryEngine';
import { NetworkPercentileBadge } from '../NetworkBadge/NetworkPercentileBadge';

interface MenuItemCardProps {
  item: ComposedItem;
  sectionId: string;
  /** True when rendered inside DragOverlay — disables interaction */
  isDragOverlay?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  sectionId,
  isDragOverlay = false,
}) => {
  const guestCount = useCompositionStore((s) => s.meta.guestCount);
  const currency = useCompositionStore((s) => s.meta.currency);
  const removeItem = useCompositionStore((s) => s.removeItem);

  const { byItemId } = useNetworkPercentile();
  const networkSignal = byItemId[item.itemId];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.instanceId,
    data: { kind: 'menu_item', instanceId: item.instanceId, sectionId },
    disabled: isDragOverlay,
  });

  const style: React.CSSProperties = isDragOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  const pricing = computeItemPricing(item, guestCount);
  const dietaryTags = item.itemSnapshot.dietaryTags ?? [];

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeItem(item.instanceId);
    },
    [removeItem, item.instanceId],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'bmb-item-card',
        isDragging ? 'bmb-item-card--dragging' : '',
        isDragOverlay ? 'bmb-item-card--overlay' : '',
        pricing.isOverride ? 'bmb-item-card--override' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle indicator (visual only — entire card is draggable) */}
      <div className="bmb-item-card__handle" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="bmb-item-card__body">
        <div className="bmb-item-card__row1">
          <h4 className="bmb-item-card__name">{item.itemSnapshot.name}</h4>
          {dietaryTags.length > 0 && (
            <ul className="bmb-item-card__tags" aria-label="Dietary tags">
              {dietaryTags.map((tag) => (
                <li key={tag} className="bmb-tag" data-tag={tag}>
                  {TAG_SHORT_LABELS[tag] ?? tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {item.itemSnapshot.description && (
          <p className="bmb-item-card__desc">{item.itemSnapshot.description}</p>
        )}

        <div className="bmb-item-card__row3">
          <span className="bmb-item-card__price">
            {formatCurrency(pricing.perGuestContribution, currency)}
            <span className="bmb-item-card__price-suffix">/guest</span>
            {pricing.isMarketPrice && (
              <span className="bmb-item-card__market-flag" title="Market price — verify before publish">
                MP
              </span>
            )}
            {pricing.isOverride && (
              <span className="bmb-item-card__override-flag" title="Price overridden for this menu">
                OR
              </span>
            )}
          </span>
          {networkSignal && networkSignal.isReliable && (
            <NetworkPercentileBadge
              percentile={networkSignal.pricePercentile}
              sampleSize={networkSignal.sampleSize}
            />
          )}
        </div>
      </div>

      {!isDragOverlay && (
        <button
          type="button"
          className="bmb-item-card__remove"
          onClick={handleRemove}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Remove ${item.itemSnapshot.name}`}
        >
          ×
        </button>
      )}
    </div>
  );
};
