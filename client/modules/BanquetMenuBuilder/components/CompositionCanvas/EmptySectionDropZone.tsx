/**
 * EmptySectionDropZone.tsx
 * ----------------------------------------------------------------------------
 * The "drop something here" placeholder shown inside an empty section.
 * Not interactive itself — the parent MenuSection handles the drop. This
 * is purely visual + accessibility text.
 * ----------------------------------------------------------------------------
 */

import React from 'react';

interface EmptySectionDropZoneProps {
  sectionName: string;
}

export const EmptySectionDropZone: React.FC<EmptySectionDropZoneProps> = ({
  sectionName,
}) => (
  <div className="bmb-empty-drop" role="status" aria-live="polite">
    <div className="bmb-empty-drop__line" aria-hidden="true" />
    <p className="bmb-empty-drop__text">
      Drop items into <strong>{sectionName}</strong>
    </p>
    <div className="bmb-empty-drop__line" aria-hidden="true" />
  </div>
);
