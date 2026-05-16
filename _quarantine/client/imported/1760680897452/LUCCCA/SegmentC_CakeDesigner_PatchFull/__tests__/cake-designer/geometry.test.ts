
import { describe, it, expect } from 'vitest';
import { cmToM, roundTo } from '../../packages/echoscope/src/panes/CakeDesigner/utils/geometry';

describe('geometry utils', () => {
  it('cmToM converts correctly', () => {
    expect(cmToM(100)).toBe(1);
  });
  it('roundTo rounds correctly', () => {
    expect(roundTo(Math.PI, 2)).toBe(3.14);
  });
});
