import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { OverlayScreen } from './OverlayScreen';

export function LoadingOverlay({ isActive }) {
  return (
    <OverlayScreen isActive={isActive}>
      <LoadingSpinner />
    </OverlayScreen>
  );
}
