
import { describe, it, expect } from 'vitest';
import { createFondantMaterial, getMaterial } from '../../packages/echoscope/src/panes/CakeDesigner/MaterialManager';

describe('MaterialManager', () => {
  it('creates fondant material with correct defaults', () => {
    const m = createFondantMaterial();
    expect(m.roughness).toBeCloseTo(0.85);
  });

  it('resolves material type', () => {
    const m = getMaterial('ganache');
    expect(m).toBeTruthy();
  });
});
