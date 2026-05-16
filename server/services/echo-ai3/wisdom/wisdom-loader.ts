/**
 * Wisdom Loader
 * Combines core and extended wisdom
 */

import { extendedWisdom } from './extended-wisdom';

export function loadAllWisdom(): any[] {
  return extendedWisdom;
}
