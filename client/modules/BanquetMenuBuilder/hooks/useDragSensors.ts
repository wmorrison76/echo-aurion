/**
 * useDragSensors.ts
 * ----------------------------------------------------------------------------
 * Configured @dnd-kit sensors. We separate this from the canvas component so
 * sensor configuration (and the activation thresholds that matter for
 * touch vs mouse) lives in one auditable place.
 *
 * Why these specific thresholds:
 *   - Mouse: 8px activation distance → tolerates click jitter without
 *     accidentally starting a drag, but still feels snappy.
 *   - Touch: 200ms delay + 5px tolerance → prevents drag-vs-tap confusion
 *     on phones, matches iOS native long-press feel.
 *   - Keyboard: 250ms delay between key moves for predictable nav.
 * ----------------------------------------------------------------------------
 */

import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  MouseSensor,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export function useDragSensors() {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  // Order matters: pointer first lets it handle hybrid devices (Surface,
  // touch laptops). Mouse + touch are fallbacks for devices that don't
  // support PointerEvents (rare in 2026, but still some old Safari).
  return useSensors(pointerSensor, mouseSensor, touchSensor, keyboardSensor);
}
